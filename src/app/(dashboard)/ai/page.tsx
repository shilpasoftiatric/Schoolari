"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import {
  askSchoolariAI,
  getAIChatHistory,
  getAIChatSessions,
  deleteAIChatSession,
  clearAIChatHistory,
  type ChatMessage,
  type AIChatSession,
} from "@/app/actions/ask-ai";
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
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSessionsLoaded, setIsSessionsLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isWelcomeOnly = messages.length === 1 && messages[0].id === "welcome";

  // Load sessions from database on mount
  useEffect(() => {
    let isMounted = true;
    async function loadSessions() {
      try {
        const fetchedSessions = await getAIChatSessions();
        if (isMounted) {
          setSessions(fetchedSessions);
          if (fetchedSessions.length > 0) {
            // Load latest session
            const firstSession = fetchedSessions[0];
            setActiveSessionId(firstSession.id);
            const history = await getAIChatHistory(firstSession.id);
            if (isMounted && history.length > 0) {
              setMessages(
                history.map((m) => ({
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  timestamp: new Date(m.createdAt),
                }))
              );
            }
          }
        }
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        if (isMounted) setIsSessionsLoaded(true);
      }
    }
    loadSessions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Switch to a chat session
  const handleSelectSession = async (sessionId: string) => {
    if (activeSessionId === sessionId || isLoading) return;
    setActiveSessionId(sessionId);
    setInput("");
    try {
      const history = await getAIChatHistory(sessionId);
      if (history.length > 0) {
        setMessages(
          history.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt),
          }))
        );
      } else {
        setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
      }
    } catch (err) {
      console.error("Error loading chat history for session:", err);
    }
  };

  // Start fresh chat
  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Delete a chat session
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await deleteAIChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
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

      // Build conversation history for the server action
      const history: ChatMessage[] = [...messages, userMessage]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      if (history.length === 0 || history[history.length - 1].role !== "user") {
        history.push({ role: "user", content: trimmed });
      }

      const result = await askSchoolariAI(history, activeSessionId || undefined);
      setIsLoading(false);

      if (result.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: result.error || "An unexpected error occurred. Please try again.",
            timestamp: new Date(),
            isError: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: result.text ?? "",
            timestamp: new Date(),
          },
        ]);

        // If a new session was created on the server, update the session list and active session
        if (result.sessionId) {
          setActiveSessionId(result.sessionId);
          setSessions((prev) => {
            const exists = prev.some((s) => s.id === result.sessionId);
            if (!exists) {
              const cleanedTitle = trimmed.replace(/\s+/g, " ").trim().slice(0, 80);
              return [
                {
                  id: result.sessionId!,
                  title: cleanedTitle,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                ...prev,
              ];
            } else {
              return prev.map((s) =>
                s.id === result.sessionId
                  ? { ...s, updatedAt: new Date().toISOString() }
                  : s
              );
            }
          });
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
      {/* ── Collapsible Left Sidebar ─────────────────────────────────────── */}
      <aside
        className={cn(
          "shrink-0 h-full bg-white border-r border-slate-200/90 flex flex-col transition-all duration-300 ease-in-out z-20 shadow-xs",
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

            {sessions.length === 0 ? (
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
      </aside>

      {/* ── Main Chat Area ───────────────────────────────────────────────── */}
      <main className="relative flex-1 flex flex-col h-full min-w-0 bg-slate-50/70 overflow-hidden">
        {/* ── Messages Stream ────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/50 pb-32">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading && <TypingIndicator />}

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
          </div>
        </div>

        {/* ── Floating Centered Input Bar ────────────────────────────────── */}
        <div className="absolute bottom-0 inset-x-0 bg-transparent pt-8 pb-4 px-4 pointer-events-none z-10">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto pointer-events-auto">
            <div className="flex items-end gap-2 bg-white hover:bg-white focus-within:bg-white border border-slate-200 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100 rounded-2xl px-4 py-2.5 transition-all shadow-lg">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about college, scholarships, or essays…"
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-slate-800 placeholder:text-slate-400 leading-relaxed disabled:opacity-60 py-1"
                style={{ minHeight: "24px", maxHeight: "120px" }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="shrink-0 w-8 h-8 flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-lg shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md active:scale-95 cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
