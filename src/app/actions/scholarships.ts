"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import twilio from "twilio";
import { formatPhoneE164 } from "@/lib/phone";
import { addReminder } from "./reminders";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Existing: trackApplication (preserved unchanged)
// ─────────────────────────────────────────────────────────────────────────────
export async function trackApplication(scholarshipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("applications")
    .insert([{ user_id: user.id, scholarship_id: scholarshipId, status: "In Progress" }]);

  if (error && error.code !== "23505") {
    console.error("Error tracking application:", error);
    throw new Error("Failed to track scholarship application");
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Existing: searchScholarships (preserved unchanged)
// ─────────────────────────────────────────────────────────────────────────────
export async function searchScholarships(query: string = "") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("state, grade_level, fields_of_study, career_interests")
    .eq("id", user.id)
    .single();

  let dbQuery = supabase.from("scholarships").select("id, name, description, category, organization_name, eligible_states, eligible_majors, deadline, award_amount, grade_levels, featured, link").eq("is_active", true);

  if (query.trim()) {
    const q = `%${query.trim()}%`;
    dbQuery = dbQuery.or(`name.ilike.${q},description.ilike.${q},category.ilike.${q},organization_name.ilike.${q},eligible_states.ilike.${q}`);
  }

  dbQuery = dbQuery.limit(50);
  const { data: scholarships, error } = await dbQuery;
  if (error) throw new Error("Failed to search scholarships");
  if (!scholarships || scholarships.length === 0) return [];

  const rankedScholarships = scholarships.map(scholarship => {
    let score = 0;
    if (query && scholarship.name.toLowerCase().includes(query.toLowerCase())) score += 20;
    if (profile) {
      if (profile.state && (scholarship.eligible_states?.toLowerCase().includes(profile.state.toLowerCase()) || scholarship.eligible_states?.toLowerCase().includes('all'))) score += 15;
      if (profile.grade_level && scholarship.grade_levels) {
        if (Array.isArray(scholarship.grade_levels) && scholarship.grade_levels.some((g: string) => g.toLowerCase() === profile.grade_level.toLowerCase())) score += 10;
        else if (typeof scholarship.grade_levels === 'string' && (scholarship.grade_levels as string).toLowerCase().includes(profile.grade_level.toLowerCase())) score += 10;
      }
      if (profile.fields_of_study && profile.fields_of_study.length > 0 && scholarship.eligible_majors) {
        const matchesMajor = profile.fields_of_study.some((field: string) => scholarship.eligible_majors.toLowerCase().includes(field.toLowerCase()));
        if (matchesMajor) score += 10;
      }
    }
    if (scholarship.featured) score += 5;
    return { ...scholarship, _score: score };
  });

  rankedScholarships.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return aDeadline - bDeadline;
  });

  return rankedScholarships.slice(0, 12);
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Profile hash (same fields as college recommendations)
// ─────────────────────────────────────────────────────────────────────────────
function generateScholarshipProfileHash(profile: any): string {
  const data = JSON.stringify({
    gpa: profile.unweighted_gpa,
    major: profile.intended_major,
    state: profile.state,
    grade_level: profile.grade_level,
    career_interest: profile.career_interest,
    goals: profile.schoolari_goals,
  });
  return crypto.createHash("sha256").update(data).digest("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Deterministic scoring (no AI call — instant, profile-matched)
// ─────────────────────────────────────────────────────────────────────────────
function scoreScholarshipForProfile(scholarship: any, profile: any): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // Major match (+25)
  if (profile.intended_major && scholarship.eligible_majors) {
    const majors = scholarship.eligible_majors.toLowerCase();
    if (majors.includes("any major") || majors.includes(profile.intended_major.toLowerCase())) {
      score += 25;
      reasons.push(`your ${profile.intended_major} major`);
    }
  }

  // State match (+20)
  if (profile.state && scholarship.eligible_states) {
    const states = scholarship.eligible_states.toLowerCase();
    if (states.includes("all") || states.includes(profile.state.toLowerCase())) {
      score += 20;
      reasons.push(`${profile.state} state residency`);
    }
  }

  // Grade level match (+15)
  if (profile.grade_level && scholarship.grade_levels) {
    const levels = Array.isArray(scholarship.grade_levels)
      ? scholarship.grade_levels.map((g: string) => g.toLowerCase())
      : [String(scholarship.grade_levels).toLowerCase()];
    if (levels.some((l: string) => l.includes(profile.grade_level?.toLowerCase() || ""))) {
      score += 15;
      reasons.push(`your grade level`);
    }
  }

  // GPA meets minimum (+15)
  if (profile.unweighted_gpa && scholarship.min_gpa_required) {
    if (Number(profile.unweighted_gpa) >= Number(scholarship.min_gpa_required)) {
      score += 15;
      reasons.push(`your ${profile.unweighted_gpa} GPA`);
    }
  } else if (!scholarship.min_gpa_required) {
    // No GPA requirement — open to all
    score += 10;
  }

  // Deadline urgency boost (+10)
  if (scholarship.deadline) {
    const days = Math.ceil((new Date(scholarship.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days > 0 && days <= 30) score += 10;
  }

  // Career interest keyword match (+10)
  if (profile.career_interest && scholarship.description) {
    if (scholarship.description.toLowerCase().includes(profile.career_interest.toLowerCase())) {
      score += 10;
      reasons.push(`your ${profile.career_interest} career interest`);
    }
  }

  // Featured boost (+5)
  if (scholarship.featured) score += 5;

  const reason = reasons.length > 0
    ? `Matches based on ${reasons.join(", ")}.`
    : "Open scholarship — no specific eligibility restrictions.";

  return { score: Math.min(score, 100), reason };
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: getScholarshipRecommendations — cache-first, profile-hash invalidation
// ─────────────────────────────────────────────────────────────────────────────
export async function getScholarshipRecommendations(forceRefresh = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch profile, active scholarships, and user's existing applications in parallel
  const [profileRes, scholarshipsRes, appsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("scholarships").select("*").eq("is_active", true),
    supabase.from("applications").select("scholarship_id").eq("user_id", user.id)
  ]);

  const profile = profileRes.data;
  if (!profile) throw new Error("Profile not found");

  const allScholarships = scholarshipsRes.data || [];
  const appliedIds = new Set((appsRes.data || []).map((a: any) => a.scholarship_id));

  const currentHash = generateScholarshipProfileHash(profile);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache = (profile as any).scholarship_recommendations_cache;
  const now = new Date();

  // ── Cache hit: return immediately ──
  if (!forceRefresh && cache && typeof cache === "object") {
    const isExpired = cache.expires_at ? new Date(cache.expires_at) < now : true;
    if (cache.profile_hash === currentHash && !isExpired) {
      // Filter out already-applied scholarships from cached results
      const filtered = (cache.recommendations || []).filter((r: any) => !appliedIds.has(r.id));
      return filtered;
    }
  }

  // ── Cache miss: score all scholarships deterministically ──
  const scored = allScholarships
    .filter(s => !appliedIds.has(s.id)) // exclude already-applied
    .map(s => {
      const { score, reason } = scoreScholarshipForProfile(s, profile);
      return { ...s, match_score: score, why_match: reason };
    })
    .filter(s => s.match_score > 0) // only show relevant results
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 10);

  // If no scored results, return top 5 featured/newest regardless
  const recommendations = scored.length > 0
    ? scored
    : allScholarships
      .filter(s => !appliedIds.has(s.id))
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
      .slice(0, 5)
      .map(s => ({ ...s, match_score: 0, why_match: "Open scholarship — check if you qualify." }));

  // ── Persist cache ──
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("profiles")
    .update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scholarship_recommendations_cache: {
        version: "1.0",
        generated_at: now.toISOString(),
        expires_at: expiresAt,
        profile_hash: currentHash,
        recommendations
      }
    } as any)
    .eq("id", user.id);

  return recommendations;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: setScholarshipAction — three-state student workflow
// Maps to existing ScholarshipState transitions in state-engine.ts
// ─────────────────────────────────────────────────────────────────────────────
export async function setScholarshipAction(
  scholarshipId: string,
  action: "will_apply" | "applied" | "won",
  dueDate?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const STATUS_MAP = {
    will_apply: "Not Started",
    applied: "In Progress",
    won: "Won"
  } as const;

  const newStatus = STATUS_MAP[action];

  const { data: schData } = await supabase.from("scholarships").select("name, deadline").eq("id", scholarshipId).single();
  if (!schData) throw new Error("Scholarship not found");

  // Check if it exists in tracker
  const { data: existing } = await supabase
    .from("tracker_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("reference_id", scholarshipId)
    .eq("reference_type", "scholarship")
    .single();

  const finalDueDate = dueDate || schData?.deadline;

  let error;
  if (existing) {
    const res = await supabase
      .from("tracker_items")
      .update({ status: newStatus, due_date: finalDueDate, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    error = res.error;
  } else {
    const res = await supabase
      .from("tracker_items")
      .insert({
        user_id: user.id,
        reference_id: scholarshipId,
        reference_type: "scholarship",
        title: schData.name,
        status: newStatus,
        due_date: finalDueDate
      });
    error = res.error;
  }

  if (error) {
    console.error("setScholarshipAction error:", error);
    throw new Error(error.message);
  }

    // Create reminder if student commits
    if (action === "will_apply") {
      if (schData?.deadline) {
        await addReminder(
          user.id,
          schData.name,
          schData.deadline,
          "scholarship",
          scholarshipId
        );
      }
    }

  // Clear profile AI dashboard cache so dashboard reflects updated tracker items immediately
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabaseAdmin = await createAdminClient();
  await supabaseAdmin
    .from("profiles")
    .update({ ai_dashboard_data: null })
    .eq("id", user.id);

  // Invalidate dashboard and scholarships page
  revalidatePath("/scholarships");
  revalidatePath("/tracker");
  revalidatePath("/dashboard");

  return { success: true, status: newStatus };
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: sendScholarshipReminder — reuses existing Twilio infrastructure
// ─────────────────────────────────────────────────────────────────────────────
export async function sendScholarshipReminder(scholarshipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Fetch user phone and scholarship details in parallel
  const [profileRes, scholarshipRes] = await Promise.all([
    supabase.from("profiles").select("phone, first_name").eq("id", user.id).single(),
    supabase.from("scholarships").select("name, deadline").eq("id", scholarshipId).single()
  ]);

  const profile = profileRes.data;
  const scholarship = scholarshipRes.data;

  if (!profile?.phone) return { error: "No phone number on file." };
  if (!scholarship) return { error: "Scholarship not found." };

  const e164Phone = formatPhoneE164(profile.phone);
  if (!e164Phone) return { error: "Invalid phone number format." };

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhone) {
    console.warn("Twilio credentials not configured — skipping SMS.");
    return { success: true, smsSent: false };
  }

  try {
    const deadlineStr = scholarship.deadline
      ? new Date(scholarship.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "the upcoming deadline";

    const message = `Hi ${profile.student_first_name || "there"}! Reminder: Apply to "${scholarship.name}" by ${deadlineStr}. Track your progress at members.schoolari.app/scholarships. Good luck! 🎓\n\nReply STOP to unsubscribe.`;

    const client = twilio(accountSid, authToken);
    await client.messages.create({ body: message, from: twilioPhone, to: e164Phone });

    return { success: true, smsSent: true };
  } catch (err: any) {
    console.error("[sendScholarshipReminder] Twilio error:", err.message);
    // Non-fatal: action was already saved to DB
    return { success: true, smsSent: false };
  }
}

