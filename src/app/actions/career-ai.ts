"use server";

import { createClient } from "@/lib/supabase/server";
import { getStudentDashboardData } from "@/services/data-fetcher";
import { getRawJobsAndInternships, getResume } from "./career";
import { callAI } from "@/lib/ai";
import { revalidatePath } from "next/cache";
import twilio from "twilio";
import { formatPhoneE164 } from "@/lib/phone";
import { requireFeatureAccess } from "@/lib/subscription-server";

export async function getPersonalizedJobsAction(searchQuery?: string) {
  const { getUserPlan } = await import("@/lib/subscription-server");
  const { canAccessFeature } = await import("@/lib/subscription");
  const plan = await getUserPlan();
  if (!canAccessFeature(plan, "jobs")) {
    return []; // Return empty instead of throwing to avoid terminal spam on background prefetch
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Fetch the student profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("intended_major, career_interests, career_interest, fields_of_study, grade_level, state, extracurricular_activities")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  const rawInterests = [
    ...(Array.isArray(profile.career_interest) ? profile.career_interest : (profile.career_interest ? [profile.career_interest] : [])),
    ...(Array.isArray(profile.career_interests) ? profile.career_interests : (profile.career_interests ? [profile.career_interests] : [])),
    ...(Array.isArray(profile.intended_major) ? profile.intended_major : (profile.intended_major ? [profile.intended_major] : [])),
    ...(Array.isArray(profile.fields_of_study) ? profile.fields_of_study : (profile.fields_of_study ? [profile.fields_of_study] : [])),
  ].filter(Boolean) as string[];
  const interests = Array.from(new Set(rawInterests));

  // Stage 1: Get raw jobs from Adzuna & internal DB
  const rawJobs = await getRawJobsAndInternships(searchQuery);

  if (!rawJobs || rawJobs.length === 0) return [];

  // If user performed an explicit search query, return matched jobs directly without AI profile filtering
  if (searchQuery && searchQuery.trim()) {
    return rawJobs;
  }

  // Helper to score relevance between a job and student profile
  const scoreJobRelevance = (job: any) => {
    let score = 0;
    const title = (job.job_title || "").toLowerCase();
    const desc = (job.job_description || "").toLowerCase();
    const type = (job.job_employment_type || "").toLowerCase();
    const employer = (job.employer_name || "").toLowerCase();

    // Deprioritize obvious dummy or test jobs
    if (title.includes("test") || employer.includes("test") || desc.includes("test")) {
      score -= 20;
    }

    // Boost student / internship opportunities
    if (type.includes("intern") || title.includes("intern") || desc.includes("intern") || type.includes("co-op")) {
      score += 6;
    }

    // Match against student's major and career interests
    for (const interest of interests) {
      const term = interest.toLowerCase().trim();
      if (!term || term === "general") continue;

      if (title.includes(term)) {
        score += 15;
      } else {
        const words = term.split(/\s+/).filter((w: string) => w.length > 3);
        for (const w of words) {
          if (title.includes(w)) score += 8;
          if (desc.includes(w)) score += 2;
        }
      }

      if (desc.includes(term)) {
        score += 4;
      }
    }

    // Location / Remote match
    const studentState = (profile.state || "").toLowerCase().trim();
    const jobLocation = `${job.job_city || ""} ${job.job_state || ""}`.toLowerCase();
    if (job.workplace_type === "Remote" || jobLocation.includes("remote")) {
      score += 3;
    } else if (studentState && jobLocation.includes(studentState)) {
      score += 4;
    }

    return score;
  };

  // Sort candidate pool by initial relevance score
  const scoredCandidatePool = [...rawJobs].sort((a, b) => scoreJobRelevance(b) - scoreJobRelevance(a));

  // Create a lightweight candidate list for AI matching (~15 top candidates)
  const liteJobs = scoredCandidatePool.slice(0, 15).map((job: any) => ({
    id: job.job_id,
    title: job.job_title,
    company: job.employer_name,
    type: job.job_employment_type,
    location: job.job_city,
    snippet: (job.job_description || "").substring(0, 80).replace(/\s+/g, " "),
  }));

  const majorStr = Array.isArray(profile.intended_major) ? profile.intended_major.join(", ") : (profile.intended_major || "General");
  const interestsStr = interests.length > 0 ? interests.join(", ") : "General";

  const systemPrompt = `You are an expert student career counselor matching internships and entry-level jobs for a ${profile.grade_level || 'High School / College'} student.
Student Major: ${majorStr}
Student Interests: ${interestsStr}
Student State: ${profile.state || "US"}

Task: Select the jobs that best match the student's major, interests, and academic level. Exclude or deprioritize test/dummy jobs or unrelated roles.
Return ONLY a JSON array of string IDs ordered from highest match to lowest.
Example: ["id1", "id2", "id3"]`;

  const userPrompt = `Candidate Jobs:
${JSON.stringify(liteJobs, null, 2)}

Return JSON array of best matching job IDs:`;

  try {
    const { unstable_cache } = await import("next/cache");
    const getCachedAIIds = unstable_cache(
      async () => {
        return await callAI({
          systemPrompt,
          userPrompt,
          provider: "claude",
          jsonMode: true,
          maxTokens: 400,
          label: "Career Center Job Matcher",
        });
      },
      ["career-ai-match-v2", user.id, majorStr, interestsStr],
      { revalidate: 3600 } // Cache for 1 hour
    );

    const aiResponse = await getCachedAIIds();
    let cleanedResponse = aiResponse.replace(/```(?:json)?/g, '').trim();

    const startIndex = cleanedResponse.indexOf('[');
    const endIndex = cleanedResponse.lastIndexOf(']');
    if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
      cleanedResponse = cleanedResponse.substring(startIndex, endIndex + 1);
    }

    const parsedIds = JSON.parse(cleanedResponse);
    if (Array.isArray(parsedIds) && parsedIds.length > 0) {
      const extractedIdStrings = parsedIds.map((item: any) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'number') return item.toString();
        if (item && typeof item === 'object' && item.id) return String(item.id);
        return "";
      }).filter(Boolean);

      const matched: any[] = [];
      const matchedSet = new Set<string>();

      for (const id of extractedIdStrings) {
        const found = rawJobs.find((job: any) =>
          job.job_id === id ||
          job.job_id.endsWith(id) ||
          id.includes(job.job_id) ||
          (id.length >= 6 && job.job_id.includes(id))
        );
        if (found && !matchedSet.has(found.job_id)) {
          matched.push(found);
          matchedSet.add(found.job_id);
        }
      }

      if (matched.length > 0) {
        const remaining = rawJobs
          .filter(job => !matchedSet.has(job.job_id))
          .sort((a, b) => scoreJobRelevance(b) - scoreJobRelevance(a));
        return [...matched, ...remaining];
      }
    }

    return scoredCandidatePool;
  } catch (error) {
    console.error("AI Jobs filtering failed, returning scored fallback:", error);
    return scoredCandidatePool;
  }
}

export async function matchResumeToJobAction(jobDescription: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const resume = await getResume();

  const systemPrompt = `You are an ATS (Applicant Tracking System) simulator and AI career coach.
Given a job description and a student's resume JSON, provide a JSON response evaluating the match.
Required JSON structure:
{
  "score": "Strong Match" | "Good Match" | "Needs Work",
  "matching_skills": ["skill 1", "skill 2"],
  "missing_skills": ["missing 1", "missing 2"],
  "advice": "Short advice sentence"
}`;

  const userPrompt = `Job Description: ${jobDescription}

Resume Data:
${JSON.stringify(resume?.content || {}, null, 2)}`;

  try {
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude",
      jsonMode: true
    });

    const cleanedResponse = aiResponse.replace(/```(?:json)?/g, '').trim();
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error("AI Resume match failed:", error);
    throw new Error("Failed to analyze resume match.");
  }
}

export async function getCareerAiLimitsAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { getStudentDashboardData } = await import("@/services/data-fetcher");
  const { masterId } = await getStudentDashboardData(user.id);

  const { getUserAiUsage } = await import("@/lib/ai-limits");
  const aiUsage = await getUserAiUsage(masterId);
  const resetDate = aiUsage?.resetDate || "the 1st of next month";

  const isOverBudget = Number(aiUsage?.estimated_cost_usd || 0) >= Number(aiUsage?.monthly_budget_cap_usd || 999999);
  const coverLetterLimit = aiUsage?.cover_letter?.limit ?? 0;
  const coverLetterUsed = aiUsage?.cover_letter?.used ?? 0;
  const isLimitedCoverPlan = coverLetterLimit < 900000;
  const coverLetterLimitReached = isOverBudget || (isLimitedCoverPlan && coverLetterUsed >= coverLetterLimit);

  return {
    isLimitReached: coverLetterLimitReached,
    isOverBudget,
    used: coverLetterUsed,
    limit: coverLetterLimit,
    resetDate
  };
}

export async function generateCoverLetterDraftAction(
  jobTitle: string, 
  company: string, 
  jobDescription: string, 
  q1: string, 
  q2: string, 
  q3: string,
  selectedResumeId?: string
) {
  const { enforceAiLimit } = await import("@/lib/ai-limits");
  await enforceAiLimit("cover_letter");
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { getResumesAction } = await import("@/app/actions/resume");
  const resumePayload = await getResumesAction();
  
  let targetResumeData: any = null;
  if (resumePayload?.resumes && resumePayload.resumes.length > 0) {
    if (selectedResumeId) {
      targetResumeData = resumePayload.resumes.find(r => r.id === selectedResumeId) || resumePayload.resumes[0];
    } else if (resumePayload.active_resume_id) {
      targetResumeData = resumePayload.resumes.find(r => r.id === resumePayload.active_resume_id) || resumePayload.resumes[0];
    } else {
      targetResumeData = resumePayload.resumes[0];
    }
  }

  if (!targetResumeData) {
    const fallbackResume = await getResume();
    targetResumeData = fallbackResume?.content || {};
  }

  const systemPrompt = `You are an expert career counselor. Write a highly professional, compelling FIRST DRAFT cover letter for a student applying for a job or internship.
Use the student's resume data and their specific answers to highlight relevant skills. 
Keep it under 350 words. Do not use placeholders like [Your Name] if the resume has the info.
Format as a clean, standard professional business letter. Do NOT use Markdown formatting, headings, asterisks, or bold text. Return pure plain text.`;

  const userPrompt = `Applying for: ${jobTitle} at ${company}
Job Description: ${jobDescription}

Student Insights:
1. Why they want to work here: ${q1}
2. Proudest achievement: ${q2}
3. Extra skills to highlight: ${q3}

Student Resume:
${JSON.stringify(targetResumeData, null, 2)}`;

  try {
    const rawAiResponse = await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude"
    });

    const cleanContent = rawAiResponse
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/^#+\s*/gm, '')
      .trim();

    // Save it as an essay tagged as Cover Letter
    const { data, error } = await supabase
      .from("essays")
      .insert({
        user_id: user.id,
        title: `Cover Letter: ${jobTitle} at ${company}`,
        topic: `Cover Letter - ${company}`,
        content: cleanContent,
        status: "draft"
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/jobs");
    revalidatePath("/essays");
    return { success: true, id: data.id, content: cleanContent };
  } catch (error) {
    console.error("AI Cover Letter generation failed:", error);
    throw new Error("Failed to generate cover letter.");
  }
}

export async function saveJobToTrackerAction(jobData: any, status: string = "Not Started", dueDate?: string, dueTime?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { masterId } = await getStudentDashboardData(user.id);

  // Check if it already exists
  const { data: existing } = await supabase
    .from("tracker_items")
    .select("id")
    .eq("user_id", masterId)
    .eq("reference_type", "job")
    .eq("reference_id", jobData.job_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("tracker_items")
      .update(dueDate ? { status, due_date: new Date(dueDate).toISOString() } : { status })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("tracker_items")
      .insert({
        user_id: masterId,
        reference_type: "job",
        reference_id: jobData.job_id,
        title: `${jobData.job_title} at ${jobData.employer_name}`,
        status: status,
        due_date: dueDate ? new Date(dueDate).toISOString() : (jobData.job_offer_expiration_timestamp ? new Date(jobData.job_offer_expiration_timestamp * 1000).toISOString() : null),
        notes: JSON.stringify({
          url: jobData.job_apply_link,
          location: jobData.job_city ? `${jobData.job_city}, ${jobData.job_state}` : "Remote",
          description: jobData.job_description
        })
      });
    if (error) throw new Error(error.message);
  }

  // --- NEW TWILIO SMS LOGIC ---
  if (status === "Not Started") {
    // Attempt to send an SMS
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, student_first_name")
      .eq("id", user.id)
      .single();

    if (profile?.phone) {
      const e164Phone = formatPhoneE164(profile.phone);
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

      if (e164Phone && accountSid && authToken && messagingServiceSid) {
        try {
          const client = twilio(accountSid, authToken);
          const studentName = profile.student_first_name || "there";
          const employerName = jobData.employer_name || "the company";
          const jobTitle = jobData.job_title || "the job";

          let immediateMessage = "";
          let finalDueDate: Date | null = null;

          if (dueDate) {
            finalDueDate = new Date(`${dueDate}T${dueTime || '09:00'}`);

            // Generate Floating Time Google Calendar Link
            const encodedTitle = encodeURIComponent(`Apply to ${employerName} - ${jobTitle}`);
            const formatFloatingDate = (d: Date) => {
              const pad = (n: number) => n.toString().padStart(2, '0');
              return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
            };

            const eventDateStr = formatFloatingDate(finalDueDate);
            const endDueDate = new Date(finalDueDate.getTime() + 60 * 60 * 1000);
            const endDateStr = formatFloatingDate(endDueDate);
            const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${eventDateStr}/${endDateStr}`;

            immediateMessage = `Hi ${studentName}! You committed to applying to ${employerName} on ${dueDate}. Tap here to add the deadline to your calendar so you don't forget: ${calendarLink}\n\nReply STOP to unsubscribe.`;
          } else {
            immediateMessage = `Hi ${studentName}! Reminder: You committed to applying to ${employerName}. Track your progress at members.schoolari.app/jobs. Good luck! 💼\n\nReply STOP to unsubscribe.`;
          }

          // Send Immediate SMS
          await client.messages.create({
            body: immediateMessage,
            messagingServiceSid,
            to: e164Phone
          });

          // Schedule the Reminder SMS
          if (finalDueDate) {
            const now = new Date();
            const diffDays = (finalDueDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
            let sendAtDate: Date | null = null;

            if (diffDays > 7) {
              sendAtDate = new Date(finalDueDate.getTime() - 2 * 24 * 60 * 60 * 1000);
            } else if (diffDays > 2) {
              sendAtDate = new Date(finalDueDate.getTime() - 1 * 24 * 60 * 60 * 1000);
            } else if (diffDays > 0.5) {
              sendAtDate = new Date(finalDueDate);
              sendAtDate.setHours(9, 0, 0, 0);
              if (sendAtDate < now) sendAtDate = null;
            }

            if (sendAtDate) {
              const minSendAt = new Date(now.getTime() + 16 * 60 * 1000);
              const maxSendAt = new Date(now.getTime() + 34 * 24 * 60 * 60 * 1000);

              if (sendAtDate < minSendAt) sendAtDate = minSendAt;
              if (sendAtDate < maxSendAt) {
                const scheduledMessage = `Reminder: Your application for ${employerName} is due soon! Review your materials at members.schoolari.app/jobs. You've got this! 💼`;

                await client.messages.create({
                  body: scheduledMessage,
                  messagingServiceSid,
                  sendAt: sendAtDate,
                  scheduleType: 'fixed',
                  to: e164Phone
                }).catch(err => {
                  console.error("Twilio scheduling error (jobs):", err.message);
                });
              }
            }
          }
        } catch (err: any) {
          console.error("[saveJobToTrackerAction] Twilio error:", err.message);
        }
      }
    }
  }


  // Clear profile AI dashboard cache so dashboard reflects updated tracker items immediately
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabaseAdmin = await createAdminClient();
  await supabaseAdmin
    .from("profiles")
    .update({ ai_dashboard_data: null })
    .eq("id", user.id);

  revalidatePath("/jobs");
  revalidatePath("/tracker");
  revalidatePath("/dashboard");
  return { success: true };
}

