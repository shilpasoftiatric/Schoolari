"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Send,
  GraduationCap,
  FileText,
  BookOpen,
  Briefcase,
  Plus,
  SquarePen,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  Menu,
  X,
  PanelLeft,
} from "lucide-react";
import {
  askSchoolariAI,
  getAIChatHistory,
  getAIChatSessions,
  deleteAIChatSession,
  clearAIChatHistory,
  checkChatbotLimitAction,
  type ChatMessage,
  type AIChatSession,
} from "@/app/actions/ask-ai";
import { UpgradeFlowModal } from "@/components/ui/UpgradeFlowModal";
import type { SubscriptionPlan } from "@/lib/subscription";
import { getSubscriptionInfo } from "@/app/actions/subscription";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
}

// ─── Suggestion Chips ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  {
    icon: GraduationCap,
    label: "What scholarships match my profile?",
  },
  {
    icon: BookOpen,
    label: "Review my college application strategy",
  },
  {
    icon: FileText,
    label: "Help me brainstorm my Common App essay",
  },
  {
    icon: Briefcase,
    label: "What should I do next to prepare for college?",
  },
];

// ─── Code Block with Copy ────────────────────────────────────────────────────

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 text-slate-100 shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800/90 border-b border-slate-700/60 text-xs font-mono">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Rich Markdown Content Renderer ──────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-slate-800 leading-relaxed text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1
              className="text-base sm:text-lg font-black text-slate-900 mt-4 mb-2 first:mt-0 flex items-center gap-2 border-b border-slate-200 pb-1.5"
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className="text-sm sm:text-base font-bold text-slate-900 mt-3.5 mb-1.5 first:mt-0 flex items-center gap-1.5"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className="text-xs sm:text-sm font-bold text-slate-800 mt-3 mb-1 first:mt-0"
              {...props}
            />
          ),
          p: ({ ...props }) => (
            <p className="text-sm text-slate-800 leading-relaxed my-2 first:mt-0 last:mb-0" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 text-sm text-slate-800 leading-relaxed" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-sm text-slate-800 leading-relaxed" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="text-sm text-slate-800 leading-relaxed pl-0.5" {...props} />
          ),
          strong: ({ ...props }) => (
            <strong className="font-bold text-slate-900" {...props} />
          ),
          em: ({ ...props }) => (
            <em className="italic text-slate-800" {...props} />
          ),
          hr: ({ ...props }) => (
            <hr className="border-t border-slate-200 my-4" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-3 border-violet-500 bg-violet-50/60 pl-3.5 py-2 my-2.5 rounded-r-xl text-slate-700 text-sm font-medium"
              {...props}
            />
          ),
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            if (!inline && (match || codeString.includes("\n"))) {
              return <CodeBlock language={match ? match[1] : "text"} code={codeString} />;
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-slate-100 text-violet-700 font-mono text-xs font-semibold border border-slate-200/70"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-3 border border-slate-200 rounded-xl shadow-xs">
              <table className="w-full text-xs text-left text-slate-700 border-collapse" {...props} />
            </div>
          ),
          th: ({ ...props }) => (
            <th className="bg-slate-100 p-2.5 font-bold text-slate-900 border-b border-slate-200" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="p-2.5 border-b border-slate-100 text-slate-700" {...props} />
          ),
          a: ({ ...props }) => (
            <a
              className="text-violet-600 hover:text-violet-800 font-semibold underline underline-offset-2 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3.5 max-w-3xl animate-in fade-in duration-150">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-150">
        <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[65%]">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-xs text-sm leading-relaxed shadow-xs">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <p
            suppressHydrationWarning
            className="text-[10px] font-medium text-slate-400 mt-1 text-right pr-1"
          >
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    );
  }

  if (message.isError) {
    return (
      <div className="flex items-start gap-3 max-w-3xl animate-in fade-in duration-150">
        <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4 text-rose-600" />
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs text-rose-700 text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3.5 max-w-3xl group animate-in fade-in slide-in-from-bottom-1 duration-150">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
        <Sparkles className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Clean flowing markdown content */}
        <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-xs">
          <MarkdownContent content={message.content} />
        </div>

        {/* Message Footer with Timestamp & Copy */}
        <div className="flex items-center gap-3 pl-1 text-[11px] text-slate-400">
          <span suppressHydrationWarning>
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <button
            type="button"
            onClick={handleCopyMessage}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 font-medium transition-colors opacity-80 hover:opacity-100 cursor-pointer"
            title="Copy response"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Welcome Initial Message ──────────────────────────────────────────────────

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm **Schoolari AI**, your personal college admissions and scholarship counselor.\n\nI can help you with:\n- **Scholarship Matches**: Finding scholarships from our database that fit your profile\n- **College Strategy**: Building balanced lists (safeties, targets, reaches)\n- **Essays**: Brainstorming outlines for Common App and supplements\n- **Financial Aid**: Understanding FAFSA, SAI, and aid packages\n- **Timeline & Priorities**: Tracking upcoming deadlines and next steps\n\nWhat would you like to explore today?",
  timestamp: new Date(),
};

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function AIPage() {
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSessionsLoaded, setIsSessionsLoaded] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [aiLimitState, setAiLimitState] = useState<{ isOverBudget: boolean; limitReached: boolean; resetDate: string } | null>(null);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isWelcomeOnly = messages.length === 1 && messages[0].id === "welcome";

  // Load current user subscription plan
  useEffect(() => {
    let isMounted = true;
    async function loadPlan() {
      try {
        const sub = await getSubscriptionInfo();
        if (isMounted && sub?.plan) {
          setCurrentPlan(sub.plan);
        }
      } catch (_) { }
    }
    loadPlan();
    return () => { isMounted = false; };
  }, []);

  // Load sessions and check limits on mount
  useEffect(() => {
    let isMounted = true;
    async function loadSessionsAndLimits() {
      // Optimistic load for sessions
      try {
        const cachedSessions = localStorage.getItem("ai_chat_sessions");
        if (cachedSessions && isMounted) setSessions(JSON.parse(cachedSessions));
      } catch (_) { }

      try {
        const fetchedSessions = await getAIChatSessions();
        if (isMounted) {
          setSessions(fetchedSessions);
          localStorage.setItem("ai_chat_sessions", JSON.stringify(fetchedSessions));
        }
      } catch (err) {
        console.error("Failed to load AI chat sessions:", err);
      } finally {
        if (isMounted) setIsSessionsLoaded(true);
      }

      try {
        const cachedLimitsStr = sessionStorage.getItem("schoolari_ai_limits");
        let shouldCheckLimits = true;

        if (cachedLimitsStr) {
          try {
            const cachedLimits = JSON.parse(cachedLimitsStr);
            if ((cachedLimits.limitReached || cachedLimits.isOverBudget) && cachedLimits.resetDate) {
              const resetTime = new Date(cachedLimits.resetDate).getTime();
              // If limit reached and reset date is still in the future, skip the network check
              if (!isNaN(resetTime) && resetTime > Date.now()) {
                if (isMounted) setAiLimitState(cachedLimits);
                shouldCheckLimits = false;
              }
            }
          } catch (e) { }
        }

        if (shouldCheckLimits) {
          const limits = await checkChatbotLimitAction();
          if (isMounted) {
            setAiLimitState(limits);
            if (limits.limitReached || limits.isOverBudget) {
              sessionStorage.setItem("schoolari_ai_limits", JSON.stringify(limits));
            } else {
              sessionStorage.removeItem("schoolari_ai_limits");
            }
          }
        }
      } catch (err) {
        console.error("Failed to check AI chat limits:", err);
      }
    }
    loadSessionsAndLimits();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-scroll on new messages or streaming chunks
  useEffect(() => {
    if (isLoading || streamingText) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, streamingText, isLoading]);

  // Persist messages and sessions to localStorage for Optimistic UI
  useEffect(() => {
    if (activeSessionId && messages.length > 1) {
      localStorage.setItem(`ai_chat_session_${activeSessionId}`, JSON.stringify(messages));
    }
  }, [messages, activeSessionId]);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("ai_chat_sessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  // Adjust textarea height dynamically without showing default browser scrollbar
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > 120 ? "auto" : "hidden";
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    currentSessionIdRef.current = null;
    setMessages([WELCOME_MESSAGE]);
    setInput("");
    setIsMobileSidebarOpen(false);
    window.history.replaceState({}, '', '/ai');
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setIsMobileSidebarOpen(false);
    if (sessionId === activeSessionId) return;
    setActiveSessionId(sessionId);
    currentSessionIdRef.current = sessionId;
    window.history.replaceState({}, '', `/ai?session=${sessionId}`);

    // Optimistic UI for chat history
    let hasCached = false;
    try {
      const cachedHistory = localStorage.getItem(`ai_chat_session_${sessionId}`);
      if (cachedHistory) {
        const parsed = JSON.parse(cachedHistory);
        if (currentSessionIdRef.current === sessionId) {
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
          hasCached = true;
        }
      }
    } catch (_) { }

    if (!hasCached) setIsHistoryLoading(true);

    try {
      const history = await getAIChatHistory(sessionId);
      if (currentSessionIdRef.current !== sessionId) return;

      if (history.length > 0) {
        const mapped = history.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));
        setMessages(mapped);
        localStorage.setItem(`ai_chat_session_${sessionId}`, JSON.stringify(mapped));
      } else {
        setMessages([WELCOME_MESSAGE]);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    } finally {
      if (currentSessionIdRef.current === sessionId) {
        setIsHistoryLoading(false);
      }
    }
  };

  // Check URL for session on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get("session");
    if (sessionParam && !activeSessionId) {
      handleSelectSession(sessionParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await deleteAIChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to delete chat session:", err);
    }
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      setIsLoading(true);
      setStreamingText("");

      // Build conversation history
      const history: ChatMessage[] = [...messages, userMessage]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            sessionId: activeSessionId || undefined,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errorMessage = errData.error || "Sorry, I encountered an issue. Please try again.";
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: errorMessage,
              isError: true,
              timestamp: new Date(),
            },
          ]);
          setIsLoading(false);
          setStreamingText("");
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Streaming reader not available.");
        }

        const decoder = new TextDecoder("utf-8");
        let accumulated = "";
        let buffer = "";
        let streamLimitReached = false;
        let streamResetDate = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data: ")) continue;
            const jsonStr = trimmedLine.slice(6);
            if (!jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamingText(accumulated);
              }
              if (parsed.limitReached) {
                streamLimitReached = true;
                streamResetDate = parsed.resetDate || "";
              }
              if (parsed.done && parsed.sessionId) {
                if (parsed.sessionId !== activeSessionId) {
                  setActiveSessionId(parsed.sessionId);
                  setSessions((prev) => {
                    const exists = prev.some((s) => s.id === parsed.sessionId);
                    if (!exists) {
                      const cleanedTitle = trimmed.replace(/\s+/g, " ").trim().slice(0, 80);
                      return [
                        {
                          id: parsed.sessionId,
                          title: cleanedTitle,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        },
                        ...prev,
                      ];
                    }
                    return prev;
                  });
                }
              }
            } catch (_) { }
          }
        }

        if (accumulated) {
          setMessages((prev) => {
            const baseMsgs = [
              ...prev,
              {
                id: (Date.now() + 1).toString(),
                role: "assistant" as const,
                content: accumulated,
                timestamp: new Date(),
              },
            ];
            if (streamLimitReached) {
              baseMsgs.push({
                id: (Date.now() + 2).toString(),
                role: "assistant" as const,
                content: `You have reached your monthly Ask Schoolari AI limit. Your access resets on ${streamResetDate || "the 1st of next month"}. Upgrade your plan for more access.`,
                isError: true,
                timestamp: new Date(),
              });
            }
            return baseMsgs;
          });
        }
      } catch (err: any) {
        console.error("Streaming error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content:
              err.message ||
              "I'm having trouble connecting to the advisory server right now. Please try again.",
            isError: true,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setStreamingText("");
        try {
          const limits = await checkChatbotLimitAction();
          setAiLimitState(limits);
        } catch (err) {
          console.warn("Failed to update AI limits post-message:", err);
        }
      }
    },
    [messages, isLoading, activeSessionId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Manage layout main container padding and overflow while on the AI page
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    const originalOverflow = main.style.overflow;
    const originalPadding = main.style.padding;
    main.style.overflow = "hidden";
    main.style.padding = "0";

    const wrapper = main.firstElementChild as HTMLElement | null;
    let originalWrapperHeight = "";
    let originalWrapperMaxW = "";
    if (wrapper) {
      originalWrapperHeight = wrapper.style.height;
      originalWrapperMaxW = wrapper.style.maxWidth;
      wrapper.style.height = "100%";
      wrapper.style.maxWidth = "100%";
    }

    return () => {
      main.style.overflow = originalOverflow;
      main.style.padding = originalPadding;
      if (wrapper) {
        wrapper.style.height = originalWrapperHeight;
        wrapper.style.maxWidth = originalWrapperMaxW;
      }
    };
  }, []);

  return (
    <div className="relative flex h-full w-full bg-slate-50 overflow-hidden select-none">
      {/* ── Mobile Sidebar Drawer (ChatGPT mobile style) ────────────────── */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Drawer container */}
          <div className="relative w-62 max-w-[65vw] h-full bg-white flex flex-col shadow-2xl z-50 animate-in slide-in-from-left duration-250">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 leading-none">Schoolari AI</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Admissions &amp; Scholarships</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <SquarePen className="w-4 h-4" />
                <span>New chat</span>
              </button>
            </div>

            {/* Recent Chats list */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1">
              <div className="px-2 pb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Recent Chats
                </span>
              </div>

              {!isSessionsLoaded ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-violet-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-[10px] font-bold tracking-wider animate-pulse">Loading history...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="px-3 py-8 text-center text-xs text-slate-400">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 text-slate-300 opacity-60" />
                  <p>No chat history yet.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Start a conversation to save it here.</p>
                </div>
              ) : (
                sessions.map((sess) => {
                  const isActive = activeSessionId === sess.id;
                  return (
                    <div
                      key={sess.id}
                      onClick={() => handleSelectSession(sess.id)}
                      className={cn(
                        "group relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150",
                        isActive
                          ? "bg-violet-50 text-violet-900 font-semibold shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                      title={sess.title}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <MessageSquare
                          className={cn(
                            "w-3.5 h-3.5 shrink-0",
                            isActive ? "text-violet-600" : "text-slate-400 group-hover:text-slate-600"
                          )}
                        />
                        <span className="truncate block flex-1 text-left">
                          {sess.title}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteSession(e, sess.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all shrink-0 cursor-pointer"
                        title="Delete chat"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Upgrade Button in Mobile Sidebar Drawer (ChatGPT style - hidden for Elite plan) */}
            {currentPlan !== "elite" && (
              <div className="p-3 border-t border-slate-100 mt-auto bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setIsUpgradeOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                  title="Upgrade Plan"
                >
                  <Sparkles className="w-4 h-4 text-blue-500 fill-blue-500 shrink-0" />
                  <span className="text-sm font-semibold text-blue-600">Upgrade</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Collapsible Left Sidebar (Desktop Only) ─────────────────────── */}
      <aside
        className={cn(
          "hidden lg:flex shrink-0 h-full bg-white border-r border-slate-200/90 flex-col transition-all duration-300 ease-in-out z-20 shadow-xs",
          isSidebarOpen ? "w-52 sm:w-56" : "w-14"
        )}
      >
        {/* Sidebar Header: Schoolari AI Branding & Collapse Toggle */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2">
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs font-bold text-slate-900 leading-none truncate">
                    Schoolari AI
                  </h1>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    College &amp; scholarship advisor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xs hover:opacity-90 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Expand Schoolari AI sidebar"
                aria-label="Expand Schoolari AI sidebar"
              >
                <Sparkles className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <div className="p-2.5">
          <button
            onClick={handleNewChat}
            className={cn(
              "flex items-center gap-2 font-medium text-xs text-slate-700 hover:text-violet-600/50 transition-all cursor-pointer",
              isSidebarOpen ? "py-2 px-3 justify-start" : "p-2 justify-center"
            )}
            title="New chat"
          >
            <SquarePen className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            {isSidebarOpen && <span>New chat</span>}
          </button>
        </div>

        {/* Chat History Section */}
        {isSidebarOpen ? (
          <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 space-y-1">
            <div className="px-2 pb-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Recent Chats
              </span>
            </div>

            {!isSessionsLoaded ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-violet-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-[10px] font-bold tracking-wider animate-pulse">Loading history...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-400">
                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-slate-300 opacity-60" />
                <p>No chat history yet.</p>
                <p className="text-[10px] text-slate-400 mt-1">Start a conversation to save it here.</p>
              </div>
            ) : (
              sessions.map((sess) => {
                const isActive = activeSessionId === sess.id;
                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectSession(sess.id)}
                    className={cn(
                      "group relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150",
                      isActive
                        ? "bg-violet-50 text-violet-900 font-semibold shadow-xs"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                    title={sess.title}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <MessageSquare
                        className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          isActive ? "text-violet-600" : "text-slate-400 group-hover:text-slate-600"
                        )}
                      />
                      <span className="truncate block flex-1 text-left">
                        {sess.title}
                      </span>
                    </div>

                    {/* Delete Session Button */}
                    <button
                      onClick={(e) => handleDeleteSession(e, sess.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all shrink-0 cursor-pointer"
                      title="Delete chat"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto py-2 flex flex-col items-center gap-2">
            {sessions.slice(0, 10).map((sess) => {
              const isActive = activeSessionId === sess.id;
              return (
                <button
                  key={sess.id}
                  onClick={() => handleSelectSession(sess.id)}
                  className={cn(
                    "p-2.5 rounded-xl transition-colors cursor-pointer",
                    isActive
                      ? "bg-violet-100 text-violet-700"
                      : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  )}
                  title={sess.title}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        )}

        {/* Upgrade Button in Desktop Sidebar (hidden for Elite plan) */}
        {currentPlan !== "elite" && (
          isSidebarOpen ? (
            <div className="p-2.5 border-t border-slate-100 mt-auto bg-slate-50/40">
              <button
                type="button"
                onClick={() => setIsUpgradeOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                title="Upgrade Plan"
              >
                <Sparkles className="w-4 h-4 text-blue-500 fill-blue-500 shrink-0" />
                <span className="text-sm font-semibold text-blue-600">Upgrade</span>
              </button>
            </div>
          ) : (
            <div className="p-2 border-t border-slate-100 mt-auto flex justify-center">
              <button
                type="button"
                onClick={() => setIsUpgradeOpen(true)}
                className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                title="Upgrade Plan"
                aria-label="Upgrade Plan"
              >
                <Sparkles className="w-4 h-4 text-blue-500 fill-blue-500" />
              </button>
            </div>
          )
        )}
      </aside>

      {/* ── Main Chat Area ───────────────────────────────────────────────── */}
      <main className="relative flex-1 flex flex-col h-full min-w-0 bg-transparent overflow-hidden">
        {/* Mobile Top Navbar Header (ChatGPT style - Floating Transparent Overlay) */}
        <div className="lg:hidden absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-2.5 bg-transparent pointer-events-none">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1 -ml-2 text-slate-700 hover:text-violet-600 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer pointer-events-auto bg-white"
            title="Chat History"
            aria-label="Open chat history sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 pointer-events-auto bg-white p-1 rounded-sm">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">
              Schoolari AI
            </span>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            className="p-1 -mr-2 text-slate-700 hover:text-violet-600 hover:bg-slate-200/50 bg-white rounded-xl transition-colors cursor-pointer pointer-events-auto"
            title="Start new chat"
            aria-label="Start new chat"
          >
            <SquarePen className="w-5 h-5" />
          </button>
        </div>

        {/* ── Messages Stream ────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/50 pt-12 sm:pt-14 pb-32">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {isHistoryLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-violet-500 gap-3 py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="font-semibold animate-pulse text-sm">Loading chat...</span>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}

                {isLoading && (
                  streamingText ? (
                    <div className="flex items-start gap-3.5 max-w-3xl group animate-in fade-in slide-in-from-bottom-1 duration-150">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-xs">
                          <MarkdownContent content={streamingText} />
                          <span className="inline-block w-2 h-4 bg-violet-600 animate-pulse ml-0.5 align-middle" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <TypingIndicator />
                  )
                )}

                {/* Suggestion chips — visible when starting a fresh chat */}
                {isWelcomeOnly && !isLoading && (
                  <div className="pt-4 animate-in fade-in duration-200">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Suggested questions
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {SUGGESTIONS.map((s) => {
                        const Icon = s.icon;
                        return (
                          <button
                            key={s.label}
                            onClick={() => sendMessage(s.label)}
                            className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50/70 rounded-xl text-left text-sm text-slate-700 hover:text-violet-700 transition-all duration-150 group shadow-xs cursor-pointer active:scale-99"
                          >
                            <div className="w-8 h-8 rounded-lg bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center shrink-0 transition-colors">
                              <Icon className="w-4 h-4 text-violet-600" />
                            </div>
                            <span className="font-medium leading-snug">{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* ── Floating Centered Input Bar ────────────────────────────────── */}
        <div className="absolute bottom-0 inset-x-0 bg-transparent pt-8 pb-4 px-4 pointer-events-none z-10">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto pointer-events-auto">
            {aiLimitState === null ? (
              <div className="flex items-center justify-center gap-2 bg-white/50 border border-slate-200 rounded-2xl px-4 py-3.5 shadow-lg text-slate-400 text-sm font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="animate-pulse">Checking access...</span>
              </div>
            ) : aiLimitState.isOverBudget ? (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 shadow-lg text-red-700 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
                <p>
                  You have reached your monthly AI spend limit. Your access resets on {aiLimitState.resetDate || "the 1st of next month"}. Upgrade your plan for more access.
                </p>
              </div>
            ) : aiLimitState.limitReached ? (
              <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 shadow-lg text-orange-700 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-orange-500 mt-0.5" />
                <p>
                  You have reached your monthly Ask Schoolari AI limit. Your access resets on {aiLimitState.resetDate || "the 1st of next month"}. Upgrade your plan for more access.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white hover:bg-white focus-within:bg-white border border-slate-200/90 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100 rounded-2xl sm:rounded-3xl px-3.5 sm:px-4 py-1.5 sm:py-2 transition-all shadow-lg">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about college, scholarships..."
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-slate-800 placeholder:text-slate-400 placeholder:truncate leading-normal disabled:opacity-60 py-1.5 overflow-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{ minHeight: "24px", maxHeight: "120px" }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md active:scale-95 cursor-pointer"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Upgrade Plan Flow Modal */}
      <UpgradeFlowModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        targetPlan={currentPlan === "scholar" ? "elite" : "scholar"}
        currentPlan={currentPlan}
        featureName="Ask Schoolari AI"
      />
    </div>
  );
}
