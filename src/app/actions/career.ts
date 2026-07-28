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
    const cachedData = JOBS_CACHE[cacheKey].data;
    if (cachedData && cachedData.length > 0) {
      return cachedData;
    }
  }

  try {
    // Fetch only Entry Level and Internship roles from TheMuse
    const apiUrl = process.env.THE_MUSE_API_URL || "https://www.themuse.com/api/public/jobs";
    const res = await fetch(`${apiUrl}?page=1&level=Entry%20Level&level=Internship`, {
      method: "GET"
    });

    if (!res.ok) return [];

    const json = await res.json();
    let filteredJobs = [];

    if (json.results && json.results.length > 0) {
      filteredJobs = json.results.map((item: any) => ({
        type: item.type === "external" ? "Full-Time" : "Internship",
        title: item.name,
        company: item.company.name,
        location: item.locations.length > 0 ? item.locations[0].name : "Remote",
        link: item.refs.landing_page
      }));
    }

    if (filteredJobs.length === 0) {
      filteredJobs = [
        {
          type: "Internship",
          title: "Software Engineering Intern",
          company: "Google",
          location: "Mountain View, CA",
          link: "https://careers.google.com"
        }
      ];
    }

    const result = filteredJobs.slice(0, 6);

    JOBS_CACHE[cacheKey] = { data: result, timestamp: now };
    return result;

  } catch (error: any) {
    console.error("TheMuse Fetch Error:", error);
    return [];
  }
}

// In-memory cache for raw jobs
const RAW_JOBS_CACHE: Record<string, { data: any[]; timestamp: number }> = {};

export async function getRawJobsAndInternships() {
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
  if (RAW_JOBS_CACHE[cacheKey] && now - RAW_JOBS_CACHE[cacheKey].timestamp < JOBS_CACHE_DURATION) {
    const cachedData = RAW_JOBS_CACHE[cacheKey].data;
    if (cachedData && cachedData.length > 0) {
      return cachedData;
    }
  }

  try {
    // JSearch RapidAPI is returning 404 permanently, switching to TheMuse public API
    const apiUrl = process.env.THE_MUSE_API_URL || "https://www.themuse.com/api/public/jobs";
    const res = await fetch(`${apiUrl}?page=1&level=Entry%20Level&level=Internship`, {
      method: "GET"
    });

    if (!res.ok) return [];

    const json = await res.json();
    let filteredJobs = [];

    if (json.results && json.results.length > 0) {
      filteredJobs = json.results.map((item: any) => ({
        job_id: `00000000-0000-0000-0000-${item.id.toString().padStart(12, '0')}`,
        job_title: item.name,
        employer_name: item.company.name,
        employer_logo: null,
        job_city: item.locations.length > 0 ? item.locations[0].name : "Remote",
        job_state: "",
        job_employment_type: item.type === "external" ? "FULLTIME" : "INTERN",
        job_description: item.contents
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<\/div>/gi, '\n')
          .replace(/<li>/gi, '• ')
          .replace(/<\/li>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n\s*\n/g, '\n\n') // Collapse multiple empty lines
          .trim(),
        job_apply_link: item.refs.landing_page
      }));
    }

    if (filteredJobs.length === 0) {
      // Fallback to mock data for testing UI if API returns 0 or fails
      filteredJobs = [
        {
          job_id: "mock_1",
          job_title: "Software Engineering Intern",
          employer_name: "Google",
          employer_logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
          job_city: "Mountain View",
          job_state: "CA",
          job_employment_type: "INTERN",
          job_description: "Join Google as a Software Engineering Intern! You will work on core products, write production-level code, and participate in design discussions. Requirements: Currently pursuing a BS/MS in Computer Science. Strong in algorithms and data structures. Familiar with Java, C++, or Python.",
          job_apply_link: "https://careers.google.com"
        }
      ];
    }

    RAW_JOBS_CACHE[cacheKey] = { data: filteredJobs, timestamp: now };
    return filteredJobs;
  } catch (error: any) {
    console.error("TheMuse Fetch Error:", error);
    return [];
  }
}
