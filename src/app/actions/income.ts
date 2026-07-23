"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { callAI } from "@/lib/ai";

// ─────────────────────────────────────────
// INCOME GOALS CRUD
// ─────────────────────────────────────────

export async function getIncomeGoals() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("income_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function addIncomeGoal(hustleTitle: string, targetAmount: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("income_goals")
    .insert([{ 
      user_id: user.id, 
      hustle_title: hustleTitle, 
      target_amount: targetAmount,
      earned_amount: 0
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  revalidatePath("/income");
  return data;
}

export async function updateEarnedAmount(id: string, newAmount: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("income_goals")
    .update({ earned_amount: newAmount, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/income");
  return { success: true };
}

export async function deleteIncomeGoal(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("income_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/income");
  return { success: true };
}

// ─────────────────────────────────────────
// AI INCOME IDEA GENERATOR
// ─────────────────────────────────────────

export async function generateIncomeIdeas(age: string, skills: string, location: string) {
  const systemPrompt = `You are a career and financial advisor for students.
Generate exactly 3 creative, highly actionable "side hustle" ideas that this specific student can start right now to earn money. 
For each idea, provide a practical title and a 2-3 sentence explanation of exactly how to start, how much they can expect to earn, and what free/cheap tools they need.

Format the output strictly as a JSON array of objects with keys: "title", "description", "potential_earnings", "startup_tools".
Example: 
[
  {
    "title": "Local Math Tutoring",
    "description": "Start by offering math tutoring to middle schoolers in your neighborhood...",
    "potential_earnings": "$15 - $25 per hour",
    "startup_tools": "Canva (for flyers), Nextdoor App"
  }
]

Do not include markdown blocks or any other text outside the JSON array.`;

  const userPrompt = `The student is ${age} years old, located in a ${location} area, and has the following skills/interests: "${skills}".`;

  try {
    const content = await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude",
      jsonMode: true,
    });

    // Attempt to parse JSON safely
    try {
      // Strip markdown block if it accidentally included it
      const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse AI JSON response", content);
      throw new Error("Failed to generate ideas. Please try again.");
    }
  } catch (error: any) {
    throw new Error(error.message || "Failed to communicate with AI");
  }
}

// ─────────────────────────────────────────
// EARN WHILE YOU LEARN — Video Progress
// ─────────────────────────────────────────

export async function markVideoInProgress(videoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("linked_student_id").eq("id", user.id).single();
  const masterId = profile?.linked_student_id || user.id;

  const { data: existing } = await supabase
    .from("student_video_progress")
    .select("id")
    .eq("user_id", masterId)
    .eq("video_id", videoId)
    .single();

  if (!existing) {
    await supabase.from("student_video_progress").insert([{
      user_id: masterId,
      video_id: videoId,
      status: "in_progress"
    }]);
    revalidatePath("/income");
    revalidatePath(`/income/watch/${videoId}`);
  }
}

export async function saveVideoPlaybackState(videoId: string, seconds: number, percentage: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("linked_student_id").eq("id", user.id).single();
  const masterId = profile?.linked_student_id || user.id;

  const { data: existing } = await supabase
    .from("student_video_progress")
    .select("id, status")
    .eq("user_id", masterId)
    .eq("video_id", videoId)
    .single();

  if (existing) {
    // Only update if not already completed (or we can just update it anyway)
    if (existing.status !== "completed") {
      await supabase.from("student_video_progress").update({
        last_position_seconds: seconds,
        progress_percentage: percentage,
        status: "in_progress"
      }).eq("id", existing.id);
    }
  } else {
    await supabase.from("student_video_progress").insert([{
      user_id: masterId,
      video_id: videoId,
      status: "in_progress",
      last_position_seconds: seconds,
      progress_percentage: percentage
    }]);
  }
}

export async function markVideoComplete(videoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("linked_student_id").eq("id", user.id).single();
  const masterId = profile?.linked_student_id || user.id;

  const { data: existing } = await supabase
    .from("student_video_progress")
    .select("id")
    .eq("user_id", masterId)
    .eq("video_id", videoId)
    .single();

  if (existing) {
    await supabase.from("student_video_progress").update({
      status: "completed",
      progress_percentage: 100,
      completed_at: new Date().toISOString()
    }).eq("id", existing.id);
  } else {
    await supabase.from("student_video_progress").insert([{
      user_id: masterId,
      video_id: videoId,
      status: "completed",
      progress_percentage: 100,
      completed_at: new Date().toISOString()
    }]);
  }

  // Insert Action Items into global Dashboard Task Engine
  const { data: actionItems } = await supabase
    .from("earn_video_action_items")
    .select("title")
    .eq("video_id", videoId)
    .order("sort_order", { ascending: true });

  if (actionItems && actionItems.length > 0) {
    const newTasks = actionItems.map((item) => ({
      user_id: masterId,
      title: item.title,
      description: "From Earn While You Learn",
      status: "pending" as const,
      type: "weekly" as const
    }));
    await supabase.from("tasks").insert(newTasks);
  }
  revalidatePath("/income");
  revalidatePath(`/income/watch/${videoId}`);
}
