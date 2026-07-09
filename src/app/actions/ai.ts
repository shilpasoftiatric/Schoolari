"use server";

import { callAI } from "@/lib/ai";

export async function generateBrainstorm(topic: string) {
  const systemPrompt = `You are an expert college admissions and scholarship counselor. 
Provide a brainstorm consisting of:
1. 3 unique angles or ideas to approach this topic.
2. A high-level outline (Introduction, Body Paragraphs, Conclusion).
3. 2 examples of strong opening hooks for this essay.

Format the output nicely using Markdown. Be encouraging and concise.`;

  const userPrompt = `The student has provided the following topic for their essay: "${topic}"`;

  try {
    return await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude",
    });
  } catch (error: any) {
    console.error("Brainstorm Error:", error);
    throw new Error("Failed to generate brainstorm.");
  }
}

export async function reviewEssay(content: string) {
  const systemPrompt = `You are an expert college admissions essay editor. 
Review the draft essay and provide actionable feedback. Focus on:
1. Grammar and spelling corrections.
2. Clarity and flow.
3. Suggestions for stronger wording.
4. Overall impact of the essay.

The essay AI must NEVER write essays for students. Many scholarships prohibit AI-written essays.
The AI is a coach and thinking partner — not a ghostwriter. Do not rewrite the essay for the student.
Instead, point out specific areas of improvement and explain why.
Format your response in Markdown.`;

  const userPrompt = `Draft Essay:
"""
${content}
"""`;

  try {
    return await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude",
    });
  } catch (error: any) {
    console.error("Review Error:", error);
    throw new Error("Failed to review essay.");
  }
}

export async function optimizeResumeBullet(description: string) {
  const systemPrompt = `You are a professional resume writer and career coach.
Your job is to rewrite a student's plain, basic work or extracurricular activity description into professional, high-impact resume bullets.
Rules:
1. Use strong action verbs (e.g. Led, Facilitated, Developed, Optimized).
2. Quantify results where possible (if they don't provide numbers, structure it so numbers can be easily inserted, e.g. "increasing engagement by [X] percent").
3. Make it concise and fit standard resume bullet guidelines.
4. Return ONLY the rewritten description or bullet list. Do not include introductory or concluding text. Just return the optimized text itself.`;

  const userPrompt = `Plain Description: "${description}"`;

  try {
    return await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude",
    });
  } catch (error: any) {
    console.error("Optimize Bullet Error:", error);
    throw new Error("Failed to optimize resume bullet.");
  }
}
