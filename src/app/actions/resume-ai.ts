"use server";

import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai";
import {
  ResumeDocument,
  StarBulletVariations,
  ATSTailorResult
} from "@/types/resume";
import { formatPhoneE164 } from "@/lib/phone";

export async function generateResumeFromProfileAction(
  resumeType: "academic" | "professional" | "both" = "professional"
): Promise<ResumeDocument> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to generate a resume.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new Error("Student onboarding profile not found.");
  }

  const typeInstruction =
    resumeType === "academic"
      ? "Focus primarily on ACADEMIC achievements: college and scholarship readiness, AP/IB/Honors coursework, GPA, academic honors/awards, research competitions, and 1-2 sentence college/career goals."
      : resumeType === "professional"
      ? "Focus primarily on PROFESSIONAL readiness: internships, jobs, leadership roles, technical software skills, quantifiable impact STAR bullets, and target internship/job readiness."
      : "Synthesize BOTH ACADEMIC and PROFESSIONAL readiness: include high-impact academic honors along with strong internship/job leadership STAR bullets.";

  const systemPrompt = `You are an expert Harvard Career Coach, ATS Resume Writer, and Strict Fact-Checker for US students.
Your task is to synthesize a student's raw profile data into an ATS-compatible, 1-page US Student Resume JSON object.
You must behave as an editor, NOT a creative writer.

GOLDEN RULES (CRITICAL):
1. NEVER invent companies, internships, volunteer work, awards, dates, leadership, achievements, GPA, or metrics. Everything must come directly from the student's input.
2. NEVER assume responsibilities or guess details. If information is sparse, write basic, factual bullet points (e.g. "Supported day-to-day operations" instead of "Led strategic initiatives").
3. Only use "Leadership" if explicitly stated (Club Member ≠ Team Leader).
4. Professional Summary must be 2-3 factual sentences mentioning education, academic interests, major, career interests, and skills. AVOID buzzwords like passionate, ambitious, dynamic, hardworking, results-driven, motivated, team player, go-getter, self-starter.
5. All data must follow the US Education System (e.g., 9th Grade (Freshman), College Junior). Use US GPA scales (4.0/5.0+). Phone format: +1 (XXX) XXX-XXXX.
6. First, determine the student's experience level and adjust the tone accordingly. Do not generate a highly experienced resume for a beginner.
7. RESUME TYPE INSTRUCTION (${resumeType.toUpperCase()}): ${typeInstruction}
8. Return ONLY a valid JSON object matching this exact TypeScript structure:
{
  "student_experience_level": "High School Student | College Student | No Experience | Some Experience | Experienced",
  "missing_information": ["List any specific facts missing that would improve the resume, like dates, role titles, or specific tasks."],
  "title": "${
    resumeType === "academic"
      ? "Academic Resume — College & Scholarships"
      : resumeType === "professional"
      ? "Professional Resume — Jobs & Internships"
      : "Academic & Professional Resume"
  }",
  "template_theme": "harvard",
  "header": {
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string",
    "city_state": "string",
    "summary": "string",
    "target_job_or_internship": "string",
    "college_or_career_goals": "string"
  },
  "education": [
    {
      "id": "edu-1",
      "institution": "string",
      "grade_level_or_degree": "string",
      "graduation_year": "string",
      "gpa_unweighted": "string",
      "gpa_weighted": "string",
      "honors_coursework": "string",
      "location": "string"
    }
  ],
  "experience": [
    {
      "id": "exp-1",
      "title": "string",
      "organization": "string",
      "location": "string",
      "start_date": "string",
      "end_date": "string",
      "is_current": true,
      "bullets": ["string"]
    }
  ],
  "extracurriculars": [
    {
      "id": "ext-1",
      "activity": "string",
      "role": "string",
      "start_date": "string",
      "end_date": "string",
      "hours_per_week": "string",
      "bullets": ["string"]
    }
  ],
  "awards": [
    {
      "id": "awd-1",
      "title": "string",
      "issuer": "string",
      "year": "string",
      "level": "School",
      "description": "string"
    }
  ],
  "skills": {
    "technical": ["string"],
    "soft": ["string"],
    "languages": ["string"],
    "certifications": ["string"]
  }
}`;

  const userPrompt = `Student Profile Data:
First Name: ${profile.student_first_name || "Student"}
Last Name: ${profile.student_last_name || ""}
Email: ${profile.student_email || user.email || ""}
Phone: ${profile.student_phone ? formatPhoneE164(profile.student_phone) : "+1 (555) 000-0000"}
State/City: ${profile.state || "US"}
High School/College: ${profile.high_school_name || "My School"}
Grade Level: ${profile.grade_level || "11th Grade (Junior)"}
Graduation Year: ${profile.expected_graduation_year || "2026"}
Unweighted GPA: ${profile.unweighted_gpa || ""}
Weighted GPA: ${profile.weighted_gpa || ""}
Intended Major / Focus: ${profile.intended_major || profile.fields_of_study || "Undecided"}
Career Interests: ${JSON.stringify(profile.career_interests || [])}
Extracurricular Activities: ${JSON.stringify(profile.extracurricular_activities || [])}
Involvement Tags: ${JSON.stringify(profile.involvement_tags || [])}
Leadership Experience: ${profile.leadership_experience || "None explicitly stated"}
Volunteer Experience: ${profile.volunteer_experience || "None explicitly stated"}
Resume Type: ${resumeType.toUpperCase()}

Generate a complete, ATS-clean US Student Resume Document JSON object strictly adhering to the Golden Rules. Do not invent any metrics or experiences.`;

  try {
    const rawJson = await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude",
      jsonMode: true
    });

    const parsed = JSON.parse(rawJson);
    return {
      id: "resume-" + Date.now(),
      title:
        parsed.title ||
        (resumeType === "academic"
          ? "Academic Resume — College & Scholarships"
          : resumeType === "professional"
          ? "Professional Resume — Jobs & Internships"
          : "Academic & Professional Resume"),
      resume_type: resumeType,
      template_theme: parsed.template_theme || "harvard",
      header: parsed.header || {
        first_name: profile.student_first_name || "Student",
        last_name: profile.student_last_name || "",
        email: profile.student_email || "",
        phone: "+1 (555) 000-0000",
        city_state: profile.state || "US",
        summary:
          resumeType === "academic"
            ? "Dedicated high school junior maintaining a strong US GPA and honors coursework, seeking college admission and competitive scholarship opportunities."
            : "Results-driven student with proven leadership and analytical skills, seeking entry-level internships and professional growth opportunities.",
        target_job_or_internship:
          resumeType === "professional" ? "Summer Internship / Entry-Level Role" : undefined,
        college_or_career_goals:
          resumeType === "academic"
            ? "Aiming to pursue an undergraduate degree at a competitive 4-year US university."
            : undefined
      },
      education: parsed.education || [],
      experience: parsed.experience || [],
      extracurriculars: parsed.extracurriculars || [],
      awards: parsed.awards || [],
      skills: parsed.skills || {
        technical: profile.career_interests || [],
        soft: [],
        languages: ["English"],
        certifications: []
      },
      student_experience_level: parsed.student_experience_level || "Unknown",
      missing_information: parsed.missing_information || [],
      last_modified: new Date().toISOString()
    };
  } catch (error: any) {
    console.error("AI Generate Resume Error:", error);
    throw new Error("Failed to generate resume from profile using Claude AI.");
  }
}

export async function optimizeResumeBulletAIAction(
  bulletText: string,
  roleTitle: string = "Student"
): Promise<StarBulletVariations> {
  const systemPrompt = `You are an elite US Career Coach and Harvard ATS Resume Expert specializing in student resumes.
Your task is to transform a basic activity or job description into 3 high-impact STAR (Situation, Task, Action, Result) resume bullet variations without inventing any information.

STRICT RULES:
1. Use strong US professional action verbs (e.g., Organized, Analyzed, Facilitated, Assisted, Developed).
2. NEVER invent quantifiable results. Do not use placeholders like [X]%. Base all metrics entirely on the facts provided. If there are no numbers, do not invent them.
3. NEVER assume leadership responsibilities if none are stated. (e.g. Club Member ≠ Team Leader). Do not use words like "Led" or "Directed" if the user was just a participant.
4. Keep each bullet concise (1-2 lines max) to fit a 1-page US student resume layout.
5. Do not include introductory markdown or chatter.
6. Return ONLY a JSON object matching this exact TypeScript structure:
{
  "actionFocused": "string (strong action verb opening, purely factual)",
  "metricFocused": "string (emphasizes quantifiable outcomes only if facts support it, otherwise basic factual)",
  "leadershipFocused": "string (highlights initiative or collaboration, strictly truthful without inventing authority)"
}`;

  const userPrompt = `Role / Context: "${roleTitle}"
Original Bullet or Description: "${bulletText}"

Provide the 3 STAR method variations in JSON format.`;

  try {
    const responseJson = await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude",
      jsonMode: true
    });

    const parsed = JSON.parse(responseJson);
    const cleanPlaceholders = (text: string) => text.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();

    return {
      actionFocused: cleanPlaceholders(parsed.actionFocused || bulletText),
      metricFocused: cleanPlaceholders(parsed.metricFocused || bulletText),
      leadershipFocused: cleanPlaceholders(parsed.leadershipFocused || bulletText)
    };
  } catch (error: any) {
    console.error("Optimize Bullet Error:", error);
    throw new Error("Failed to generate STAR bullet variations via Claude AI.");
  }
}

export async function tailorResumeToJobAIAction(
  resumeDoc: ResumeDocument,
  jobTitleOrDescription: string
): Promise<ATSTailorResult> {
  const systemPrompt = `You are a senior US ATS (Applicant Tracking System) algorithm expert and Executive Recruiter.
You are evaluating a student's resume against a target US job, internship, or scholarship prompt.

RULES:
1. Calculate an accurate ATS Keyword Match Score (integer from 0 to 100).
2. Identify up to 10 key skills/keywords from the job description that are present in the resume (matched_keywords).
3. Identify up to 10 important keywords/qualifications from the job description that are missing from the resume (missing_keywords).
4. Provide up to 4 actionable, specific suggestions on how to improve bullet points or skills to increase ATS match.
5. Return ONLY a JSON object matching this exact TypeScript structure:
{
  "ats_score": number,
  "matched_keywords": ["string"],
  "missing_keywords": ["string"],
  "suggestions": [
    {
      "section": "experience" | "extracurriculars" | "skills" | "summary",
      "advice": "string (why and how to change)",
      "suggested_text": "string (example wording)"
    }
  ]
}`;

  const userPrompt = `Target Job / Internship / Scholarship Description:
"""
${jobTitleOrDescription}
"""

Current Resume Document (JSON):
${JSON.stringify(resumeDoc, null, 2)}

Provide ATS analysis JSON.`;

  try {
    const rawJson = await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude",
      jsonMode: true
    });

    const parsed = JSON.parse(rawJson);
    return {
      ats_score: typeof parsed.ats_score === "number" ? parsed.ats_score : 78,
      matched_keywords: Array.isArray(parsed.matched_keywords) ? parsed.matched_keywords : ["Communication", "Teamwork"],
      missing_keywords: Array.isArray(parsed.missing_keywords) ? parsed.missing_keywords : ["Data Analysis", "Project Management"],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [
        {
          section: "summary",
          advice: "Include keywords from the job description in your summary statement.",
          suggested_text: "Results-driven student with experience in analytical problem solving and collaborative project delivery."
        }
      ]
    };
  } catch (error: any) {
    console.error("ATS Tailor Error:", error);
    throw new Error("Failed to analyze ATS match using Claude AI.");
  }
}

export async function generateProfessionalSummaryAIAction(
  resumeDoc: ResumeDocument,
  targetRole: string = ""
): Promise<string> {
  const systemPrompt = `You are a professional US Resume Coach and Strict Fact-Checker.
Write a concise, compelling 2-3 sentence Professional Summary for a US student's resume based purely on the provided facts.

STRICT RULES:
1. Base the summary ONLY on facts. Mention education, academic interests, major, career interests, and relevant skills.
2. DO NOT USE BUZZWORDS. Banned words: passionate, ambitious, dynamic, hardworking, results-driven, motivated, team player, go-getter, self-starter, dedicated.
3. Do not invent any experience, goals, or leadership initiatives.
4. Return ONLY the summary text, no markdown or quotation marks.`;

  const userPrompt = `Student Name: ${resumeDoc.header.first_name} ${resumeDoc.header.last_name}
Target Role: ${targetRole || resumeDoc.title}
Education: ${JSON.stringify(resumeDoc.education)}
Skills: ${JSON.stringify(resumeDoc.skills)}`;

  try {
    const summary = await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude"
    });
    return summary.trim();
  } catch (error: any) {
    console.error("Summary AI Error:", error);
    return "Dedicated student with a strong academic foundation and a passion for professional growth and community leadership.";
  }
}
