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
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    
    let filteredJobs: any[] = [];
    
    if (appId && appKey) {
      const query = interests.length > 0 ? interests.join(" ") : "";
      const whatQuery = query ? `internship ${query}` : "internship";
      const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=15&what=${encodeURIComponent(whatQuery)}&where=${encodeURIComponent(state)}&content-type=application/json`;

      const res = await fetch(adzunaUrl, { method: "GET" });
      if (res.ok) {
        const json = await res.json();
        if (json.results && json.results.length > 0) {
          filteredJobs = json.results.map((item: any) => ({
            type: item.contract_type === "part_time" ? "Part-Time" : "Internship",
            title: item.title,
            company: item.company.display_name,
            location: item.location.display_name || "Remote",
            link: item.redirect_url
          }));
        }
      }
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

export async function getRawJobsAndInternships(searchQuery?: string) {
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

  const cacheKey = `${state}-${interests.join(",")}-${searchQuery || "default"}`;
  const now = Date.now();
  if (RAW_JOBS_CACHE[cacheKey] && now - RAW_JOBS_CACHE[cacheKey].timestamp < JOBS_CACHE_DURATION) {
    const cachedData = RAW_JOBS_CACHE[cacheKey].data;
    if (cachedData && cachedData.length > 0) {
      return cachedData;
    }
  }

  try {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    
    let filteredJobs: any[] = [];
    
    if (appId && appKey) {
      const query = searchQuery ? searchQuery : (interests.length > 0 ? interests.join(" ") : "");
      const whatQuery = query ? `${query}` : "part time internship entry level";
      
      // Stage 1 Filters: exclude jobs that clearly require degrees or experience
      const excludeQuery = "degree bachelors masters phd experience senior manager director lead";

      const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=30&what=${encodeURIComponent(whatQuery)}&what_exclude=${encodeURIComponent(excludeQuery)}&where=${encodeURIComponent(state)}&content-type=application/json`;

      const res = await fetch(adzunaUrl, { method: "GET" });
      if (res.ok) {
        const json = await res.json();
        if (json.results && json.results.length > 0) {
          filteredJobs = json.results.map((item: any) => ({
            job_id: `00000000-0000-0000-0000-${item.id.toString().padStart(12, '0')}`,
            job_title: item.title,
            employer_name: item.company.display_name,
            employer_logo: null,
            job_city: item.location.area && item.location.area.length > 0 ? item.location.area[item.location.area.length - 1] : "Remote",
            job_state: item.location.area && item.location.area.length > 1 ? item.location.area[1] : "",
            job_employment_type: item.contract_type === "part_time" ? "PARTTIME" : "INTERN",
            job_description: item.description || "No description provided.",
            job_apply_link: item.redirect_url
          }));
        }
      }
    }

    if (filteredJobs.length === 0) {
      // Fallback to mock data for testing UI if API returns 0 or fails
      filteredJobs = [
        {
          job_id: "mock_1",
          job_title: "Store Team Member (Cashier/Stocker)",
          employer_name: "Target",
          employer_logo: null,
          job_city: "Mountain View",
          job_state: "CA",
          job_employment_type: "PARTTIME",
          job_description: "Join Target as a Store Team Member! You will help guests, run the register, and stock shelves. No experience required. Perfect for high school students.",
          job_apply_link: "https://jobs.target.com"
        }
      ];
    }

    // Fetch custom internal jobs from DB
    const { data: customJobs } = await supabase
      .from("custom_jobs" as any)
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (customJobs && Array.isArray(customJobs) && customJobs.length > 0) {
      const formattedCustomJobs = customJobs.map((job: any) => ({
        job_id: job.id,
        job_title: job.title,
        employer_name: job.company,
        employer_logo: null,
        job_city: job.location,
        job_state: "",
        job_employment_type: job.employment_type === "Internship" ? "INTERN" : (job.employment_type === "Contract" ? "CONTRACTOR" : "FULLTIME"),
        job_description: job.description,
        job_apply_link: job.apply_url
      }));
      // Merge custom jobs at the top
      filteredJobs = [...formattedCustomJobs, ...filteredJobs];
    }

    RAW_JOBS_CACHE[cacheKey] = { data: filteredJobs, timestamp: now };
    return filteredJobs;
  } catch (error: any) {
    console.error("Adzuna Fetch Error:", error);
    return [];
  }
}

export async function clearJobsCache() {
  for (const key in JOBS_CACHE) delete JOBS_CACHE[key];
  for (const key in RAW_JOBS_CACHE) delete RAW_JOBS_CACHE[key];
}

export async function getCareerArticles() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("career_articles" as any)
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return data || [];
}
