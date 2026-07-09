"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getResume() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    // Ignore not found, throw on other errors
    throw new Error(error.message);
  }

  // Handle on-the-fly migration for old single-format resumes
  if (data && data.content) {
    const content = data.content;
    if (!content.personal && !content.academic) {
      data.content = {
        personal: {
          education: content.education || [],
          experience: content.experience || [],
          skills: content.skills || []
        },
        academic: {
          education: content.education || [],
          extracurriculars: [],
          awards: [],
          skills: content.skills || []
        }
      };
    }
  }

  return data;
}

export async function saveResume(content: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check if resume exists
  const existing = await supabase
    .from("resumes")
    .select("id")
    .eq("user_id", user.id)
    .single();

  let result;
  if (existing.data) {
    result = await supabase
      .from("resumes")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", existing.data.id);
  } else {
    result = await supabase
      .from("resumes")
      .insert([{ user_id: user.id, content }]);
  }

  if (result.error) throw new Error(result.error.message);

  revalidatePath("/career");
  return { success: true };
}

export async function updateCareerInterests(interests: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("profiles")
    .update({ career_interests: interests })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/career");
  return { success: true };
}

// In-memory cache for job search results
const JOBS_CACHE: Record<string, { data: any[]; timestamp: number }> = {};
const JOBS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache duration (30 mins)

export async function getJobsAndInternships() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("state, career_interests")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  const state = profile.state || "California";
  const interests = profile.career_interests || [];

  const cacheKey = `${state}-${interests.join(",")}`;
  const now = Date.now();
  if (JOBS_CACHE[cacheKey] && now - JOBS_CACHE[cacheKey].timestamp < JOBS_CACHE_DURATION) {
    return JOBS_CACHE[cacheKey].data;
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || "jsearch.p.rapidapi.com";

  if (!apiKey) {
    console.warn("RAPIDAPI_KEY is missing from environment variables.");
    return [];
  }

  // Use the first interest as keyword if any, otherwise search generally
  const keyword = interests.length > 0 ? interests[0] : "Student";
  const query = `${keyword} internship entry-level in ${state}`;
  const url = `https://${apiHost}/search?query=${encodeURIComponent(query)}&num_pages=1`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": apiHost
      }
    });

    if (!res.ok) {
      console.error(`JSearch API returned error status: ${res.status}`);
      return [];
    }

    const json = await res.json();
    const items = json.data || [];

    // Filter rules on job results
    const filteredJobs = items.filter((item: any) => {
      const titleLower = (item.job_title || "").toLowerCase();
      const descLower = (item.job_description || "").toLowerCase();

      // 1. Exclude senior/lead roles
      const isSenior = titleLower.includes("senior") || titleLower.includes("lead") || titleLower.includes("manager") || titleLower.includes("director") || titleLower.includes("principal");
      if (isSenior) return false;

      // 2. Exclude roles requiring experience
      const expObj = item.job_required_experience || {};
      const requiresMonths = expObj.required_experience_in_months || 0;
      if (requiresMonths > 0) return false;

      // 3. Only keep internships or entry-level positions
      const isInternship = titleLower.includes("intern") || descLower.includes("internship") || titleLower.includes("co-op");
      const isEntry = titleLower.includes("entry") || titleLower.includes("junior") || titleLower.includes("associate") || titleLower.includes("assistant") || descLower.includes("entry-level");

      return isInternship || isEntry;
    });

    const result = filteredJobs.slice(0, 6).map((item: any) => {
      const isInternship = (item.job_title || "").toLowerCase().includes("intern") || (item.job_description || "").toLowerCase().includes("internship");
      
      return {
        type: isInternship ? "Internship" : "Entry-Level",
        title: item.job_title || "Student Position",
        company: item.employer_name || "Employer",
        location: `${item.job_city || ""}${item.job_city && item.job_state ? ", " : ""}${item.job_state || ""}` || "Remote",
        link: item.job_apply_link || "#"
      };
    });

    JOBS_CACHE[cacheKey] = { data: result, timestamp: now };
    return result;
  } catch (error: any) {
    console.error("JSearch Fetch Error:", error);
    return [];
  }
}
