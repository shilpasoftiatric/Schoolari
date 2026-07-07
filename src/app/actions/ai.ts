"use server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function generateBrainstorm(topic: string) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const prompt = `You are an expert college admissions and scholarship counselor. 
The student has provided the following topic for their essay: "${topic}"

Provide a brainstorm consisting of:
1. 3 unique angles or ideas to approach this topic.
2. A high-level outline (Introduction, Body Paragraphs, Conclusion).
3. 2 examples of strong opening hooks for this essay.

Format the output nicely using Markdown. Be encouraging and concise.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Using the fast/cheap model for quick brainstorms
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error("Brainstorm Error:", error);
    throw new Error("Failed to generate brainstorm.");
  }
}

export async function reviewEssay(content: string) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const prompt = `You are an expert college admissions essay editor. 
Review the following draft essay and provide actionable feedback. Focus on:
1. Grammar and spelling corrections.
2. Clarity and flow.
3. Suggestions for stronger wording.
4. Overall impact of the essay.

Do not rewrite the essay for the student. Instead, point out specific areas of improvement and explain why.
Format your response in Markdown.

Draft Essay:
"""
${content}
"""`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // Using the stronger model for detailed review
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error("Review Error:", error);
    throw new Error("Failed to review essay.");
  }
}
