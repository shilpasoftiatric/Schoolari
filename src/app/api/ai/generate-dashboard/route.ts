import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai";
import { isDashboardStateEqual, getTodayDateString } from "@/services/task-engine";
import { getStudentDashboardData } from "@/services/data-fetcher";
import { MASTER_TASKS } from "@/config/master-tasks";

const SYSTEM_PROMPT = `You are the Schoolari AI, an expert scholarship and college admissions counselor.
Your job is to generate a highly personalized action plan based on the student profile.
You DO NOT need to generate tasks or goals. You only generate the supplementary content.

CRITICAL INSTRUCTION FOR COLLEGES:
When suggesting colleges, you MUST base your suggestions on a holistic combination of the student's:
1. Intended Major(s)
2. Career Interests
3. Extracurricular Activities
4. Ethnicity (if they seek diversity or specialized programs)
5. State of residence (as just one of many factors)
Do NOT simply suggest state universities based solely on their state. Provide highly targeted suggestions that reflect their specific academic and personal background.

Respond STRICTLY in the following JSON format, with no markdown formatting or extra text:
{
  "income_ideas": [
    { "opportunity": "...", "difficulty": "Easy | Medium | Hard", "how_to_start": "..." }
  ],
  "suggested_colleges": [
    { "name": "...", "reason": "...", "match": "98%" }
  ],
  "essay_prompts": [
    { "topic": "...", "advice": "..." }
  ],
  "resume_tips": [
    "...", "..."
  ]
}`;

function getFallbackData(profile: any) {
  const career = profile.career_interests?.[0] || profile.career_interest?.[0] || "College Student";
  const major = profile.intended_major?.[0] || "General Studies";
  return {
    income_ideas: [
      { opportunity: "Subject Tutoring", difficulty: "Easy", how_to_start: `Tutor middle/high school students online or locally in ${major} or general academics.` },
      { opportunity: "Freelance Academic Writing & Proofreading", difficulty: "Medium", how_to_start: "Offer essay review and formatting assistance on platforms like Upwork or Fiverr." }
    ],
    suggested_colleges: [
      { name: "University of California, Berkeley", reason: `Renowned research institution with top-tier programs for ${major}`, match: "96%" },
      { name: "University of Michigan - Ann Arbor", reason: `Strong industry connections, academic excellence, and financial aid in ${career}`, match: "92%" },
      { name: "Howard University", reason: "Outstanding academic reputation, vibrant campus culture, and generous merit aid opportunities", match: "90%" }
    ],
    essay_prompts: [
      { topic: "Overcoming a significant challenge", advice: "Focus on a specific obstacle, your strategic response, and the personal growth you gained." },
      { topic: `Why pursue a path in ${career}?`, advice: "Connect your personal experiences directly to your long-term educational and career goals." }
    ],
    resume_tips: [
      "Use strong action verbs (e.g., Directed, Coordinated, Initiated) to start every bullet point.",
      "Quantify your accomplishments (e.g., 'managed a team of 5', 'raised $1,200 for local shelter').",
      "Highlight leadership roles, academic honors, dual enrollment credits, and community involvement."
    ]
  };
}

async function ensureActiveTasks(category: "SCHOLARSHIPS" | "ESSAYS" | "COLLEGES", profile: any, globalTasks: any[], supabaseAdmin: any, masterId: string) {
  const categoryKey = category.toLowerCase();
  const dbCategory = categoryKey;
  
  // Find all tasks for this category
  const allCategoryTasks = globalTasks.filter((t: any) => t.description === dbCategory);
  
  // Existing active (pending) tasks
  const pendingTasks = allCategoryTasks.filter((t: any) => t.status === "pending");
  
  // Deduplicate pending tasks by title (if duplicates exist in DB, clean up extra ones)
  const uniqueActiveTasks: any[] = [];
  const duplicateIdsToDelete: string[] = [];
  const seenActiveTitles = new Set<string>();

  for (const task of pendingTasks) {
    if (seenActiveTitles.has(task.title)) {
      if (task.id && !String(task.id).startsWith("temp-")) {
        duplicateIdsToDelete.push(task.id);
      }
    } else {
      seenActiveTitles.add(task.title);
      uniqueActiveTasks.push(task);
    }
  }

  // Delete duplicate pending tasks from DB in background if any exist
  if (duplicateIdsToDelete.length > 0) {
    await supabaseAdmin.from("tasks").delete().in("id", duplicateIdsToDelete);
  }

  let activeTasks = uniqueActiveTasks;
  const targetActive = 3;
  let newTasksToInsert = [];
  const indexCol = categoryKey === "scholarships" ? "scholarship_task_index" : categoryKey === "essays" ? "essay_task_index" : categoryKey === "colleges" ? "college_task_index" : `${categoryKey}_task_index`;
  let currentIndex = profile[indexCol] || 0;
  const masterList = MASTER_TASKS[category] || [];

  // Collect all titles that have ALREADY been used/active in this category
  const usedTitles = new Set(allCategoryTasks.map((t: any) => t.title));

  while (activeTasks.length < targetActive && currentIndex < masterList.length) {
    const candidateTitle = masterList[currentIndex];
    
    if (!usedTitles.has(candidateTitle)) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      
      const newTask = {
        user_id: masterId,
        title: candidateTitle,
        description: dbCategory,
        status: "pending",
        type: "custom",
        due_date: dueDate.toISOString()
      };
      
      newTasksToInsert.push(newTask);
      activeTasks.push({ ...newTask, id: "temp-" + activeTasks.length });
      usedTitles.add(candidateTitle);
    }
    
    currentIndex++;
  }

  // Fallback: If still need tasks, pick any unused task from masterList
  if (activeTasks.length < targetActive && masterList.length > 0) {
    for (let i = 0; activeTasks.length < targetActive && i < masterList.length; i++) {
      const candidateTitle = masterList[i];
      if (!activeTasks.some((t: any) => t.title === candidateTitle)) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        const newTask = {
          user_id: masterId,
          title: candidateTitle,
          description: dbCategory,
          status: "pending",
          type: "custom",
          due_date: dueDate.toISOString()
        };
        newTasksToInsert.push(newTask);
        activeTasks.push({ ...newTask, id: "temp-" + activeTasks.length });
      }
    }
  }

  if (newTasksToInsert.length > 0) {
    const { data } = await supabaseAdmin.from("tasks").insert(newTasksToInsert).select();
    if (data) {
      const nonTempActive = activeTasks.filter((t: any) => !String(t.id).startsWith("temp-"));
      activeTasks = nonTempActive.concat(data);
    }
    await supabaseAdmin.from("profiles").update({
      [indexCol]: currentIndex
    }).eq("id", masterId);
  }

  return activeTasks;
}

async function syncNotifications(userId: string, tasks: any[], trackerItems: any[], supabaseAdmin: any) {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const upcoming = [];

    // Scan tasks
    for (const t of tasks) {
      if (t.status !== "completed" && t.status !== "skipped" && t.due_date) {
        const dd = new Date(t.due_date);
        if (dd >= now && dd <= threeDaysFromNow) {
          upcoming.push({ title: `Task Due Soon: ${t.title}`, message: `This task is due on ${dd.toLocaleDateString()}.`, type: 'task', ref: t.id });
        } else if (dd < now) {
          upcoming.push({ title: `Overdue Task: ${t.title}`, message: `This task was due on ${dd.toLocaleDateString()}.`, type: 'task', ref: t.id });
        }
      }
    }

    // Scan tracker
    for (const t of trackerItems) {
      if (t.status !== "Won" && t.status !== "Lost" && t.status !== "completed" && t.due_date) {
        const dd = new Date(t.due_date);
        if (dd >= now && dd <= threeDaysFromNow) {
          upcoming.push({ title: `Deadline Approaching: ${t.title}`, message: `This item is due on ${dd.toLocaleDateString()}.`, type: 'tracker', ref: t.id });
        } else if (dd < now) {
          upcoming.push({ title: `Overdue Deadline: ${t.title}`, message: `This item was due on ${dd.toLocaleDateString()}.`, type: 'tracker', ref: t.id });
        }
      }
    }

    if (upcoming.length === 0) return;

    // Fetch recent notifications to prevent duplicates
    const { data: recentNotifs } = await supabaseAdmin
      .from("notifications")
      .select("title")
      .eq("user_id", userId)
      .gte("created_at", new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()); // Last 3 days

    const existingTitles = new Set(recentNotifs?.map((n: any) => n.title) || []);

    const toInsert = upcoming
      .filter(u => !existingTitles.has(u.title))
      .map(u => ({
        user_id: userId,
        title: u.title,
        message: u.message,
        is_read: false
      }));

    if (toInsert.length > 0) {
      await supabaseAdmin.from("notifications").insert(toInsert);
    }
  } catch (err) {
    console.error("Failed to sync notifications:", err);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let force = false;
    try {
      const body = await req.json();
      force = body.force;
    } catch (e) { }

    const { profile, documents: docs, essays, savedColleges, applications: apps, resume, masterId, globalTasks, trackerItems } = await getStudentDashboardData(user.id);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const progressStats = {
      hasTranscript: docs.some((d: any) => d.type === "transcript"),
      hasRecommendationLetter: docs.some((d: any) => d.type === "recommendation_letter"),
      hasResume: docs.some((d: any) => d.type === "resume"),
      documentsCount: docs.length,
      essaysCount: essays.length,
      completedEssaysCount: essays.filter((e: any) => e.status === "completed").length,
      savedCollegesCount: savedColleges.length,
      appliedScholarshipsCount: apps.filter((a: any) => a.status === "Submitted").length,
      savedScholarshipsCount: apps.length
    };

    const currentState = {
      ...progressStats,
      firstName: profile.student_first_name || "",
      lastGeneratedDate: getTodayDateString()
    };

    const cachedData = profile.ai_dashboard_data;
    const cachedState = cachedData?._state;
    const isStateEqual = isDashboardStateEqual(currentState as any, cachedState);

    // 1. Maintain tasks (ensures DB is populated)
    const scholarshipTasks = await ensureActiveTasks("SCHOLARSHIPS", profile, globalTasks, supabaseAdmin, masterId);
    const essayTasks = await ensureActiveTasks("ESSAYS", profile, globalTasks, supabaseAdmin, masterId);
    const collegeTasks = await ensureActiveTasks("COLLEGES", profile, globalTasks, supabaseAdmin, masterId);

    // Sync notifications for deadlines
    await syncNotifications(masterId, [...scholarshipTasks, ...essayTasks, ...collegeTasks], trackerItems, supabaseAdmin);

    if (!force && cachedData && isStateEqual) {
      // Re-inject the latest tasks and tracker deadlines from DB even if we cache AI
      cachedData.scholarships = {
        tasks: scholarshipTasks.map(t => ({ id: t.id, title: t.title, done: false, due_date: t.due_date })),
        deadlines: trackerItems.filter((t: any) => t.reference_type === "scholarship").map((t: any) => ({ name: t.title, date: new Date(t.due_date).toLocaleDateString(), urgent: false }))
      };
      cachedData.essays = {
        tasks: essayTasks.map(t => ({ id: t.id, title: t.title, done: false, due_date: t.due_date })),
        deadlines: trackerItems.filter((t: any) => t.reference_type === "essay").map((t: any) => ({ name: t.title, date: new Date(t.due_date).toLocaleDateString(), urgent: false }))
      };
      cachedData.colleges = {
        tasks: collegeTasks.map(t => ({ id: t.id, title: t.title, done: false, due_date: t.due_date })),
        deadlines: trackerItems.filter((t: any) => t.reference_type === "college").map((t: any) => ({ name: t.title, date: new Date(t.due_date).toLocaleDateString(), urgent: false }))
      };
      cachedData.tracker = trackerItems.map((t: any) => ({
        id: t.id,
        name: t.title,
        status: t.status,
        category: t.reference_type || "scholarship",
        deadline: new Date(t.due_date).toLocaleDateString(),
        progress: 0,
        urgent: false
      }));
      
      return NextResponse.json(cachedData);
    }

    let generatedJson = null;

    try {
      const today = getTodayDateString();
      const userPrompt = `
Today's Date: ${today}

Student Profile Summary:
- Name: ${profile.student_first_name || "Student"}
- State: ${profile.state || "Not specified"}
- Grade Level: ${profile.grade_level || "Not specified"}
- GPA: ${profile.gpa_range || profile.unweighted_gpa || "Not specified"}
- Intended Major(s): ${(profile.intended_major || []).join(", ") || "Not specified"}
- Career Interests: ${(profile.career_interest || []).join(", ") || "Not specified"}
- Extracurriculars: ${(profile.extracurricular_activities || []).join(", ") || "Not specified"}
- Ethnicity: ${(profile.ethnicity || []).join(", ") || "Not specified"}
- Schoolari Goals: ${(profile.schoolari_goals || []).join(", ") || "Not specified"}

IMPORTANT: Generate only the exact JSON requested.`;

      const responseText = await callAI({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: userPrompt,
        provider: "openai",
        jsonMode: true
      });

      generatedJson = JSON.parse(responseText);
    } catch (err: any) {
      console.error("Error fetching from AI:", err.message);
    }

    const fallbackData = getFallbackData(profile);
    if (!generatedJson) {
      generatedJson = fallbackData;
    } else {
      generatedJson.income_ideas = generatedJson.income_ideas?.length ? generatedJson.income_ideas : fallbackData.income_ideas;
      generatedJson.suggested_colleges = generatedJson.suggested_colleges?.length ? generatedJson.suggested_colleges : fallbackData.suggested_colleges;
      generatedJson.essay_prompts = generatedJson.essay_prompts?.length ? generatedJson.essay_prompts : fallbackData.essay_prompts;
      generatedJson.resume_tips = generatedJson.resume_tips?.length ? generatedJson.resume_tips : fallbackData.resume_tips;
    }

    // Merge database state and AI state
    generatedJson = {
      ...generatedJson,
      stats: [
        { label: "Scholarships Matched", sub: "Total Matches", value: "12", color: "text-emerald-500", bg: "bg-emerald-50" },
        { label: "Applied Scholarship Applications", sub: "Submitted", value: String(progressStats.appliedScholarshipsCount), color: "text-blue-500", bg: "bg-blue-50" },
        { label: "Essays Drafted", sub: "Drafts", value: String(progressStats.essaysCount), color: "text-violet-500", bg: "bg-violet-50" },
        { label: "Colleges Saved", sub: "Shortlist", value: String(progressStats.savedCollegesCount), color: "text-amber-500", bg: "bg-amber-50" }
      ],
      scholarships: {
        tasks: scholarshipTasks.map(t => ({ id: t.id, title: t.title, done: false, due_date: t.due_date })),
        deadlines: trackerItems.filter((t: any) => t.reference_type === "scholarship").map((t: any) => ({ name: t.title, date: new Date(t.due_date).toLocaleDateString(), urgent: false }))
      },
      essays: {
        tasks: essayTasks.map(t => ({ id: t.id, title: t.title, done: false, due_date: t.due_date })),
        deadlines: trackerItems.filter((t: any) => t.reference_type === "essay").map((t: any) => ({ name: t.title, date: new Date(t.due_date).toLocaleDateString(), urgent: false }))
      },
      colleges: {
        tasks: collegeTasks.map(t => ({ id: t.id, title: t.title, done: false, due_date: t.due_date })),
        deadlines: trackerItems.filter((t: any) => t.reference_type === "college").map((t: any) => ({ name: t.title, date: new Date(t.due_date).toLocaleDateString(), urgent: false }))
      },
      tracker: trackerItems.map((t: any) => ({
        id: t.id,
        name: t.title,
        status: t.status,
        category: t.reference_type || "scholarship",
        deadline: new Date(t.due_date).toLocaleDateString(),
        progress: 0,
        urgent: false
      })),
      _state: {
        ...currentState
      }
    };

    // Save to database
    await supabaseAdmin
      .from("profiles")
      .update({ ai_dashboard_data: generatedJson })
      .eq("id", masterId);

    return NextResponse.json(generatedJson);
  } catch (error: any) {
    console.error("Error generating AI dashboard:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
