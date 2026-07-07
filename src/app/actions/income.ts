"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === "your_openai_api_key_here") {
    throw new Error("MISSING_API_KEY");
  }

  const prompt = `
You are a career and financial advisor for students. The student is ${age} years old, located in a ${location} area, and has the following skills/interests: "${skills}".

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

Do not include markdown blocks or any other text outside the JSON array.
  `;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Use faster, cheaper model for this
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const content = data.choices[0].message.content.trim();
    
    // Attempt to parse JSON safely
    try {
      // Strip markdown block if it accidentally included it
      const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse OpenAI JSON response", content);
      throw new Error("Failed to generate ideas. Please try again.");
    }
  } catch (error: any) {
    throw new Error(error.message || "Failed to communicate with OpenAI");
  }
}
