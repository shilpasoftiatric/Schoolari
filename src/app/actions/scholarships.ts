"use server";

import { createClient } from "@/lib/supabase/server";

export async function trackApplication(scholarshipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Attempt to insert the application tracking record
  // If the record already exists (user_id + scholarship_id constraint), it will just error silently or we can ignore it
  const { error } = await supabase
    .from("applications")
    .insert([
      {
        user_id: user.id,
        scholarship_id: scholarshipId,
        status: "In Progress",
      }
    ]);

  // If the error is a unique constraint violation, it means the user already tracked it.
  // We can safely ignore that specific error code (23505 in postgres).
  if (error && error.code !== "23505") {
    console.error("Error tracking application:", error);
    throw new Error("Failed to track scholarship application");
  }

  return { success: true };
}

export async function searchScholarships(query: string = "") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Fetch user profile for smart ranking
  const { data: profile } = await supabase
    .from("profiles")
    .select("state, grade_level, fields_of_study, career_interests")
    .eq("id", user.id)
    .single();

  let dbQuery = supabase
    .from("scholarships")
    .select("*")
    .eq("is_active", true);

  if (query.trim()) {
    const q = `%${query.trim()}%`;
    dbQuery = dbQuery.or(`name.ilike.${q},description.ilike.${q},category.ilike.${q},organization_name.ilike.${q},eligible_states.ilike.${q}`);
  }

  // Limit DB results to max 50 so we can rank them in memory quickly
  dbQuery = dbQuery.limit(50);

  const { data: scholarships, error } = await dbQuery;

  if (error) {
    console.error("Error searching scholarships:", error);
    throw new Error("Failed to search scholarships");
  }

  if (!scholarships || scholarships.length === 0) return [];

  // Smart Ranking Logic
  // Give points for profile matches
  const rankedScholarships = scholarships.map(scholarship => {
    let score = 0;
    
    // Exact match or partial match on search query title
    if (query && scholarship.name.toLowerCase().includes(query.toLowerCase())) {
      score += 20;
    }

    if (profile) {
      // State Match
      if (
        profile.state && 
        (scholarship.eligible_states?.toLowerCase().includes(profile.state.toLowerCase()) || 
         scholarship.eligible_states?.toLowerCase().includes('all'))
      ) {
        score += 15;
      }
      
      // Grade Level Match
      if (profile.grade_level && scholarship.grade_levels) {
        if (Array.isArray(scholarship.grade_levels) && scholarship.grade_levels.some((g: string) => g.toLowerCase() === profile.grade_level.toLowerCase())) {
          score += 10;
        } else if (typeof scholarship.grade_levels === 'string' && (scholarship.grade_levels as string).toLowerCase().includes(profile.grade_level.toLowerCase())) {
          score += 10;
        }
      }

      // Major / Field of Study Match
      if (profile.fields_of_study && profile.fields_of_study.length > 0 && scholarship.eligible_majors) {
        const matchesMajor = profile.fields_of_study.some((field: string) => 
          scholarship.eligible_majors.toLowerCase().includes(field.toLowerCase())
        );
        if (matchesMajor) score += 10;
      }
    }

    // Boost featured
    if (scholarship.featured) score += 5;

    return { ...scholarship, _score: score };
  });

  // Sort by highest score first, then by deadline
  rankedScholarships.sort((a, b) => {
    if (b._score !== a._score) {
      return b._score - a._score;
    }
    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return aDeadline - bDeadline;
  });

  // Return the top 12 for the modal
  return rankedScholarships.slice(0, 12);
}
