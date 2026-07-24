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

export async function generateFirstDraftEssay(data: {
  type: string;
  title: string;
  prompt: string;
  wordLimit?: string;
  answers: Record<string, string>;
}) {
  const systemPrompt = `You are an expert college admissions essay coach.
Your task is to synthesize a student's raw interview answers into a structured, highly compelling essay draft.
STRICT GUIDELINES:
1. Use ONLY the factual information, experiences, achievements, and personal stories provided in the student's answers.
2. Write in the student's authentic, natural voice.
3. Frame the essay clearly as a "FIRST DRAFT — Not a Final Product" in the header commentary.
4. Strictly respect any word/character count limits provided by the student.
5. Provide a well-structured essay with an engaging opening hook, coherent body paragraphs, and a memorable concluding reflection.
6. Return ONLY the essay draft text preceded by a brief 2-line header banner.`;

  const userPrompt = `Application Type: ${data.type}
Target Application / Entity: ${data.title}
Essay Prompt: ${data.prompt}
Word/Character Limit: ${data.wordLimit || "Not specified"}

Student Interview Q&A Content:
${Object.entries(data.answers)
  .map(([q, a]) => `Q: ${q}\nA: ${a}`)
  .join("\n\n")}`;

  try {
    return await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude",
    });
  } catch (error: any) {
    console.error("Generate First Draft Essay Error:", error);
    throw new Error("Failed to generate first draft essay.");
  }
}

export async function refineEssayDraft(content: string, instruction: string) {
  const systemPrompt = `You are a skilled essay editor.
Refine the provided essay draft based strictly on the student's specific instruction.
Rules:
1. Maintain all original factual details, personal experiences, and authentic tone.
2. Adjust the focus, tone, or emphasis as requested.
3. Keep it framed as a draft.
4. Return ONLY the revised essay text.`;

  const userPrompt = `Student Instruction: "${instruction}"

Current Essay Draft:
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
    console.error("Refine Essay Error:", error);
    throw new Error("Failed to refine essay.");
  }
}

export async function improveEssayDraft(content: string) {
  const systemPrompt = `You are an expert copyeditor for college and scholarship essays.
Polish the provided essay draft for grammar, spelling, clarity, flow, and sentence variety.
Rules:
1. Preserve the student's unique voice and all facts.
2. Fix all typos, grammatical mistakes, awkward phrasing, and passive voice where appropriate.
3. Return ONLY the improved essay text without extra commentary.`;

  const userPrompt = `Current Essay Draft:
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
    console.error("Improve Essay Error:", error);
    throw new Error("Failed to improve essay.");
  }
}
