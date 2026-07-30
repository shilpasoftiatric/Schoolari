export type AIProvider = 'openai' | 'claude';

export interface AICallOptions {
  systemPrompt: string;
  userPrompt: string;
  provider?: AIProvider;
  jsonMode?: boolean;
  temperature?: number;
}

export async function callAI({ systemPrompt, userPrompt, provider = 'claude', jsonMode = false, temperature }: AICallOptions): Promise<string> {
  if (provider === 'claude') {
    try {
      return await callClaude(systemPrompt, userPrompt, temperature);
    } catch (err: any) {
      console.warn(`Claude API failed (${err.message || err}). Falling back to OpenAI...`);
      return await callOpenAI(systemPrompt, userPrompt, jsonMode, temperature);
    }
  } else if (provider === 'openai') {
    try {
      return await callOpenAI(systemPrompt, userPrompt, jsonMode, temperature);
    } catch (err: any) {
      console.warn(`OpenAI API failed (${err.message || err}). Falling back to Claude...`);
      return await callClaude(systemPrompt, userPrompt, temperature);
    }
  }
  throw new Error(`Unsupported AI provider: ${provider}`);
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
