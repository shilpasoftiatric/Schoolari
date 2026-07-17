"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { callAI } from "@/lib/ai";

// Helper to get the correct user ID (student's ID if a parent is logged in)
async function getMasterIdAndAdmin(user: any) {
  const supabaseAdmin = await createAdminClient();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("account_type, linked_student_id")
    .eq("id", user.id)
    .single();

  const masterId = (profile?.account_type === 'parent' && profile?.linked_student_id) 
    ? profile.linked_student_id 
    : user.id;

  return { masterId, supabaseAdmin };
}

export async function getSavedColleges() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  
  const { masterId, supabaseAdmin } = await getMasterIdAndAdmin(user);

  const { data, error } = await supabaseAdmin
    .from("saved_colleges")
    .select("*")
    .eq("user_id", masterId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function addCollege(collegeName: string, deadline?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  
  const { masterId, supabaseAdmin } = await getMasterIdAndAdmin(user);

  const { data, error } = await supabaseAdmin
    .from("saved_colleges")
    .insert([{
      user_id: masterId,
      college_name: collegeName,
      deadline: deadline || null,
      status: "researching"
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/colleges");
  revalidatePath("/dashboard");
  return data;
}

export async function updateCollege(id: string, updates: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  
  const { masterId, supabaseAdmin } = await getMasterIdAndAdmin(user);

  const safeUpdates = {
    college_name: updates.college_name,
    deadline: updates.deadline,
    status: updates.status,
    notes: updates.notes,
    updated_at: new Date().toISOString()
  };

  // Clean undefined or empty values
  Object.keys(safeUpdates).forEach(key => {
    if (safeUpdates[key as keyof typeof safeUpdates] === undefined) {
      delete safeUpdates[key as keyof typeof safeUpdates];
    }
  });

  if (safeUpdates.deadline === "") {
    safeUpdates.deadline = null;
  }

  const { error } = await supabaseAdmin
    .from("saved_colleges")
    .update(safeUpdates)
    .eq("id", id)
    .eq("user_id", masterId);

  if (error) throw new Error(error.message);

  revalidatePath("/colleges");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteCollege(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  
  const { masterId, supabaseAdmin } = await getMasterIdAndAdmin(user);

  const { error } = await supabaseAdmin
    .from("saved_colleges")
    .delete()
    .eq("id", id)
    .eq("user_id", masterId);

  if (error) throw new Error(error.message);

  revalidatePath("/colleges");
  revalidatePath("/dashboard");
  return { success: true };
}

function generateProfileHash(profile: any) {
  const data = JSON.stringify({
    gpa: profile.unweighted_gpa,
    major: profile.intended_major,
    state: profile.state,
    college_type: profile.preferred_college_type,
    career_interest: profile.career_interest,
    goals: profile.schoolari_goals,
    grade_level: profile.grade_level
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function getCollegeRecommendations(forceRefresh = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { masterId, supabaseAdmin } = await getMasterIdAndAdmin(user);

  // Fetch profile and saved colleges
  const [profileRes, savedCollegesRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("id", masterId).single(),
    supabaseAdmin.from("saved_colleges").select("college_name").eq("user_id", masterId)
  ]);

  const profile = profileRes.data;
  const savedColleges = (savedCollegesRes.data || []).map(c => c.college_name);
  if (!profile) throw new Error("Profile not found");

  const currentHash = generateProfileHash(profile);
  const cache = profile.college_recommendations_cache;
  const now = new Date();

  // Return cache if valid
  if (!forceRefresh && cache && typeof cache === 'object') {
    const isExpired = cache.expires_at ? new Date(cache.expires_at) < now : true;
    if (cache.profile_hash === currentHash && !isExpired) {
      return cache.recommendations || [];
    }
  }

  // Generate new recommendations
  const systemPrompt = `You are an expert college admissions counselor. Provide exactly 3 to 5 personalized college recommendations based on the student's profile.
Respond ONLY with a valid JSON array of objects. Do not include any markdown formatting, backticks, or other text outside the JSON array.
Each object must have exactly these keys:
- "college_name": string
- "logo_url": string (Use clearbit logo format: "https://logo.clearbit.com/DOMAIN.edu" using their official website domain)
- "city_state": string
- "total_enrollment": number
- "offers_major": boolean
- "cost_of_attendance": string (e.g. "$40,000" or "Not Available")
- "description": string (2-3 sentences max)
- "official_website": string (must be absolute URL)
- "score": number (0-100 match score)
- "reason": string (1-2 sentences why this fits their profile)`;

  const userPrompt = `Student Profile:
- GPA: ${profile.unweighted_gpa || 'Not specified'}
- Intended Major(s): ${(profile.intended_major || []).join(', ') || 'Not specified'}
- State: ${profile.state || 'Not specified'}
- Preferred College Type: ${(profile.preferred_college_type || []).join(', ') || 'Not specified'}
- Career Interests: ${(profile.career_interest || []).join(', ') || 'Not specified'}
- Grade Level: ${profile.grade_level || 'Not specified'}
- Goals: ${(profile.schoolari_goals || []).join(', ') || 'Not specified'}

DO NOT recommend any of these colleges (already saved/applied): [${savedColleges.join(', ')}]`;

  let recommendations = [];
  try {
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude"
    });

    let jsonStr = aiResponse.trim();
    if (jsonStr.startsWith('\`\`\`json')) jsonStr = jsonStr.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    if (jsonStr.startsWith('\`\`\`')) jsonStr = jsonStr.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();

    recommendations = JSON.parse(jsonStr);

    recommendations = recommendations.map((r: any) => ({ ...r, status: 'NEW' }));
  } catch (error) {
    console.error("Failed to generate college recommendations:", error);
    if (cache && cache.recommendations) return cache.recommendations;
    return [];
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const newCache = {
    version: "1.0",
    generated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    profile_hash: currentHash,
    recommendations
  };

  await supabaseAdmin
    .from("profiles")
    .update({ college_recommendations_cache: newCache })
    .eq("id", masterId);

  revalidatePath("/colleges");
  return recommendations;
}

export async function updateRecommendationStatus(collegeName: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { masterId, supabaseAdmin } = await getMasterIdAndAdmin(user);

  const { data: profile } = await supabaseAdmin.from("profiles").select("college_recommendations_cache").eq("id", masterId).single();
  if (!profile || !profile.college_recommendations_cache) return { success: false };

  const cache = profile.college_recommendations_cache as any;
  if (!cache.recommendations) return { success: false };

  const updatedRecs = cache.recommendations.map((r: any) =>
    r.college_name === collegeName ? { ...r, status } : r
  );

  cache.recommendations = updatedRecs;

  await supabaseAdmin
    .from("profiles")
    .update({ college_recommendations_cache: cache })
    .eq("id", masterId);

  return { success: true };
}

export async function saveRecommendationToTracker(recommendationData: any, isApplied = false) {
  const status = isApplied ? "applied" : "researching";
  const newCollege = await addCollege(recommendationData.college_name);

  if (isApplied) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { masterId, supabaseAdmin } = await getMasterIdAndAdmin(user);
      await supabaseAdmin.from("saved_colleges")
        .update({ status: "applied" })
        .eq("user_id", masterId)
        .eq("college_name", recommendationData.college_name);
      newCollege.status = "applied";
    }
  }

  await updateRecommendationStatus(recommendationData.college_name, isApplied ? 'APPLIED' : 'SAVED');

  revalidatePath("/colleges");
  revalidatePath("/dashboard");
  return { success: true, college: newCollege };
}

export async function scheduleCollegeReminder(collegeName: string, dateStr: string, timeStr: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { masterId, supabaseAdmin } = await getMasterIdAndAdmin(user);

  const dueDate = new Date(`${dateStr}T${timeStr || '09:00'}`);

  const { error } = await supabaseAdmin
    .from("tasks")
    .insert([{
      user_id: masterId,
      title: `College Application Reminder: ${collegeName}`,
      description: `Don't forget to submit your application for ${collegeName}.`,
      status: 'pending',
      type: 'custom',
      due_date: dueDate.toISOString()
    }]);

  if (error) throw new Error(error.message);

  revalidatePath("/colleges");
  revalidatePath("/dashboard");
  return { success: true };
}
