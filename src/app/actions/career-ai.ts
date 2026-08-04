"use server";

import { createClient } from "@/lib/supabase/server";
import { getStudentDashboardData } from "@/services/data-fetcher";
import { getRawJobsAndInternships, getResume } from "./career";
import { callAI } from "@/lib/ai";
import { revalidatePath } from "next/cache";
import twilio from "twilio";
import { formatPhoneE164 } from "@/lib/phone";
import { requireFeatureAccess } from "@/lib/subscription-server";

export async function getPersonalizedJobsAction() {
  await requireFeatureAccess("jobs");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Fetch the student profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("intended_major, career_interests, extracurricular_activities")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  // Get raw jobs from JSearch (this already caches)
  const rawJobs = await getRawJobsAndInternships();

  if (!rawJobs || rawJobs.length === 0) return [];

  // Create a lightweight version of jobs to save thousands of AI tokens
  const liteJobs = rawJobs.slice(0, 30).map((job: any) => ({
    id: job.job_id,
    title: job.job_title,
    company: job.employer_name,
    type: job.job_employment_type
  }));

  const systemPrompt = `You are a Career API for students. Your job is to analyze a list of job listings and find the best matches based on the student's profile.
Respond ONLY with a JSON array of string IDs representing the top 15 most relevant jobs, ordered by relevance. Example: ["id1", "id2", "id3"]`;

  const userPrompt = `Student Profile:
Majors: ${profile.intended_major?.join(", ")}
Career Interests: ${profile.career_interests?.join(", ")}
Extracurriculars: ${profile.extracurricular_activities?.join(", ")}

Available Jobs:
${JSON.stringify(liteJobs)}

Return ONLY a JSON array of the 15 best matching IDs.`;

  try {
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude",
      jsonMode: true
    });

    const cleanedResponse = aiResponse.replace(/```(?:json)?/g, '').trim();
    const parsedIds = JSON.parse(cleanedResponse);
    if (Array.isArray(parsedIds) && parsedIds.length > 0) {
      // Map the AI-selected IDs back to the original full job objects (with descriptions & links)
      return parsedIds
        .map(id => rawJobs.find((job: any) => job.job_id === id))
        .filter(Boolean); // Remove any undefined if AI hallucinated an ID
    }
    return rawJobs.slice(0, 15);
  } catch (error) {
    console.error("AI Jobs filtering failed, returning raw fallback:", error);
    return rawJobs.slice(0, 15);
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

export async function generateCoverLetterDraftAction(jobTitle: string, company: string, jobDescription: string, q1: string, q2: string, q3: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const resume = await getResume();

  const systemPrompt = `You are an expert career counselor. Write a highly professional, compelling FIRST DRAFT cover letter for a student applying for a job.
Use the student's resume data and their specific answers to highlight relevant skills. 
Keep it under 350 words. Do not use placeholders like [Your Name] if the resume has the info.`;

  const userPrompt = `Applying for: ${jobTitle} at ${company}
Job Description: ${jobDescription}

Student Insights:
1. Why they want to work here: ${q1}
2. Proudest achievement: ${q2}
3. Extra skills to highlight: ${q3}

Student Resume:
${JSON.stringify(resume?.content || {}, null, 2)}`;

  try {
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude"
    });

    // Save it as an essay tagged as Cover Letter
    const { data, error } = await supabase
      .from("essays")
      .insert({
        user_id: user.id,
        title: `Cover Letter: ${jobTitle} at ${company}`,
        topic: `Cover Letter - ${company}`,
        content: aiResponse,
        status: "draft"
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/jobs");
    revalidatePath("/essays");
    return { success: true, id: data.id, content: aiResponse };
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

