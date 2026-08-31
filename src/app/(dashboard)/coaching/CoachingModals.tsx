"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Video,
  Users,
  User,
  CheckCircle2,
  Send,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Star,
  Download,
  FileText,
  BookOpen,
  HelpCircle,
  CalendarDays,
  Loader2,
  X,
  RefreshCw,
  CheckCheck,
  GraduationCap,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  sendStudentMessage,
  markCoachMessagesAsRead,
  getStudentCoachingData,
} from "@/app/actions/coaching";
import { createClient } from "@/lib/supabase/client";
import { playMessageChime } from "@/lib/audioSound";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Session Details Modal
// ─────────────────────────────────────────────────────────────────────────────
interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any | null;
  onEnroll: (sessionId: string) => Promise<void>;
  isEnrolling?: boolean;
}

export function SessionDetailsModal({
  isOpen,
  onClose,
  session,
  onEnroll,
  isEnrolling = false,
}: SessionDetailsModalProps) {
  if (!session) return null;

  const sessionDate = new Date(session.session_date);
  const formattedDate = sessionDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = sessionDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92vw] sm:max-w-lg max-h-[90dvh] sm:max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border-slate-100 shadow-2xl">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 sm:p-6 text-white shrink-0">
          <div className="flex items-center gap-2 mb-2">
            {session.session_type === "1:1" || session.session_type === "private" || session.session_type === "individual" ? (
              <span className="px-3 py-0.5 bg-purple-200/30 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-full backdrop-blur-sm">
                1:1 Coaching (Premium)
              </span>
            ) : (
              <span className="px-3 py-0.5 bg-blue-200/30 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-full backdrop-blur-sm">
                Live Group Workshop
              </span>
            )}
            {session.isEnrolled && (
              <span className="px-3 py-0.5 bg-emerald-400/30 text-emerald-100 text-[11px] font-bold rounded-full flex items-center gap-1 backdrop-blur-sm">
                <CheckCircle2 className="w-3.5 h-3.5" /> Registered
              </span>
            )}
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
            {session.title}
          </DialogTitle>
        </div>

        <div className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto min-h-0">
          {/* Info cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{formattedDate}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {formattedTime} ({session.duration_minutes || 60} mins)
                </p>
              </div>
            </div>
          </div>

          {/* Location / Format */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-indigo-950">Virtual Session</p>
                <p className="text-[11px] text-indigo-700/80">Hosted live via Zoom video conference</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider">
              Session Overview & Agenda
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100 whitespace-pre-line">
              {session.description ||
                "In this comprehensive session, your coach will walk you through scholarship essay strategies, application timelines, and personalized action items to optimize your college admissions journey."}
            </p>
          </div>

          {/* What to bring */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider">
              Preparation Checklist
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Have your current draft essay or resume ready to share
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Prepare 2-3 specific questions regarding your target colleges
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Test your webcam and microphone before joining
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-200/70 transition-colors"
          >
            Close
          </button>

          {session.isEnrolled ? (
            <a
              href={session.meeting_link || "https://zoom.us"}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 flex items-center gap-2 transition-all"
            >
              <Video className="w-4 h-4" />
              Join Zoom Meeting
              <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
            </a>
          ) : (
            <button
              type="button"
              disabled={isEnrolling}
              onClick={() => onEnroll(session.id)}
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Registering...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Register for Session
                </>
              )}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 2. Direct Message Coach Modal (WhatsApp Web Style 2-Way Inbox & Chat)
// ─────────────────────────────────────────────────────────────────────────────
interface MessageCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachName?: string;
  initialMessages?: any[];
  contacts?: any[];
  onMessageSent?: () => void;
}

export function MessageCoachModal({
  isOpen,
  onClose,
  coachName = "College Coach",
  initialMessages = [],
  contacts = [],
  onMessageSent,
}: MessageCoachModalProps) {
  const [messages, setMessages] = useState<any[]>(initialMessages);
  const [allContacts, setAllContacts] = useState<any[]>(contacts);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isCoachTyping, setIsCoachTyping] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const chatScrollRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = React.useRef<number>(0);

  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setCurrentUserId(data.user.id);
    });
  }, []);

  const dedupeContacts = (list: any[]) => {
    const seen = new Set<string>();
    return list.filter((c) => {
      if (!c?.id || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  };

  // Sync contacts and messages
  React.useEffect(() => {
    if (contacts && contacts.length > 0) {
      const deduped = dedupeContacts(contacts);
      setAllContacts(deduped);
      if (!selectedContactId && deduped.length > 0) {
        setSelectedContactId(deduped[0].id);
      }
    } else {
      // Fallback default coach contact
      setAllContacts([
        {
          id: "coach-lead",
          name: coachName,
          role: "admin",
          displayTitle: "Senior College Coach",
          email: "coach@schoolari.com",
          avatarUrl: null,
          lastMessageSnippet: "Direct advisory line",
          lastMessageTime: "",
          unreadCount: 0,
        },
      ]);
      if (!selectedContactId) {
        setSelectedContactId("coach-lead");
      }
    }
  }, [contacts, coachName]);

  React.useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Fetch freshest contacts & messages whenever the modal is opened
  React.useEffect(() => {
    if (isOpen) {
      getStudentCoachingData().then((data) => {
        if (data?.contacts && data.contacts.length > 0) {
          setAllContacts(dedupeContacts(data.contacts));
        }
        if (data?.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      });
    }
  }, [isOpen]);

  // Automatically mark unread coach messages for active contact as read (clears badge instantly)
  React.useEffect(() => {
    if (!isOpen || !activeContact?.id) return;

    const unreadMsgs = messages.filter((m) => {
      if (isStudentMessage(m) || m.is_read) return false;
      const title = m.title || "";
      return (
        (activeContact.id && (title.includes(`[FROM:${activeContact.id}]`) || title.includes(`[FROM_ID:${activeContact.id}]`))) ||
        (activeContact.name && title.includes(`[NAME:${activeContact.name}]`))
      );
    });

    if (unreadMsgs.length > 0) {
      const idsToMark = new Set(unreadMsgs.map((m) => m.id));
      setMessages((prev) =>
        prev.map((m) => (idsToMark.has(m.id) ? { ...m, is_read: true } : m))
      );
      markCoachMessagesAsRead(activeContact.id).catch(() => { });
    }
  }, [isOpen, selectedContactId, messages.length]);



  const activeContact =
    allContacts.find((c) => c.id === selectedContactId) ||
    allContacts[0] || {
      id: "coach-lead",
      name: coachName,
      displayTitle: "College Admissions Coach",
    };

  // Helper to extract coach name from message
  const getSenderName = (msg: any, fallback: string = "College Admissions Coach") => {
    if (msg.sender_name) return msg.sender_name;
    if (msg.title) {
      const match = msg.title.match(/\[NAME:([^\]]+)\]/);
      if (match) return match[1];
    }
    return fallback;
  };

  const getSenderRole = (msg: any, fallback: string = "Coach") => {
    if (msg.sender_role) return msg.sender_role;
    if (msg.title) {
      const match = msg.title.match(/\[ROLE:([^\]]+)\]/);
      if (match) return match[1];
    }
    return fallback;
  };

  // WhatsApp-style Auto-scroll to bottom
  const scrollToBottom = React.useCallback((behavior: "instant" | "smooth" = "instant") => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  // Callback ref: executes the exact millisecond the chat DOM element mounts
  const setChatScrollRef = React.useCallback((node: HTMLDivElement | null) => {
    chatScrollRef.current = node;
    if (node) {
      node.scrollTop = node.scrollHeight;
      requestAnimationFrame(() => {
        node.scrollTop = node.scrollHeight;
      });
      setTimeout(() => {
        node.scrollTop = node.scrollHeight;
      }, 50);
      setTimeout(() => {
        node.scrollTop = node.scrollHeight;
      }, 150);
      setTimeout(() => {
        node.scrollTop = node.scrollHeight;
      }, 300);
    }
  }, []);

  const setMessagesEndRef = React.useCallback((node: HTMLDivElement | null) => {
    messagesEndRef.current = node;
    if (node) {
      node.scrollIntoView({ block: "end" });
    }
  }, []);

  // Helper to reliably determine if a message was sent by the student
  const isStudentMessage = (m: any) => {
    if (!m) return false;
    if (m.type === "student_message") return true;
    if (m.sender_role === "student" || m.sender === "student") return true;
    const title = (m.title || "").toUpperCase();
    if (title.includes("[STUDENT]") || title.includes("MESSAGE FROM STUDENT")) return true;
    return false;
  };

  // Helper function to get messages belonging to a given contact with strict isolation
  const getContactMessages = (contact: any) => {
    if (!contact) return [];
    return messages.filter((m) => {
      const title = m.title || "";

      // Welcome message support: show under Super Admin thread
      if (
        title.includes("Welcome to Schoolari Elite") &&
        (contact.role === "super_admin" || contact.name?.toLowerCase().includes("super admin") || (contact.id && title.includes(contact.id)))
      ) {
        return true;
      }

      const isToThisContact =
        (contact.id && (title.includes(`[TO:${contact.id}]`) || title.includes(`[TO_ID:${contact.id}]`))) ||
        (contact.email && title.includes(`[TO_EMAIL:${contact.email}]`)) ||
        (contact.name && (title.includes(`[TO:${contact.name}]`) || title.includes(`[TO_NAME:${contact.name}]`)));

      const isFromThisContact =
        (contact.id && (title.includes(`[FROM:${contact.id}]`) || title.includes(`[FROM_ID:${contact.id}]`))) ||
        (contact.email && title.includes(`[FROM_EMAIL:${contact.email}]`)) ||
        (contact.role && (title.includes(`[FROM_ROLE:${contact.role}]`) || title.includes(`[ROLE:${contact.role}]`))) ||
        (contact.name && title.includes(`[NAME:${contact.name}]`));

      return isToThisContact || isFromThisContact;
    });
  };

  // Filter messages specifically belonging to the active selected contact
  const contactMessages = activeContact ? getContactMessages(activeContact) : [];

  const sortedMessages = [...contactMessages].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );

  // Dynamically enrich each contact with latest message, timestamp & unread count
  const dynamicContacts = allContacts.map((contact) => {
    const contactMsgs = getContactMessages(contact);
    const lastMsg = contactMsgs.length > 0 ? contactMsgs[contactMsgs.length - 1] : null;
    const lastTime = lastMsg
      ? new Date(lastMsg.created_at || 0).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
      : "";
    const lastTimestamp = lastMsg ? new Date(lastMsg.created_at || 0).getTime() : 0;
    const rawSnippet = lastMsg
      ? (lastMsg.content || "").replace(/^\[STUDENT\](\[[^\]]+\])*\s*/, "")
      : "Tap to start conversation";

    const isSelected = selectedContactId === contact.id;
    // Only count unread messages that were received FROM the coach (never own student messages!)
    const unread = isSelected
      ? 0
      : contactMsgs.filter((m) => !isStudentMessage(m) && !m.is_read).length;

    return {
      ...contact,
      lastMessageSnippet: rawSnippet,
      lastMessageTime: lastTime,
      lastTimestamp,
      unreadCount: unread,
    };
  });

  // Reorder contacts dynamically: most recent message activity at the top (WhatsApp style!)
  const sortedContacts = [...dynamicContacts].sort((a, b) => {
    if (b.lastTimestamp !== a.lastTimestamp) {
      return b.lastTimestamp - a.lastTimestamp;
    }
    return 0;
  });

  const filteredContacts = sortedContacts.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.displayTitle.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterTab === "unread") {
      return matchSearch && (c.unreadCount || 0) > 0;
    }
    return matchSearch;
  });

  // Auto-scroll when modal opens, active contact changes, or messages change
  React.useEffect(() => {
    if (!isOpen) return;

    // Immediately attempt scroll
    scrollToBottom("instant");

    // Staggered frames to guarantee scroll across Radix Dialog animation, layout reflow, and CSS transitions
    const timers = [
      setTimeout(() => scrollToBottom("instant"), 20),
      setTimeout(() => scrollToBottom("instant"), 80),
      setTimeout(() => scrollToBottom("instant"), 200),
      setTimeout(() => scrollToBottom("instant"), 350),
    ];

    // Mark active coach messages as read
    const unreadCoachMessages = contactMessages.filter(
      (m) => !isStudentMessage(m) && !m.is_read
    );
    if (unreadCoachMessages.length > 0) {
      setMessages((prev) =>
        prev.map((m) =>
          unreadCoachMessages.some((um) => um.id === m.id)
            ? { ...m, is_read: true }
            : m
        )
      );
      unreadCoachMessages.forEach((m) => {
        import("@/app/actions/coaching").then(({ markMessageAsRead }) => {
          markMessageAsRead(m.id).catch(() => { });
        });
      });
    }

    return () => timers.forEach(clearTimeout);
  }, [isOpen, selectedContactId, sortedMessages.length, scrollToBottom]);

  // Continuous MutationObserver: ensures any content change keeps chat pinned to bottom
  React.useEffect(() => {
    if (!isOpen) return;
    const el = chatScrollRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;

    const observer = new MutationObserver(() => {
      el.scrollTop = el.scrollHeight;
    });

    observer.observe(el, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [isOpen, selectedContactId]);

  const channelRef = React.useRef<any>(null);
  const sessionId = React.useRef(`sess_${Math.random().toString(36).slice(2)}_${Date.now()}`).current;

  const currentUserIdRef = React.useRef<string>(currentUserId);
  React.useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // ─── Realtime WebSockets Live Sync & Typing Indicator ─────────────────────
  React.useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();

    const channel = supabase.channel("coaching-live-sync", {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    const handleIncoming = (newMsg: any) => {
      if (!newMsg) return;
      if (newMsg.sender_session_id === sessionId) return;

      // CRITICAL: Strictly isolate realtime messages to THIS user's thread (Prevent Student <-> Parent cross-leak)
      const myId = currentUserId || currentUserIdRef.current;
      if (myId && newMsg.user_id && newMsg.user_id !== myId) {
        return; // Drop message belonging to another student/parent account
      }

      setMessages((prev) => {
        const existingIdx = prev.findIndex(
          (m) =>
            m.id === newMsg.id ||
            ((m as any).client_key && (m as any).client_key === (newMsg as any).client_key) ||
            (typeof m.id === "string" &&
              m.id.startsWith("msg-") &&
              m.content === newMsg.content)
        );
        if (existingIdx !== -1) {
          const next = [...prev];
          next[existingIdx] = {
            ...newMsg,
            client_key: (prev[existingIdx] as any).client_key || prev[existingIdx].id,
          };
          return next;
        }
        return [...prev, { ...newMsg, client_key: newMsg.id }];
      });

      // Play incoming message chime if from coach
      if (
        !newMsg.title?.includes("[STUDENT]") &&
        newMsg.type !== "student_message"
      ) {
        playMessageChime();
      }
    };

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "coaching_messages",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            handleIncoming(payload.new as any);
          } else if (payload.eventType === "UPDATE") {
            const updatedMsg = payload.new as any;
            const myId = currentUserId || currentUserIdRef.current;
            if (myId && updatedMsg.user_id && updatedMsg.user_id !== myId) return;

            setMessages((prev) =>
              prev.map((m) =>
                m.id === updatedMsg.id
                  ? { ...updatedMsg, client_key: (m as any).client_key || m.id }
                  : m
              )
            );
          }
        }
      )
      .on("broadcast", { event: "new_message" }, (payload) => {
        if (payload.payload) {
          handleIncoming(payload.payload);
        }
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.sender_session_id === sessionId) return;
        const myId = currentUserId || currentUserIdRef.current;
        if (myId && payload.payload?.user_id && payload.payload?.user_id !== myId) return;

        if (payload.payload?.sender === "coach" && payload.payload?.isTyping) {
          setIsCoachTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsCoachTyping(false);
          }, 2500);
        } else if (payload.payload?.sender === "coach" && !payload.payload?.isTyping) {
          setIsCoachTyping(false);
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [isOpen, sessionId]);

  const emitTyping = (isTyping: boolean) => {
    try {
      channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { sender: "student", sender_session_id: sessionId, isTyping },
      });
    } catch { }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1200) {
      lastTypingSentRef.current = now;
      emitTyping(true);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await getStudentCoachingData();
      if (data?.messages) setMessages(data.messages);
      if (data?.contacts && data.contacts.length > 0) setAllContacts(data.contacts);
      toast.success("Inbox refreshed!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to refresh inbox.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = content.trim();
    if (!text) return;

    emitTyping(false);

    // Optimistic UI update for this specific contact
    const studentUserId = currentUserId || messages.find((m) => m.user_id)?.user_id || "";
    const optimisticId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMessage = {
      id: optimisticId,
      client_key: optimisticId,
      sender_session_id: sessionId,
      user_id: studentUserId,
      title: `[STUDENT][TO_ID:${activeContact.id}][TO:${activeContact.id}][TO_EMAIL:${activeContact.email || ""}][TO_ROLE:${activeContact.role || ""}][TO_NAME:${activeContact.name}] Message from Student`,
      content: text,
      type: "guidance",
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setContent("");
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    setIsSending(true);

    // Broadcast instant peer-to-peer over WebSocket to recipient
    try {
      channelRef.current?.send({
        type: "broadcast",
        event: "new_message",
        payload: optimisticMessage,
      });
    } catch { }

    try {
      const res = await sendStudentMessage(
        text,
        activeContact.id,
        activeContact.name,
        activeContact.email,
        activeContact.role
      );
      onMessageSent?.();
      if (res?.userId && !currentUserId) {
        setCurrentUserId(res.userId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message.");
      setMessages((prev) => prev.filter((m) => (m as any).client_key !== optimisticId));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "Review my essay draft ✍️",
    "Scholarship deadlines question 🎓",
    "Help with FAFSA & financial aid 💰",
    "Schedule 1:1 strategy session 📅",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="!fixed !inset-0 !top-0 !left-0 !transform-none !translate-x-0 !translate-y-0 !w-screen !max-w-none !h-[100dvh] !max-h-[100dvh] !p-0 !m-0 !gap-0 !rounded-none !border-0 !flex !flex-col md:!flex-row bg-[#F0F2F5] z-[100] [&>button]:hidden"
      >
        {/* ─────────────────────────────────────────────────────────────
            LEFT COLUMN: INBOX CONTACTS LIST (WhatsApp Web Style)
            ───────────────────────────────────────────────────────────── */}
        <div
          className={`w-full md:w-[320px] lg:w-[350px] flex flex-col bg-white border-r border-slate-200 shrink-0 h-full ${showMobileChat ? "hidden md:flex" : "flex"
            }`}
        >
          {/* Left Top Header */}
          <div className="bg-[#111827] px-4 py-3.5 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                ME
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white leading-tight truncate">Messages Inbox</h3>
                <p className="text-[10px] text-slate-300 truncate">2-Way Admissions Lines</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh contacts"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${isRefreshing ? "animate-spin text-emerald-400" : "text-slate-300 hover:text-emerald-400"}`} />
              </button>
              <button
                onClick={onClose}
                title="Close chat"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start a new chat"
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 placeholder:text-slate-400"
              />
              <span className="absolute left-3 top-2 text-slate-400 text-xs font-bold">🔍</span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${filterTab === "all"
                  ? "bg-[#111827] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
              >
                All Chats
              </button>
              <button
                onClick={() => setFilterTab("unread")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${filterTab === "unread"
                  ? "bg-rose-500 text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
              >
                Unread
                {dynamicContacts.some((c) => (c.unreadCount || 0) > 0) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Contacts List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0 [&::-webkit-scrollbar]:hidden">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <p className="text-xs font-semibold text-slate-600">No contacts found</p>
                <p className="text-[10px]">Your active coaching contacts will be listed here.</p>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = contact.id === activeContact.id;
                const unread = contact.unreadCount || 0;

                return (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setSelectedContactId(contact.id);
                      setShowMobileChat(true);
                    }}
                    className={`w-full p-3 sm:px-3.5 sm:py-3 flex items-start gap-3 text-left transition-all hover:bg-slate-50 ${isSelected
                      ? "bg-slate-100/90 border-l-4 border-emerald-500 shadow-2xs"
                      : "bg-white"
                      }`}
                  >
                    {/* Avatar with Online status */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shadow-2xs">
                        {contact.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>

                    {/* Contact Details & Message Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {contact.name}
                          </h4>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                            {contact.role === "super_admin" ? "Director" : "Coach"}
                          </span>
                        </div>
                        {contact.lastMessageTime && (
                          <span className="text-[10px] font-medium text-slate-400 shrink-0">
                            {contact.lastMessageTime}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-[11px] text-slate-500 truncate leading-snug">
                          {contact.lastMessageSnippet || "Tap to chat"}
                        </p>

                        {/* Red Unread Count Badge */}
                        {unread > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold shrink-0 shadow-2xs min-w-[18px] text-center">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT COLUMN: ACTIVE CHAT CONVERSATION VIEW
            ───────────────────────────────────────────────────────────── */}
        <div
          className={`flex-1 flex flex-col h-full bg-[#EFEAE2]/40 min-w-0 ${showMobileChat ? "flex" : "hidden md:flex"
            }`}
        >
          {/* WhatsApp Active Chat Top Header */}
          <div className="bg-[#111827] px-4 sm:px-5 py-3.5 text-white flex items-center justify-between shrink-0 shadow-sm border-b border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              {/* Back button for mobile */}
              <button
                onClick={() => setShowMobileChat(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white md:hidden mr-1"
                title="Back to inbox"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shadow-sm">
                  {activeContact.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#111827]" />
              </div>

              {/* Contact info & status */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-sm sm:text-base font-bold text-white truncate leading-none">
                    {activeContact.name}
                  </DialogTitle>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
                    {activeContact.role === "super_admin" ? "Director" : "Coach"}
                  </span>
                </div>
                <DialogDescription className="text-[11px] text-slate-300 mt-1 flex items-center gap-1.5 truncate">
                  {isCoachTyping ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                      typing...
                    </span>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {activeContact.displayTitle || "Admissions Advisory Coach"} • Online now
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh messages"
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${isRefreshing ? "animate-spin text-emerald-400" : "text-slate-300 hover:text-emerald-400"}`} />
              </button>
              <button
                onClick={onClose}
                title="Close chat"
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chat Feed Area with WhatsApp CSS flex-col-reverse */}
          <div
            ref={setChatScrollRef}
            className="flex-1 overflow-y-auto flex flex-col-reverse p-4 sm:p-5 gap-3 bg-[#EFEAE2]/40 bg-radial-[at_top_right] from-slate-50 to-[#EFEAE2]/60 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <div ref={setMessagesEndRef} />

            {sortedMessages.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-3 my-auto">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center mx-auto text-emerald-600">
                  <Send className="w-6 h-6 stroke-[1.8]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Start the conversation</p>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
                    Type a question below about your scholarships, essays, or college admissions strategy to reach {activeContact.name}.
                  </p>
                </div>
              </div>
            ) : (
              [...sortedMessages].reverse().map((msg, idx) => {
                const isStudent = isStudentMessage(msg);

                const timeStr = new Date(msg.created_at || Date.now()).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });

                const displayContent = (msg.content || "").replace(/^\[STUDENT\](\[[^\]]+\])*\s*/, "");

                return (
                  <div
                    key={(msg as any).client_key || msg.id || idx}
                    className={`flex ${isStudent ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 sm:px-4 sm:py-2.5 shadow-2xs relative ${isStudent
                        ? "bg-[#00A884] text-white rounded-tr-xs"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                        }`}
                    >
                      {!isStudent && (
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                            {getSenderName(msg, activeContact.name)}
                          </p>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                            {getSenderRole(msg, "Coach")}
                          </span>
                        </div>
                      )}

                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text break-words">
                        {displayContent}
                      </p>

                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isStudent ? "text-emerald-100/90" : "text-slate-400"
                          }`}
                      >
                        <span>{timeStr}</span>
                        {isStudent && (
                          <CheckCheck className={`w-3.5 h-3.5 ${msg.is_read ? "text-sky-300" : "text-emerald-200"}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Today Separator */}
            <div className="flex justify-center my-2">
              <span className="px-3 py-0.5 rounded-full bg-white/90 border border-slate-200 text-[10px] font-bold text-slate-500 shadow-2xs">
                Today
              </span>
            </div>

            {/* Top Encrypted banner */}
            <div className="flex justify-center my-1">
              <span className="px-3.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 font-medium shadow-2xs text-center flex items-center gap-1.5 max-w-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Direct two-way advisory thread with {activeContact.name}.
              </span>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="bg-slate-100/90 px-4 py-2 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto shrink-0 [&::-webkit-scrollbar]:hidden">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Quick:
            </span>
            {quickPrompts.map((prompt, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => setContent(prompt)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 transition-all shrink-0 shadow-2xs whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* WhatsApp/SMS Composer Bar */}
          <form
            onSubmit={handleSend}
            className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0 shadow-lg"
          >
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={content}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Type a message to ${activeContact.name}... (Press Enter to send)`}
                className="w-full pl-4 pr-12 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
              />
              {content.length > 0 && (
                <span className="absolute right-3 text-[10px] font-medium text-slate-400">
                  {content.length}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={!content.trim() || isSending}
              className="px-4 sm:px-5 py-2.5 rounded-2xl bg-[#00A884] hover:bg-[#008f6f] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </>
              )}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Coaching Calendar Modal (Compact & Responsive)
// ─────────────────────────────────────────────────────────────────────────────
interface CoachingCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: any[];
  onSelectSession: (session: any) => void;
}

export function CoachingCalendarModal({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
}: CoachingCalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));

  // Find sessions in this month
  const getSessionsForDay = (day: number) => {
    return sessions.filter((s) => {
      const d = new Date(s.session_date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-3xl max-h-[95vh] flex flex-col p-0 pb-2 overflow-hidden rounded-3xl border-slate-100 shadow-2xl [&>button]:hidden">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div>
            <DialogTitle className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5" /> Coaching Calendar
            </DialogTitle>
            <DialogDescription className="text-[11px] text-white/80 mt-0.5">
              Select a date to view scheduled 1:1 sessions and group workshops
            </DialogDescription>
          </div>

          <div className="flex items-center gap-1.5 bg-white/20 p-1 rounded-xl shrink-0">
            <button
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <span className="text-xs font-extrabold text-white px-2 min-w-[95px] text-center">
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day} className="text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider text-center">
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {/* Blank offset days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`blank-${idx}`} className="h-12 sm:h-14 rounded-xl bg-slate-50/40 border border-transparent" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const daySessions = getSessionsForDay(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={`day-${day}`}
                  className={`h-12 sm:h-14 p-1 sm:p-1.5 rounded-xl border transition-all flex flex-col items-center justify-between overflow-hidden text-center ${isToday
                    ? "bg-violet-50/70 border-violet-300 ring-2 ring-violet-200"
                    : daySessions.length > 0
                      ? "bg-white border-violet-200 shadow-2xs"
                      : "bg-white border-slate-100 hover:border-slate-200"
                    }`}
                >
                  <span
                    className={`text-[10px] sm:text-xs font-bold leading-none text-center w-full block ${isToday ? "text-violet-700 font-extrabold" : "text-slate-700"
                      }`}
                  >
                    {day}
                  </span>

                  <div className="space-y-0.5 overflow-hidden w-full">
                    {daySessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          onSelectSession(s);
                          onClose();
                        }}
                        title={s.title}
                        className={`w-full text-center truncate text-[9px] px-1 py-0.2 rounded font-bold transition-transform hover:scale-105 block ${s.session_type === "1:1" || s.session_type === "private" || s.session_type === "individual"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                          }`}
                      >
                        {s.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="p-3 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" /> 1:1 Live Coaching
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Group Workshop
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Coaching History Modal
// ─────────────────────────────────────────────────────────────────────────────
interface CoachingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: any[];
}

export function CoachingHistoryModal({ isOpen, onClose, sessions }: CoachingHistoryModalProps) {
  const enrolledSessions = sessions.filter((s) => s.isEnrolled);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl border-slate-100 shadow-2xl">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <Clock className="w-5 h-5" /> Coaching History & Attendance
          </DialogTitle>
          <DialogDescription className="text-xs text-white/80 mt-0.5">
            Your registered coaching sessions and past workshop participation
          </DialogDescription>
        </div>

        <div className="p-5 flex-1 overflow-y-auto min-h-0 space-y-2.5">
          {enrolledSessions.length === 0 ? (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs sm:text-sm font-semibold text-slate-600">No session history yet</p>
              <p className="text-[11px] text-slate-400">
                When you register for 1:1 or group sessions, your attendance history will be tracked here.
              </p>
            </div>
          ) : (
            enrolledSessions.map((s) => {
              const d = new Date(s.session_date);
              const isPast = d.getTime() < Date.now();

              return (
                <div
                  key={s.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-3xl bg-violet-100/80 text-violet-700 flex flex-col items-center justify-center shrink-0 text-center p-1 border border-violet-200/60 shadow-2xs">
                      <span className="text-[9px] font-black uppercase tracking-wider leading-none text-violet-600">
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-sm font-black leading-tight text-slate-900 mt-0.5">
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{s.title}</h4>
                      <p className="text-[11px] text-slate-500">
                        {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} •{" "}
                        {s.session_type === "1:1" ? "1:1 Session" : "Group Workshop"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${isPast
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                      }`}
                  >
                    {isPast ? "Completed" : "Upcoming"}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-200 transition-colors w-full"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Session Feedback Modal
// ─────────────────────────────────────────────────────────────────────────────
interface SessionFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachName?: string;
  sessions?: any[];
}

export function SessionFeedbackModal({
  isOpen,
  onClose,
  coachName = "College Coach",
  sessions = [],
}: SessionFeedbackModalProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    try {
      const { submitCoachingFeedback } = await import("@/app/actions/coaching");
      const res = await submitCoachingFeedback({
        sessionId: selectedSessionId || null,
        rating,
        comments: feedback.trim(),
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Thank you! Your feedback has been shared with your coaching team.");
        setFeedback("");
        setRating(5);
        setSelectedSessionId("");
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter only sessions the user has registered for / enrolled in (includes registered Group & 1-on-1 sessions)
  const registeredSessions = (sessions || []).filter((s: any) => s.isEnrolled === true);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border-slate-100 shadow-2xl">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-300 fill-amber-300" /> Session Feedback
          </DialogTitle>
          <DialogDescription className="text-xs text-white/80 mt-0.5">
            Help us tailor future coaching sessions to your college admissions needs
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto min-h-0">
          {/* Select Session (Optional) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
              Session (Optional)
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-xs cursor-pointer"
            >
              <option value="">General Coaching / All Sessions</option>
              {registeredSessions.map((s: any) => {
                const rawDate = s.session_date || s.scheduled_at || s.created_at;
                const formattedDate = rawDate && !isNaN(new Date(rawDate).getTime())
                  ? new Date(rawDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "";
                const typeLabel = s.session_type === "1-on-1" ? "1-on-1" : "Group";
                return (
                  <option key={s.id} value={s.id}>
                    {s.title} ({typeLabel}){formattedDate ? ` — ${formattedDate}` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
              Overall Session Rating
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 ${star <= rating
                        ? "text-amber-400 fill-amber-400 drop-shadow-xs"
                        : "text-slate-200"
                      }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-slate-700 ml-2">
                {rating === 5
                  ? "Outstanding"
                  : rating === 4
                    ? "Very Helpful"
                    : rating === 3
                      ? "Good"
                      : rating === 2
                        ? "Fair"
                        : "Needs Improvement"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
              Comments & Key Takeaways
            </label>
            <textarea
              rows={4}
              placeholder={`Share what you found most helpful about your coaching session with ${coachName}, or what topics you'd like to dive deeper into next time...`}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              required
            />
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !feedback.trim()}
              className="px-5 py-2 rounded-xl font-bold text-xs bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Feedback"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Coaching Resources Modal
// ─────────────────────────────────────────────────────────────────────────────
interface CoachingResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialResources?: any[];
}

export function CoachingResourcesModal({ isOpen, onClose, initialResources = [] }: CoachingResourcesModalProps) {
  const [resources, setResources] = useState<any[]>(
    initialResources && initialResources.length > 0
      ? initialResources
      : [
        {
          id: "essays_statements",
          title: "Common App & Coalition Essay Master Guide",
          category: "Essays & Statements",
          description: "Proven brainstorming frameworks, hook strategies, and Stanford/Harvard accepted essay breakdowns.",
          iconName: "BookOpen",
          color: "bg-purple-100 text-purple-600",
          fileUrl: null,
          fileName: null,
          fileSize: null,
        },
        {
          id: "scholarships",
          title: "Full-Ride Scholarship Interview Cheat Sheet",
          category: "Scholarships",
          description: "Top 25 questions asked by committee interviewers and how to structure winning responses using the STAR method.",
          iconName: "FileText",
          color: "bg-blue-100 text-blue-600",
          fileUrl: null,
          fileName: null,
          fileSize: null,
        },
        {
          id: "financial_aid",
          title: "US College Admissions & Financial Aid Roadmap",
          category: "Financial Aid",
          description: "FAFSA & CSS Profile step-by-step checklist, SAI minimization tips, and appeal letter templates.",
          iconName: "Sparkles",
          color: "bg-emerald-100 text-emerald-600",
          fileUrl: null,
          fileName: null,
          fileSize: null,
        },
        {
          id: "applications",
          title: "College Recommendation Letter Request Kit",
          category: "Applications",
          description: "Brag sheet template and email scripts for teachers and high school counselors.",
          iconName: "Download",
          color: "bg-amber-100 text-amber-600",
          fileUrl: null,
          fileName: null,
          fileSize: null,
        },
      ]
  );

  React.useEffect(() => {
    if (initialResources && initialResources.length > 0) {
      setResources(initialResources);
    }
  }, [initialResources]);

  React.useEffect(() => {
    if (isOpen) {
      import("@/app/actions/admin-coaching").then(({ getCoachingResources }) => {
        getCoachingResources()
          .then((data) => {
            if (data && data.length > 0) {
              setResources(data);
            }
          })
          .catch((err) => console.error("Error fetching coaching resources:", err));
      });
    }
  }, [isOpen]);

  const handleDownload = async (item: any) => {
    if (item.fileUrl) {
      const toastId = toast.loading(`Downloading ${item.fileName || item.title}...`);
      try {
        const response = await fetch(item.fileUrl);
        if (!response.ok) throw new Error("Network response was not ok");
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = item.fileName || `${item.category.replace(/\s+/g, '_')}_guide.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        toast.success(`Downloaded ${item.fileName || item.title}!`, { id: toastId });
      } catch (e) {
        console.error("Blob download fallback:", e);
        window.open(item.fileUrl, "_blank");
        toast.success(`Opened ${item.fileName || item.title}!`, { id: toastId });
      }
    } else {
      toast.info("Your admissions coach is finalizing this handout. It will be available for download shortly!");
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "BookOpen":
        return BookOpen;
      case "FileText":
        return FileText;
      case "Sparkles":
        return Sparkles;
      case "Download":
      default:
        return Download;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-3xl border-slate-100 shadow-2xl">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> Coaching Resources & Handouts
          </DialogTitle>
          <DialogDescription className="text-xs text-white/80 mt-0.5">
            Exclusive templates, guidebooks, and checklists curated by your admissions coach
          </DialogDescription>
        </div>

        <div className="p-5 flex-1 overflow-y-auto min-h-0 space-y-2.5">
          {resources.map((item, idx) => {
            const Icon = getIcon(item.iconName);
            const hasFile = Boolean(item.fileUrl);

            return (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-violet-200 hover:bg-violet-50/30 transition-all flex items-start justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center shrink-0 shadow-2xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {item.category}
                      </span>
                      {hasFile && (
                        <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-md">
                          Available
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-violet-900 transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{item.description}</p>
                    {hasFile && item.fileName && (
                      <p className="text-[10px] text-indigo-600 font-medium mt-1 truncate">
                        📎 {item.fileName}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(item)}
                  className={`p-2.5 rounded-xl border transition-all shrink-0 shadow-2xs flex items-center gap-1 text-xs font-bold ${hasFile
                      ? "bg-violet-600 text-white border-violet-600 hover:bg-violet-700 hover:shadow-md hover:shadow-violet-200"
                      : "bg-white border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    }`}
                  title={hasFile ? "Download Handout" : "Handout coming soon"}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <DialogFooter className="py-3.5 px-5 pb-6 bg-slate-50 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-200 transition-colors w-full"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Modern Elite Welcome Pop-up Modal (One-Time Initial Visit)
// ─────────────────────────────────────────────────────────────────────────────
export function EliteWelcomeModal({
  isOpen,
  onClose,
  onOpenChat,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[92vw] sm:max-w-[540px] max-h-[90dvh] sm:max-h-[90vh] flex flex-col p-0 overflow-hidden border-0 rounded-3xl shadow-2xl bg-white"
      >
        {/* Top Gradient Banner with Badge */}
        <div className="bg-gradient-to-br from-[#635BFF] via-[#7C5CFC] to-[#4F46E5] p-5 sm:p-7 text-white relative overflow-hidden shrink-0">
          {/* Subtle Background Rings */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-2.5 sm:space-y-3 relative z-10 pr-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-[11px] sm:text-xs font-bold border border-white/20">
              <span>Schoolari Elite Activated</span>
            </div>

            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Hi! Welcome to Schoolari Elite! 🎓
            </h2>

            <p className="text-white/85 text-xs sm:text-sm leading-relaxed">
              I’m excited to be part of your college & scholarship journey!
            </p>
          </div>
        </div>

        {/* Message Body & Coach Notes */}
        <div className="p-4 sm:p-7 space-y-4 sm:space-y-5 overflow-y-auto flex-1 overscroll-contain">
          {/* Quote Card */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3 text-slate-700 text-xs sm:text-sm leading-relaxed">
            <p>
              <strong className="text-slate-900 font-bold">As your personal Schoolari Coach</strong>, I’m here to help you stay on track, make a plan, and move forward with confidence. Tell me how I can assist you.
            </p>
            <p>
              You can message me here whenever you need help with your college or scholarship process, essays, applications, deadlines, or figuring out what to do next. You don’t have to figure it all out alone. We’ll work through it together, one step at a time.
            </p>
            <p className="font-extrabold text-[#635BFF]">
              Let’s get started!
            </p>
          </div>

          {/* 3 Key Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-1">
            <div className="p-2.5 sm:p-3 rounded-xl bg-violet-50/70 border border-violet-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-900 leading-tight">2-Way Chat</p>
                <p className="text-[10px] text-slate-500">Ask anything</p>
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-900 leading-tight">1:1 Coaching</p>
                <p className="text-[10px] text-slate-500">Live sessions</p>
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-900 leading-tight">Roadmaps</p>
                <p className="text-[10px] text-slate-500">Action items</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
