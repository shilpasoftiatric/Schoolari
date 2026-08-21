"use server";

import { callAI } from "@/lib/ai";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getStudentDashboardData } from "@/services/data-fetcher";
import {
  getStudentProfileContext,
  searchScholarshipsTool,
  getDashboardPrioritiesTool,
  getApplicationStatusTool,
  getLiveCoachingContext,
  getLiveIncomeContext,
  getLiveJobsContext,
  type StudentProfileContext,
} from "@/lib/ai/agent-tools";
import {
  getRelevantPlatformKnowledge,
  formatPlatformKnowledgeForPrompt,
} from "@/lib/ai/platform-knowledge";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SavedAIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sessionId?: string | null;
}

export interface AIChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetches all saved AI chat sessions for the authenticated student or linked parent.
 */
export async function getAIChatSessions(): Promise<AIChatSession[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { masterId } = await getStudentDashboardData(user.id);
    const supabaseAdmin = await createAdminClient();

    const { data: sessions, error } = await supabaseAdmin
      .from("ai_chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", masterId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("[getAIChatSessions] Could not fetch sessions from DB:", error.message);
      return [];
    }

    return (sessions || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  } catch (err) {
    console.error("[getAIChatSessions] Error:", err);
    return [];
  }
}

/**
 * Creates a new AI chat session with a title.
 */
export async function createAIChatSession(title: string): Promise<AIChatSession | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { masterId } = await getStudentDashboardData(user.id);
    const supabaseAdmin = await createAdminClient();

    const cleanedTitle = title.replace(/\s+/g, " ").trim().slice(0, 80) || "New Chat";

    const { data: session, error } = await supabaseAdmin
      .from("ai_chat_sessions")
      .insert({
        user_id: masterId,
        title: cleanedTitle,
      })
      .select("id, title, created_at, updated_at")
      .single();

    if (error || !session) {
      console.warn("[createAIChatSession] Error creating session:", error);
      return null;
    }

    return {
      id: session.id,
      title: session.title,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    };
  } catch (err) {
    console.error("[createAIChatSession] Error:", err);
    return null;
  }
}

/**
 * Deletes an AI chat session and all its messages.
 */
export async function deleteAIChatSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { masterId } = await getStudentDashboardData(user.id);
    const supabaseAdmin = await createAdminClient();

    try {
      await supabaseAdmin
        .from("ai_chat_messages")
        .delete()
        .eq("user_id", masterId)
        .eq("session_id", sessionId);
    } catch (_) {}

    const { error } = await supabaseAdmin
      .from("ai_chat_sessions")
      .delete()
      .eq("user_id", masterId)
      .eq("id", sessionId);

    if (error) {
      console.warn("[deleteAIChatSession] Could not delete session:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[deleteAIChatSession] Error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches saved AI chat messages for a specific session (or general history).
 */
export async function getAIChatHistory(sessionId?: string): Promise<SavedAIMessage[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { masterId } = await getStudentDashboardData(user.id);
    const supabaseAdmin = await createAdminClient();

    let query = supabaseAdmin
      .from("ai_chat_messages")
      .select("id, role, content, created_at, session_id")
      .eq("user_id", masterId);

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data: messages, error } = await query.order("created_at", { ascending: true });

    if (error) {
      console.warn("[getAIChatHistory] Could not fetch chat history:", error.message);
      return [];
    }

    return (messages || []).map((m: any) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      createdAt: m.created_at,
      sessionId: m.session_id,
    }));
  } catch (err) {
    console.error("[getAIChatHistory] Error:", err);
    return [];
  }
}

/**
 * Clears all AI chat messages for the workspace.
 */
export async function clearAIChatHistory(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { masterId } = await getStudentDashboardData(user.id);
    const supabaseAdmin = await createAdminClient();

    try {
      await supabaseAdmin.from("ai_chat_messages").delete().eq("user_id", masterId);
      await supabaseAdmin.from("ai_chat_sessions").delete().eq("user_id", masterId);
    } catch (_) {}

    return { success: true };
  } catch (err: any) {
    console.error("[clearAIChatHistory] Error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Detects user intent based on the conversation and last user message.
 */
function detectIntent(userQuery: string, historySummary: string): {
  isScholarshipSearch: boolean;
  isDashboardPriorities: boolean;
  isApplicationStatus: boolean;
  isCollegeSearch: boolean;
} {
  const q = userQuery.toLowerCase().trim();

  const isScholarshipSearch =
    q.includes("scholarship") ||
    q.includes("grant") ||
    q.includes("financial aid") ||
    q.includes("free money") ||
    q.includes("match my profile") ||
    q.includes("which one should i apply") ||
    q.includes("apply for first");

  const isDashboardPriorities =
    q.includes("what should i do") ||
    q.includes("today") ||
    q.includes("my tasks") ||
    q.includes("priorities") ||
    q.includes("next step") ||
    q.includes("what next") ||
    q.includes("milestone") ||
    q.includes("my progress");

  const isApplicationStatus =
    q.includes("my applications") ||
    q.includes("what have i applied") ||
    q.includes("tracked") ||
    q.includes("tracker status");

  const isCollegeSearch =
    q.includes("college") ||
    q.includes("university") ||
    q.includes("safeties") ||
    q.includes("targets") ||
    q.includes("reaches") ||
    q.includes("dream school");

  return {
    isScholarshipSearch,
    isDashboardPriorities,
    isApplicationStatus,
    isCollegeSearch,
  };
}

/**
 * Context-Aware Ask Schoolari AI Agent Orchestrator.
 */
export async function askSchoolariAI(
  messages: ChatMessage[],
  sessionId?: string
): Promise<{ text?: string; sessionId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Please log in to chat with Schoolari AI." };
    }

    const { masterId } = await getStudentDashboardData(user.id);
    const supabaseAdmin = await createAdminClient();

    const lastUserMessage = messages[messages.length - 1]?.content || "";

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      // Create a session automatically using the initial user message
      const cleanedTitle = lastUserMessage.replace(/\s+/g, " ").trim().slice(0, 80) || "New Chat";
      try {
        const { data: newSession } = await supabaseAdmin
          .from("ai_chat_sessions")
          .insert({
            user_id: masterId,
            title: cleanedTitle,
          })
          .select("id")
          .single();
        if (newSession) {
          currentSessionId = newSession.id;
        }
      } catch (sessErr) {
        console.warn("[askSchoolariAI] Could not create session:", sessErr);
      }
    } else {
      // Update session timestamp
      try {
        await supabaseAdmin
          .from("ai_chat_sessions")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", currentSessionId);
      } catch (_) {}
    }

    // Save user message to database using masterId (shared student / parent space)
    try {
      await supabaseAdmin.from("ai_chat_messages").insert({
        user_id: masterId,
        role: "user",
        content: lastUserMessage,
        session_id: currentSessionId || null,
      });
    } catch (dbErr) {
      console.warn("[askSchoolariAI] Failed to save user message to DB:", dbErr);
    }

    // 1. Fetch verified student profile context (server-authorized)
    const profile = await getStudentProfileContext(user.id);

    // 2. Detect Intent & Execute Authoritative Backend Tools
    const recentHistoryText = messages
      .slice(-4)
      .map((m) => `${m.role}: ${m.content}`)
      .join(" ");

    const intent = detectIntent(lastUserMessage, recentHistoryText);
    let toolDataSection = "";

    // A. Platform Knowledge Base Integration: check if query asks about any Schoolari feature/page
    const matchedFeatures = getRelevantPlatformKnowledge(lastUserMessage + " " + recentHistoryText);
    if (matchedFeatures.length > 0) {
      toolDataSection += `\n\n${formatPlatformKnowledgeForPrompt(matchedFeatures)}`;

      // Inject live feature data if relevant
      for (const feature of matchedFeatures) {
        if (feature.id === "coaching") {
          try {
            const coachingData = await getLiveCoachingContext(user.id);
            if (coachingData.upcomingSessions.length > 0) {
              const sessionList = coachingData.upcomingSessions
                .map((s) => `- ${s.title} (${s.sessionType}) on ${s.date}${s.isEnrolled ? " [ENROLLED]" : ""}`)
                .join("\n");
              toolDataSection += `\n\n=== LIVE UPCOMING COACHING SESSIONS ===\n${sessionList}\n=== END COACHING SESSIONS ===`;
            }
          } catch (err) {
            console.error("[askSchoolariAI] Live coaching context error:", err);
          }
        } else if (feature.id === "income") {
          try {
            const incomeData = await getLiveIncomeContext(user.id);
            toolDataSection += `\n\n=== LIVE EARN WHILE YOU LEARN HUB STATUS ===
Available Categories: ${incomeData.categories.join(", ") || "General Skill-Building, Freelance, Tech, Work-Study"}
Total Video Lessons: ${incomeData.totalVideos}
Student Completed Lessons: ${incomeData.completedCount}
=== END INCOME STATUS ===`;
          } catch (err) {
            console.error("[askSchoolariAI] Live income context error:", err);
          }
        } else if (feature.id === "jobs") {
          try {
            const jobsData = await getLiveJobsContext(user.id);
            if (jobsData.savedJobs.length > 0) {
              const jobList = jobsData.savedJobs
                .map((j) => `- ${j.title} at ${j.company} (Status: ${j.status})`)
                .join("\n");
              toolDataSection += `\n\n=== STUDENT'S SAVED JOBS & INTERNSHIPS ===\n${jobList}\n=== END SAVED JOBS ===`;
            }
          } catch (err) {
            console.error("[askSchoolariAI] Live jobs context error:", err);
          }
        }
      }
    }

    // B. Execute Scholarship Tool if intent matches
    if (intent.isScholarshipSearch) {
      try {
        const scholarshipResults = await searchScholarshipsTool(user.id, lastUserMessage);
        if (scholarshipResults.results.length > 0) {
          const list = scholarshipResults.results.map((s, idx) => {
            return `${idx + 1}. **${s.name}** (${s.organization})
   - Award Amount: ${s.awardAmount}
   - Deadline: ${s.deadline}
   - Match Score: ${s.matchScore}/100
   - Why it matches: ${s.matchReason}
   - Category: ${s.category}`;
          }).join("\n\n");

          toolDataSection += `\n\n=== VERIFIED SCHOLARSHIP SEARCH RESULTS (FROM SCHOOLARI DATABASE) ===
Total Eligible Scholarships in Database: ${scholarshipResults.totalEligibleFound}
Top Matched Scholarships for this Student:
${list}
${scholarshipResults.isFallback ? "\nNote: These are verified open/general scholarships because 0 strict niche filters were met." : ""}
=== END SCHOLARSHIP RESULTS ===`;
        }
      } catch (toolErr) {
        console.error("[askSchoolariAI] Scholarship tool error:", toolErr);
      }
    }

    // C. Execute Dashboard Priorities Tool if intent matches
    if (intent.isDashboardPriorities) {
      try {
        const prioritiesData = await getDashboardPrioritiesTool(user.id);
        if (prioritiesData) {
          const priorityList = prioritiesData.todayPriorities
            .map((p, i) => `${i + 1}. [${p.done ? "COMPLETED" : "PENDING"}] ${p.title} (${p.category})`)
            .join("\n");

          const deadlineList = prioritiesData.upcomingDeadlines
            .map((d) => `- ${d.title}: Due ${d.date} (${d.daysLeft} days left)`)
            .join("\n");

          toolDataSection += `\n\n=== VERIFIED STUDENT DASHBOARD & PRIORITIES (FROM SCHOOLARI ENGINE) ===
- Overall College Journey Progress: ${prioritiesData.progressPercentage}%
- Current Milestone: ${prioritiesData.milestoneTitle}

Today's Top Action Items:
${priorityList || "No pending priority tasks for today."}

Upcoming Deadlines:
${deadlineList || "No urgent deadlines in the next 30 days."}
=== END DASHBOARD DATA ===`;
        }
      } catch (toolErr) {
        console.error("[askSchoolariAI] Priorities tool error:", toolErr);
      }
    }

    // D. Execute Application Status Tool if intent matches
    if (intent.isApplicationStatus) {
      try {
        const appStatus = await getApplicationStatusTool(user.id);
        const schList = appStatus.trackedScholarships.map((s) => `- ${s.name}: ${s.status}`).join("\n");
        const colList = appStatus.savedColleges.map((c) => `- ${c.name}: ${c.status}`).join("\n");

        toolDataSection += `\n\n=== VERIFIED STUDENT APPLICATION TRACKER ===
Tracked Scholarships:
${schList || "No scholarships currently tracked in application list."}

Saved Colleges:
${colList || "No colleges currently saved in list."}
=== END APPLICATION TRACKER ===`;
      } catch (toolErr) {
        console.error("[askSchoolariAI] Application status tool error:", toolErr);
      }
    }

    // 3. Construct Compact Profile Context Section (~30-60 tokens)
    let profileContextSection = "";
    if (profile && profile.knownFields.length > 0) {
      profileContextSection = `[STUDENT PROFILE]: ${profile.knownFields.join(" | ")}`;
    }

    // 4. Construct Lean System Prompt (~120 tokens)
    const systemPrompt = `You are Schoolari AI, a concise and expert US college admissions & scholarship advisor.
Guidelines:
- Answer directly in 2-3 structured paragraphs or bullet points without fluff or repetitive greetings.
- Never ask for info already in the student's profile.
- Help outline and guide essays; do not ghostwrite complete submissions.

${profileContextSection}
${toolDataSection}`.trim();

    // 5. Construct conversation history window (last 3 messages max, trimming long assistant answers)
    const recentMessages = messages.slice(-3);
    const conversationHistory = recentMessages
      .map((m) => {
        const role = m.role === "user" ? "Student" : "Schoolari AI";
        const content =
          m.role === "assistant" && m.content.length > 300
            ? m.content.substring(0, 300) + "..."
            : m.content;
        return `${role}: ${content}`;
      })
      .join("\n\n");

    const userPrompt =
      recentMessages.length <= 1
        ? lastUserMessage
        : `Recent Context:\n${conversationHistory}\n\nRespond to the latest message as Schoolari AI:`;

    const text = await callAI({
      systemPrompt,
      userPrompt,
      provider: "claude",
      temperature: 0.7,
      maxTokens: 800,
      label: "Ask Schoolari AI",
    });

    // Save assistant response to database using masterId
    if (text) {
      try {
        await supabaseAdmin.from("ai_chat_messages").insert({
          user_id: masterId,
          role: "assistant",
          content: text,
          session_id: currentSessionId || null,
        });
      } catch (dbErr) {
        console.warn("[askSchoolariAI] Failed to save assistant response to DB:", dbErr);
      }
    }

    return { text, sessionId: currentSessionId };
  } catch (error: any) {
    console.error("[askSchoolariAI] Error:", error);
    return {
      error:
        "I'm having trouble connecting to the advisory server right now. Please try again in a moment.",
    };
  }
}
