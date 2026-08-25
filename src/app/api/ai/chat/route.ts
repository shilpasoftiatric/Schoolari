import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getStudentDashboardData } from "@/services/data-fetcher";
import { enforceAiLimit, recordAiSpend, getUserAiUsage } from "@/lib/ai-limits";
import { prepareSchoolariAIContext } from "@/app/actions/ask-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to chat with Schoolari AI." },
        { status: 401 }
      );
    }

    const { messages, sessionId } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid messages payload." },
        { status: 400 }
      );
    }

    const { masterId } = await getStudentDashboardData(user.id);

    // 1. Enforce Limits & Monthly Budget Cap
    try {
      await enforceAiLimit("ask_ai", masterId);
    } catch (limitErr: any) {
      return NextResponse.json(
        { error: limitErr.message || "Monthly AI limit reached." },
        { status: 403 }
      );
    }

    let limitReached = false;
    let resetDate = "the 1st of next month";
    try {
      const usageInfo = await getUserAiUsage(user.id);
      if (usageInfo) {
        limitReached = usageInfo.ask_ai.used >= usageInfo.ask_ai.limit;
        resetDate = usageInfo.resetDate;
      }
    } catch (usageErr) {
      console.warn("[POST /api/ai/chat] Failed to check post-enforce limit:", usageErr);
    }

    // 2. Prepare Verified Student Context & Intent Tools
    const context = await prepareSchoolariAIContext(
      user.id,
      masterId,
      messages,
      sessionId
    );
    const activeSessionId = context.currentSessionId;

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Claude API key is not configured." },
        { status: 500 }
      );
    }

    // 3. Connect to Claude Stream
    const model = "claude-sonnet-4-6";
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        system: context.systemPrompt,
        messages: [{ role: "user", content: context.userPrompt }],
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error("[streamAskSchoolariAI] Claude Error:", errText);
      return NextResponse.json(
        { error: "Failed to connect to Claude AI. Please try again." },
        { status: 500 }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder("utf-8");

    let fullAssistantText = "";
    let inputTokens = 0;
    let outputTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = claudeRes.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ")) continue;
              const jsonStr = trimmed.slice(6);
              if (jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr);

                // Track input token usage
                if (parsed.type === "message_start" && parsed.message?.usage) {
                  inputTokens = parsed.message.usage.input_tokens || 0;
                }

                // Stream token text delta directly as SSE data
                if (
                  parsed.type === "content_block_delta" &&
                  parsed.delta?.type === "text_delta" &&
                  parsed.delta?.text
                ) {
                  const textDelta = parsed.delta.text;
                  fullAssistantText += textDelta;
                  const sseChunk = `data: ${JSON.stringify({ text: textDelta })}\n\n`;
                  controller.enqueue(encoder.encode(sseChunk));
                }

                // Track output token usage
                if (parsed.type === "message_delta" && parsed.usage) {
                  outputTokens = parsed.usage.output_tokens || 0;
                }
              } catch (_) {
                // Ignore parse errors on partial chunks
              }
            }
          }

          // Send finish event with session ID and limit details
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                sessionId: activeSessionId,
                limitReached,
                resetDate
              })}\n\n`
            )
          );
        } catch (streamErr) {
          console.error("[streamAskSchoolariAI] Stream read error:", streamErr);
          controller.error(streamErr);
        } finally {
          controller.close();

          // Save assistant message and log costs
          try {
            const inputCost = (inputTokens / 1_000_000) * 3.0;
            const outputCost = (outputTokens / 1_000_000) * 15.0;
            const totalCost = inputCost + outputCost;

            console.log(`
┌───────────────────────────────────────────────────────────────┐
│ 🤖 Ask Schoolari AI (Live Streamed)                           │
├───────────────────────────────────────────────────────────────┤
│ Provider:       CLAUDE (${model})                             │
│ Input Tokens:   ${inputTokens.toLocaleString()} tokens        │
│ Output Tokens:  ${outputTokens.toLocaleString()} tokens       │
│ Total Cost:     $${totalCost.toFixed(6)} USD                  │
└───────────────────────────────────────────────────────────────┘`);

            if (totalCost > 0) {
              await recordAiSpend(totalCost, masterId);
            }

            if (fullAssistantText) {
              const supabaseAdmin = await createAdminClient();
              await supabaseAdmin.from("ai_chat_messages").insert({
                user_id: masterId,
                role: "assistant",
                content: fullAssistantText,
                session_id: activeSessionId || null,
              });
            }
          } catch (persistErr) {
            console.warn(
              "[streamAskSchoolariAI] Failed to record spend or message:",
              persistErr
            );
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Session-Id": activeSessionId || "",
      },
    });
  } catch (err: any) {
    console.error("[POST /api/ai/chat] Fatal error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
