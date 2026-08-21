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
    .select("state, career_interests, career_interest, intended_major, fields_of_study")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  const state = profile.state || "";
  const rawInterests = [
    ...(Array.isArray(profile.career_interest) ? profile.career_interest : (profile.career_interest ? [profile.career_interest] : [])),
    ...(Array.isArray(profile.career_interests) ? profile.career_interests : (profile.career_interests ? [profile.career_interests] : [])),
    ...(Array.isArray(profile.intended_major) ? profile.intended_major : (profile.intended_major ? [profile.intended_major] : [])),
    ...(Array.isArray(profile.fields_of_study) ? profile.fields_of_study : (profile.fields_of_study ? [profile.fields_of_study] : [])),
  ].filter(Boolean) as string[];
  const interests = Array.from(new Set(rawInterests));

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
      const query = interests.length > 0 ? interests[0] : "";
      const whatQuery = query ? `${query} internship` : "internship";
      let adzunaUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=15&what=${encodeURIComponent(whatQuery)}&content-type=application/json`;
      if (state) {
        adzunaUrl += `&where=${encodeURIComponent(state)}`;
      }

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

    const result = filteredJobs.slice(0, 6);

    JOBS_CACHE[cacheKey] = { data: result, timestamp: now };
    return result;

  } catch (error: any) {
    console.error("Jobs Fetch Error:", error);
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
    .select("state, career_interests, career_interest, intended_major, fields_of_study")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  const state = profile.state || "";
  const rawInterests = [
    ...(Array.isArray(profile.career_interest) ? profile.career_interest : (profile.career_interest ? [profile.career_interest] : [])),
    ...(Array.isArray(profile.career_interests) ? profile.career_interests : (profile.career_interests ? [profile.career_interests] : [])),
    ...(Array.isArray(profile.intended_major) ? profile.intended_major : (profile.intended_major ? [profile.intended_major] : [])),
    ...(Array.isArray(profile.fields_of_study) ? profile.fields_of_study : (profile.fields_of_study ? [profile.fields_of_study] : [])),
  ].filter(Boolean) as string[];
  const interests = Array.from(new Set(rawInterests));

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
    const seenIds = new Set<string>();
    
    if (appId && appKey) {
      // Build targeted search queries based on student profile
      let searchQueries: string[] = [];
      if (searchQuery) {
        searchQueries = [searchQuery, `${searchQuery} internship`];
      } else if (interests.length > 0) {
        searchQueries = [
          `${interests[0]} internship`,
          interests[1] ? `${interests[1]} internship` : `${interests[0]} student intern`,
          interests[2] ? `${interests[2]} entry level` : "internship entry level",
        ];
      } else {
        searchQueries = ["student internship", "entry level part time", "internship"];
      }

      for (const queryTerm of searchQueries) {
        try {
          const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=15&what=${encodeURIComponent(queryTerm)}&content-type=application/json`;
          const res = await fetch(adzunaUrl, { method: "GET" });
          if (res.ok) {
            const json = await res.json();
            if (json.results && Array.isArray(json.results)) {
              for (const item of json.results) {
                const idStr = item.id.toString();
                if (!seenIds.has(idStr)) {
                  seenIds.add(idStr);
                  
                  const titleLower = (item.title || "").toLowerCase();
                  const descLower = (item.description || "").toLowerCase();
                  const locLower = (item.location?.display_name || "").toLowerCase();

                  const isRemote = 
                    titleLower.includes("remote") || 
                    titleLower.includes("virtual") || 
                    titleLower.includes("work from home") ||
                    descLower.includes("remote") || 
                    descLower.includes("virtual") || 
                    locLower.includes("remote");

                  const isHybrid = 
                    titleLower.includes("hybrid") || 
                    descLower.includes("hybrid");

                  const workplaceType = isRemote ? "Remote" : (isHybrid ? "Hybrid" : "On-Site");

                  const isIntern = 
                    titleLower.includes("intern") || 
                    descLower.includes("intern") ||
                    titleLower.includes("co-op") ||
                    item.contract_type === "internship" ||
                    item.contract_time === "internship";

                  const isPartTime = 
                    item.contract_type === "part_time" || 
                    item.contract_time === "part_time" || 
                    titleLower.includes("part time") || 
                    titleLower.includes("part-time");

                  const isCoOp = titleLower.includes("co-op") || titleLower.includes("coop");

                  const employmentType = isCoOp ? "Co-Op" : (isIntern ? "Internship" : (isPartTime ? "Part-Time" : "Full-Time"));

                  filteredJobs.push({
                    job_id: `00000000-0000-0000-0000-${idStr.padStart(12, '0')}`,
                    job_title: item.title,
                    employer_name: item.company?.display_name || "Company",
                    employer_logo: null,
                    job_city: isRemote ? "Remote / Virtual" : (item.location?.area && item.location.area.length > 0 ? item.location.area[item.location.area.length - 1] : "On-Site"),
                    job_state: item.location?.area && item.location.area.length > 1 ? item.location.area[1] : "",
                    job_employment_type: employmentType,
                    workplace_type: workplaceType,
                    job_description: item.description || "No description provided.",
                    job_apply_link: item.redirect_url,
                    is_custom: false
                  });
                }
              }
            }
          }
        } catch (termErr) {
          console.error("Adzuna term fetch error:", termErr);
        }
      }

      // If specific queries returned 0 jobs, run a general fallback search so student always gets opportunities
      if (filteredJobs.length === 0 && !searchQuery) {
        try {
          const fallbackUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=15&what=internship&content-type=application/json`;
          const res = await fetch(fallbackUrl, { method: "GET" });
          if (res.ok) {
            const json = await res.json();
            if (json.results && Array.isArray(json.results)) {
              for (const item of json.results) {
                const idStr = item.id.toString();
                if (!seenIds.has(idStr)) {
                  seenIds.add(idStr);
                  const titleLower = (item.title || "").toLowerCase();
                  const descLower = (item.description || "").toLowerCase();
                  const locLower = (item.location?.display_name || "").toLowerCase();
                  const isRemote = titleLower.includes("remote") || titleLower.includes("virtual") || titleLower.includes("work from home") || descLower.includes("remote") || descLower.includes("virtual") || locLower.includes("remote");
                  const isHybrid = titleLower.includes("hybrid") || descLower.includes("hybrid");
                  const workplaceType = isRemote ? "Remote" : (isHybrid ? "Hybrid" : "On-Site");
                  const isIntern = titleLower.includes("intern") || descLower.includes("intern") || titleLower.includes("co-op") || item.contract_type === "internship" || item.contract_time === "internship";
                  const isPartTime = item.contract_type === "part_time" || item.contract_time === "part_time" || titleLower.includes("part time") || titleLower.includes("part-time");
                  const isCoOp = titleLower.includes("co-op") || titleLower.includes("coop");
                  const employmentType = isCoOp ? "Co-Op" : (isIntern ? "Internship" : (isPartTime ? "Part-Time" : "Full-Time"));

                  filteredJobs.push({
                    job_id: `00000000-0000-0000-0000-${idStr.padStart(12, '0')}`,
                    job_title: item.title,
                    employer_name: item.company?.display_name || "Company",
                    employer_logo: null,
                    job_city: isRemote ? "Remote / Virtual" : (item.location?.area && item.location.area.length > 0 ? item.location.area[item.location.area.length - 1] : "On-Site"),
                    job_state: item.location?.area && item.location.area.length > 1 ? item.location.area[1] : "",
                    job_employment_type: employmentType,
                    workplace_type: workplaceType,
                    job_description: item.description || "No description provided.",
                    job_apply_link: item.redirect_url,
                    is_custom: false
                  });
                }
              }
            }
          }
        } catch (fbErr) {
          console.error("Adzuna fallback fetch error:", fbErr);
        }
      }
    }

    // Fetch custom internal jobs from DB using admin client to ensure reliable access
    const { createAdminClient } = await import("@/lib/supabase/server");
    const adminClient = await createAdminClient();
    const { data: customJobs } = await adminClient
      .from("custom_jobs" as any)
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (customJobs && Array.isArray(customJobs) && customJobs.length > 0) {
      let filteredCustomJobsList = customJobs;
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filteredCustomJobsList = customJobs.filter((job: any) =>
          (job.title && job.title.toLowerCase().includes(q)) ||
          (job.company && job.company.toLowerCase().includes(q)) ||
          (job.location && job.location.toLowerCase().includes(q)) ||
          (job.description && job.description.toLowerCase().includes(q)) ||
          (job.employment_type && job.employment_type.toLowerCase().includes(q))
        );
      }

      const formattedCustomJobs = filteredCustomJobsList.map((job: any) => {
        const isRemote = job.location?.toLowerCase().includes("remote") || job.title?.toLowerCase().includes("remote");
        const isHybrid = job.location?.toLowerCase().includes("hybrid") || job.title?.toLowerCase().includes("hybrid");
        const workplace = isRemote ? "Remote" : (isHybrid ? "Hybrid" : "On-Site");
        return {
          job_id: job.id,
          job_title: job.title,
          employer_name: job.company,
          employer_logo: null,
          job_city: job.location || (isRemote ? "Remote / Virtual" : "On-Site"),
          job_state: "",
          job_employment_type: job.employment_type || "Internship",
          workplace_type: workplace,
          job_description: job.description,
          job_apply_link: job.apply_url,
          is_custom: true
        };
      });
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
  const { createAdminClient } = await import("@/lib/supabase/server");
  const adminClient = await createAdminClient();

  const { data } = await adminClient
    .from("career_articles" as any)
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return data || [];
}
