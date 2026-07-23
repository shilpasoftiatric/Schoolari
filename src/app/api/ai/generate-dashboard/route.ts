import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callAI } from '@/lib/ai';
import { compileDashboard, calculateWorkflowStates, isDashboardStateEqual } from '@/services/task-engine';
import { getStudentDashboardData } from '@/services/data-fetcher';

const SYSTEM_PROMPT = `You are the Schoolari AI, an expert scholarship and college admissions counselor.
Your job is to take a student's profile and their actual database progress metadata, and generate a highly personalized action plan.

The action plan must be organized into three main content sections: Scholarships, Essays, and Colleges.
Adhere strictly to the following rules for generating tasks:
1. Do NOT repeat completed tasks.
2. Under Today's Priority: show a maximum of 3 tasks per section.
3. Under This Week's Goals: show a maximum of 5 goals per section.
4. Tasks and goals must progress logically based on current database state:
   - If transcript already uploaded (hasTranscript = true) -> Do NOT show "Upload Transcript". Show next task: "Attach transcript to scholarship applications".
   - If essay draft finished (essaysCount > 0) -> Do NOT show "Finish Essay Outline". Show next task: "Review essay with AI".
   - If student has saved scholarships (savedScholarshipsCount >= 5) -> Do NOT show "Find Scholarships". Show next task: "Apply to a saved scholarship".
   - If student has saved colleges (savedCollegesCount > 0) -> Show next task: "Compare admission requirements".

Respond STRICTLY in the following JSON format, with no markdown formatting or extra text:
{
  "scholarships": {
    "tasks": [
      { "title": "...", "done": false }
    ],
    "deadlines": [
      { "name": "...", "date": "14 Days", "urgent": false }
    ],
    "goals": [
      "..."
    ]
  },
  "essays": {
    "tasks": [
      { "title": "...", "done": false }
    ],
    "deadlines": [
      { "name": "...", "date": "30 Days", "urgent": false }
    ],
    "goals": [
      "..."
    ]
  },
  "colleges": {
    "tasks": [
      { "title": "...", "done": false }
    ],
    "deadlines": [
      { "name": "...", "date": "45 Days", "urgent": false }
    ],
    "goals": [
      "..."
    ]
  },
  "stats": [
    { "label": "Scholarships Matched", "sub": "Total Matches", "value": "12", "color": "text-emerald-500", "bg": "bg-emerald-50" },
    { "label": "Applied Scholarship Applications", "sub": "Submitted", "value": "0", "color": "text-blue-500", "bg": "bg-blue-50" },
    { "label": "Essays Drafted", "sub": "Drafts", "value": "0", "color": "text-violet-500", "bg": "bg-violet-50" },
    { "label": "Colleges Saved", "sub": "Shortlist", "value": "0", "color": "text-amber-500", "bg": "bg-amber-50" }
  ],
  "tracker": [
    { "name": "...", "status": "Not Started", "deadline": "14 Days", "progress": 0, "urgent": false }
  ],
  "income_ideas": [
    { "title": "...", "description": "..." }
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

function getFallbackData(profile: any, progressStats: any) {
  const career = profile.career_interests?.[0] || 'College';
  const state = profile.state || 'National';

  return {
    scholarships: {
      tasks: progressStats.hasTranscript
        ? [{ title: "Attach transcript to scholarship applications", done: false }]
        : [{ title: "Upload your high school transcript to Vault", done: false }],
      deadlines: [
        { name: `${state} State Excellence Grant`, date: "14 Days", urgent: true }
      ],
      goals: [
        "Apply for 2 new scholarships this week",
        "Log in 5 days in a row"
      ]
    },
    essays: {
      tasks: progressStats.essaysCount > 0
        ? [{ title: "Review essay draft with AI", done: false }]
        : [{ title: "Finish your main essay outline", done: false }],
      deadlines: [],
      goals: [
        "Write 500 words of your draft"
      ]
    },
    colleges: {
      tasks: progressStats.savedCollegesCount > 0
        ? [{ title: "Compare admission requirements", done: false }]
        : [{ title: "Add 3 colleges to your saved list", done: false }],
      deadlines: [],
      goals: [
        "Research 2 universities program requirements"
      ]
    },
    stats: [
      { label: "Scholarships Matched", sub: "Total Matches", value: "12", color: "text-emerald-500", bg: "bg-emerald-50" },
      { label: "Applied Scholarship Applications", sub: "Submitted", value: String(progressStats.appliedScholarshipsCount), color: "text-blue-500", bg: "bg-blue-50" },
      { label: "Essays Drafted", sub: "Drafts", value: String(progressStats.essaysCount), color: "text-violet-500", bg: "bg-violet-50" },
      { label: "Colleges Saved", sub: "Shortlist", value: String(progressStats.savedCollegesCount), color: "text-amber-500", bg: "bg-amber-50" }
    ],
    tracker: [
      { name: `${state} State Excellence Grant`, status: "Not Started", deadline: "14 Days", progress: 0, urgent: true },
      { name: `Future ${career} Leaders Award`, status: "Not Started", deadline: "30 Days", progress: 0, urgent: false },
      { name: "First-Generation Scholarship", status: "Not Started", deadline: "45 Days", progress: 0, urgent: false }
    ],
    income_ideas: [
      { title: "Tutoring in your strong subjects", description: "Use your school GPA to tutor middle schoolers in math or science." },
      { title: "Freelance gigs online", description: "Offer services on Fiverr or Upwork based on your career interests." }
    ],
    suggested_colleges: [
      { name: `${state} State University`, reason: `Great program for ${career}`, match: "95%" },
      { name: "National Tech Institute", reason: "Strong financial aid opportunities", match: "88%" }
    ],
    essay_prompts: [
      { topic: "Overcoming a challenge", advice: "Focus on a time you showed resilience and leadership." },
      { topic: `Why ${career}?`, advice: "Be specific about what inspired you to pursue this field." }
    ],
    resume_tips: [
      "Use action verbs to describe your extracurriculars.",
      "Quantify your achievements (e.g., 'raised $500' instead of 'raised money')."
    ]
  };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let force = false;
    try {
      const body = await req.json();
      force = body.force;
    } catch (e) { }

    const { profile, documents: docs, essays, savedColleges, applications: apps, resume, masterId, completedActionItems } = await getStudentDashboardData(user.id);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const progressStats = {
      hasTranscript: docs.some(d => d.type === "transcript"),
      hasRecommendationLetter: docs.some(d => d.type === "recommendation_letter"),
      hasResume: docs.some(d => d.type === "resume"),
      documentsCount: docs.length,
      essaysCount: essays.length,
      completedEssaysCount: essays.filter(e => e.status === "completed").length,
      savedCollegesCount: savedColleges.length,
      appliedScholarshipsCount: apps.filter(a => a.status === "Submitted").length,
      savedScholarshipsCount: apps.length
    };

    // Calculate database-driven semantic states
    const states = calculateWorkflowStates({
      documents: docs,
      essays,
      savedColleges,
      applications: apps,
      resume,
      profile
    });

    const currentState = {
      ...states,
      firstName: profile.student_first_name || "",
      completedActionItemsCount: completedActionItems?.length || 0
    };

    const cachedData = profile.ai_dashboard_data;
    const cachedState = cachedData?._state;

    const isStateEqual = isDashboardStateEqual(currentState, cachedState);

    if (!force && cachedData && isStateEqual) {
      return NextResponse.json(cachedData);
    }

    // Compile dynamic priority checklist locally
    const localDashboard = compileDashboard({
      documents: docs,
      essays,
      savedColleges,
      applications: apps,
      resume,
      profile,
      completedActionItems
    });

    let generatedJson = null;

    try {
      const userPrompt = `
Student Profile:
${JSON.stringify(profile, null, 2)}

Current Platform Progress:
${JSON.stringify(progressStats, null, 2)}
      `;

      // Try OpenAI first since it is working well
      const responseText = await callAI({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: userPrompt,
        provider: 'openai',
        jsonMode: true
      });

      generatedJson = JSON.parse(responseText);
    } catch (err: any) {
      console.error('Error fetching from AI:', err.message);
    }

    // If AI failed use personalized fallback data
    if (!generatedJson) {
      console.log('Falling back to local generated data due to AI error.');
      generatedJson = getFallbackData(profile, progressStats);
    }

    // Merge JSearch/Admissions tips/ideas from AI with local progression logic
    generatedJson = {
      ...generatedJson,
      ...localDashboard
    };

    // Update stats count in fallback or generated json using database values
    if (generatedJson && generatedJson.stats) {
      const statsMap: Record<string, string> = {
        "Applied Scholarship Applications": String(progressStats.appliedScholarshipsCount),
        "Essays Drafted": String(progressStats.essaysCount),
        "Colleges Saved": String(progressStats.savedCollegesCount),
      };

      generatedJson.stats = generatedJson.stats.map((s: any) => {
        if (statsMap[s.label] !== undefined) {
          return { ...s, value: statsMap[s.label] };
        }
        return s;
      });
    }

    // Save to database
    await supabase
      .from('profiles')
      .update({ ai_dashboard_data: generatedJson })
      .eq('id', masterId);

    return NextResponse.json(generatedJson);
  } catch (error: any) {
    console.error('Error generating AI dashboard:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
