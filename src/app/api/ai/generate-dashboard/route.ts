import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callAI } from '@/lib/ai';

const SYSTEM_PROMPT = `You are the Schoolari AI, an expert scholarship and college admissions counselor.
Your job is to take a student's profile (including their GPA, state, career interests, ethnicity, financial need, and dashboard priorities) and generate a highly personalized action plan.

Respond STRICTLY in the following JSON format, with no markdown formatting or extra text:
{
  "tasks": [
    { "id": 1, "title": "...", "done": false },
    { "id": 2, "title": "...", "done": false },
    { "id": 3, "title": "...", "done": false }
  ],
  "goals": [
    "...", "...", "..."
  ],
  "stats": [
    { "label": "Matched", "sub": "Scholarships", "value": "12", "color": "text-emerald-500", "bg": "bg-emerald-50" },
    { "label": "Action", "sub": "Items", "value": "5", "color": "text-blue-500", "bg": "bg-blue-50" },
    { "label": "Essays", "sub": "To write", "value": "2", "color": "text-violet-500", "bg": "bg-violet-50" },
    { "label": "Colleges", "sub": "Saved", "value": "4", "color": "text-amber-500", "bg": "bg-amber-50" }
  ],
  "tracker": [
    { "name": "...", "status": "Not Started", "deadline": "14 Days", "progress": 0, "urgent": false },
    { "name": "...", "status": "Not Started", "deadline": "30 Days", "progress": 0, "urgent": false },
    { "name": "...", "status": "Not Started", "deadline": "45 Days", "progress": 0, "urgent": false }
  ],
  "income_ideas": [
    { "label": "...", "color": "text-emerald-500" },
    { "label": "...", "color": "text-blue-500" },
    { "label": "...", "color": "text-slate-500" }
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
}

Make sure the tasks, goals, tracker items (suggested specific scholarship names matching their profile), suggested colleges, essay prompts, resume tips, and income ideas are deeply tailored to their specific data. If they chose "Earning money now", suggest relevant side-hustles. If they chose "Writing essays", add an essay task and prompt. If they selected resume help, provide resume tips.`;

function getFallbackData(profile: any) {
  const career = profile.career_interests?.[0] || 'College';
  const state = profile.state || 'National';
  
  return {
    tasks: [
      { id: 1, title: `Complete your ${career} profile`, done: false },
      { id: 2, title: "Review your first 3 scholarship matches", done: false },
      { id: 3, title: "Upload your high school transcript", done: false }
    ],
    goals: [
      "Apply for 2 new scholarships this week",
      "Finish your main essay draft",
      "Log in 5 days in a row"
    ],
    stats: [
      { label: "Matched", sub: "Scholarships", value: "12", color: "text-emerald-500", bg: "bg-emerald-50" },
      { label: "Action", sub: "Items", value: "5", color: "text-blue-500", bg: "bg-blue-50" },
      { label: "Essays", sub: "To write", value: "2", color: "text-violet-500", bg: "bg-violet-50" },
      { label: "Colleges", sub: "Saved", value: "4", color: "text-amber-500", bg: "bg-amber-50" }
    ],
    tracker: [
      { name: `${state} State Excellence Grant`, status: "Not Started", deadline: "14 Days", progress: 0, urgent: false },
      { name: `Future ${career} Leaders Award`, status: "Not Started", deadline: "30 Days", progress: 0, urgent: false },
      { name: "First-Generation Scholarship", status: "Not Started", deadline: "45 Days", progress: 0, urgent: false }
    ],
    income_ideas: [
      { label: "Tutoring in your strong subjects", color: "text-emerald-500" },
      { label: "Freelance gigs online", color: "text-blue-500" },
      { label: "Local part-time work", color: "text-slate-500" }
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let force = false;
    try {
      const body = await req.json();
      force = body.force;
    } catch (e) {}

    if (!force && profile.ai_dashboard_data) {
      return NextResponse.json(profile.ai_dashboard_data);
    }

    let generatedJson = null;

    try {
      // Use Claude because OpenAI quota is currently exhausted
      const responseText = await callAI({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: JSON.stringify(profile, null, 2),
        provider: 'claude', 
        jsonMode: true
      });
      
      generatedJson = JSON.parse(responseText);
    } catch (err: any) {
      console.error('Error fetching from AI:', err.message);
    }

    // If AI failed use personalized fallback data
    if (!generatedJson) {
      console.log('Falling back to local generated data due to AI error.');
      generatedJson = getFallbackData(profile);
    }

    // Save to database
    await supabase
      .from('profiles')
      .update({ ai_dashboard_data: generatedJson })
      .eq('id', user.id);

    return NextResponse.json(generatedJson);
  } catch (error: any) {
    console.error('Error generating AI dashboard:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
