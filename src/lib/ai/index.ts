import { cookies } from "next/headers";
import { recordAiSpend } from "@/lib/ai-limits";

export type AIProvider = 'openai' | 'claude';

export interface AICallOptions {
  systemPrompt: string;
  userPrompt: string;
  provider?: AIProvider;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  label?: string;
  targetUserId?: string;
}

// Pricing rates per million tokens (USD)
const PRICING = {
  claude: {
    inputPerMillion: 3.00,  // $3.00 / 1M input tokens
    outputPerMillion: 15.00, // $15.00 / 1M output tokens
  },
  openai: {
    inputPerMillion: 2.50,  // $2.50 / 1M input tokens
    outputPerMillion: 10.00, // $10.00 / 1M output tokens
  },
};

/**
 * Logs token usage and dollar cost to the terminal in a clean, high-visibility box.
 */
function logTokenUsageAndCost({
  provider,
  model,
  inputTokens,
  outputTokens,
  label = "Schoolari AI Request",
}: {
  provider: "claude" | "openai";
  model: string;
  inputTokens: number;
  outputTokens: number;
  label?: string;
}): number {
  const rates = PRICING[provider];
  const inputCost = (inputTokens / 1_000_000) * rates.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * rates.outputPerMillion;
  const totalCost = inputCost + outputCost;
  const totalTokens = inputTokens + outputTokens;

  console.log(`
┌───────────────────────────────────────────────────────────────┐
│ 🤖 ${label.padEnd(59)}│
├───────────────────────────────────────────────────────────────┤
│ Provider:       ${provider.toUpperCase()} (${model})`.padEnd(64) + `│
│ Input Tokens:   ${inputTokens.toLocaleString()} tokens`.padEnd(64) + `│
│ Output Tokens:  ${outputTokens.toLocaleString()} tokens`.padEnd(64) + `│
│ Total Tokens:   ${totalTokens.toLocaleString()} tokens`.padEnd(64) + `│
├───────────────────────────────────────────────────────────────┤
│ Input Cost:     $${inputCost.toFixed(6)} USD`.padEnd(64) + `│
│ Output Cost:    $${outputCost.toFixed(6)} USD`.padEnd(64) + `│
│ 💰 TOTAL COST:  $${totalCost.toFixed(6)} USD (~$${totalCost.toFixed(4)})`.padEnd(64) + `│
└───────────────────────────────────────────────────────────────┘`);

  return totalCost;
}

export async function callAI({
  systemPrompt,
  userPrompt,
  provider = 'claude',
  jsonMode = false,
  temperature,
  maxTokens = 1500,
  label = "Schoolari AI Engine",
  targetUserId,
}: AICallOptions): Promise<string> {
  let responseText: string;
  if (provider === 'claude') {
    try {
      responseText = await callClaude(systemPrompt, userPrompt, temperature, maxTokens, label, targetUserId);
    } catch (err: any) {
      console.warn(`Claude API failed (${err.message || err}). Falling back to OpenAI...`);
      responseText = await callOpenAI(systemPrompt, userPrompt, jsonMode, temperature, maxTokens, label, targetUserId);
    }
  } else if (provider === 'openai') {
    try {
      responseText = await callOpenAI(systemPrompt, userPrompt, jsonMode, temperature, maxTokens, label, targetUserId);
    } catch (err: any) {
      console.warn(`OpenAI API failed (${err.message || err}). Falling back to Claude...`);
      responseText = await callClaude(systemPrompt, userPrompt, temperature, maxTokens, label, targetUserId);
    }
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  if (jsonMode) {
    responseText = cleanJsonString(responseText);
  }
  return responseText;
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  jsonMode: boolean,
  temperature?: number,
  maxTokens: number = 1500,
  label?: string,
  targetUserId?: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const model = "gpt-4o";
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens,
      ...(jsonMode && { response_format: { type: "json_object" } }),
      temperature: temperature !== undefined ? temperature : 0.7
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API Error: ${err}`);
  }

  const data = await response.json();
  const inputTokens = data.usage?.prompt_tokens || 0;
  const outputTokens = data.usage?.completion_tokens || 0;

  const cost = logTokenUsageAndCost({
    provider: "openai",
    model,
    inputTokens,
    outputTokens,
    label,
  });

  if (cost > 0) {
    recordAiSpend(cost, targetUserId).catch((e) =>
      console.warn("Failed to record OpenAI spend:", e)
    );
  }

  return data.choices[0].message.content;
}

async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  temperature?: number,
  maxTokens: number = 1500,
  label?: string,
  targetUserId?: string
): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("CLAUDE_API_KEY is not set");

  try {
    const cookieStore = await cookies();
    cookieStore.set("claude-api-hit", Date.now().toString(), { path: "/" });
  } catch (e) {
    // Ignore if cookies cannot be set (e.g. in a read-only context)
  }

  const model = "claude-sonnet-4-6";
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
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
  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;

  const cost = logTokenUsageAndCost({
    provider: "claude",
    model,
    inputTokens,
    outputTokens,
    label,
  });

  if (cost > 0) {
    recordAiSpend(cost, targetUserId).catch((e) =>
      console.warn("Failed to record Claude spend:", e)
    );
  }

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
