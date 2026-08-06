import { cookies } from "next/headers";

export type AIProvider = 'openai' | 'claude';

export interface AICallOptions {
  systemPrompt: string;
  userPrompt: string;
  provider?: AIProvider;
  jsonMode?: boolean;
  temperature?: number;
}

export async function callAI({ systemPrompt, userPrompt, provider = 'claude', jsonMode = false, temperature }: AICallOptions): Promise<string> {
  let responseText: string;
  if (provider === 'claude') {
    try {
      responseText = await callClaude(systemPrompt, userPrompt, temperature);
    } catch (err: any) {
      console.warn(`Claude API failed (${err.message || err}). Falling back to OpenAI...`);
      responseText = await callOpenAI(systemPrompt, userPrompt, jsonMode, temperature);
    }
  } else if (provider === 'openai') {
    try {
      responseText = await callOpenAI(systemPrompt, userPrompt, jsonMode, temperature);
    } catch (err: any) {
      console.warn(`OpenAI API failed (${err.message || err}). Falling back to Claude...`);
      responseText = await callClaude(systemPrompt, userPrompt, temperature);
    }
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  if (jsonMode) {
    responseText = cleanJsonString(responseText);
  }
  return responseText;
}

async function callOpenAI(systemPrompt: string, userPrompt: string, jsonMode: boolean, temperature?: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      ...(jsonMode && { response_format: { type: "json_object" } }),
      temperature: temperature !== undefined ? temperature : 0.7
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API Error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callClaude(systemPrompt: string, userPrompt: string, temperature?: number): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("CLAUDE_API_KEY is not set");

  try {
    const cookieStore = await cookies();
    cookieStore.set("claude-api-hit", Date.now().toString(), { path: "/" });
  } catch (e) {
    // Ignore if cookies cannot be set (e.g. in a read-only context)
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      temperature: temperature !== undefined ? temperature : 0.7
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API Error: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

function cleanJsonString(str: string): string {
  const firstBrace = str.indexOf('{');
  const firstBracket = str.indexOf('[');
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = str.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = str.lastIndexOf(']');
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return str.substring(startIdx, endIdx + 1).trim();
  }

  return str.replace(/```(?:json)?/g, '').trim();
}
