"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import {
  Send,
  Radio,
  Users,
  User,
  Compass,
  Flame,
  Bell,
  Sparkles,
  Mail,
  CheckCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  ArrowLeft,
  Filter,
  MessageSquare,
  MessageSquareText,
  ChevronRight,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  AdminConversationUser,
  sendCoachReply,
  broadcastMessage,
  markStudentMessagesAsRead,
  getAdminConversations,
  getMessageStats,
} from "@/app/actions/admin-messages";
import { createClient } from "@/lib/supabase/client";
import { playMessageChime } from "@/lib/audioSound";
import Link from "next/link";

const MESSAGE_TYPES = [
  { value: "guidance", label: "Guidance", icon: Compass, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "motivation", label: "Motivation", icon: Flame, color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "reminder", label: "Reminder", icon: Bell, color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" },
  { value: "announcement", label: "Announcement", icon: Sparkles, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

export function MessagesAdmin({
  initialConversations = [],
  stats = { total: 0, unread: 0 },
  currentUser,
}: {
  initialConversations: AdminConversationUser[];
  stats: { total: number; unread: number };
  currentUser?: { id: string; email: string; name: string; role: string };
}) {
  const [conversations, setConversations] = useState<AdminConversationUser[]>(initialConversations);
  const [liveStats, setLiveStats] = useState(stats);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    initialConversations.length > 0 ? initialConversations[0].id : ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "student" | "parent" | "staff">("all");
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState("guidance");
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isStudentTyping, setIsStudentTyping] = useState(false);

  // Broadcast Modal State
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastType, setBroadcastType] = useState("announcement");
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "student" | "parent">("all");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const channelRef = useRef<any>(null);
  const sessionId = useRef(`sess_${Math.random().toString(36).slice(2)}_${Date.now()}`).current;
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    id: string;
    email: string;
    name: string;
    role: string;
  } | null>(currentUser || null);
  const currentUserProfileRef = useRef(currentUserProfile);
  currentUserProfileRef.current = currentUserProfile;

  useEffect(() => {
    if (currentUser) {
      setCurrentUserProfile(currentUser);
      currentUserProfileRef.current = currentUser;
    }
  }, [currentUser]);

  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (!isInitializedRef.current && initialConversations && initialConversations.length > 0) {
      isInitializedRef.current = true;
      setConversations(initialConversations);
      if (!selectedUserId) {
        setSelectedUserId(initialConversations[0].id);
      }
    }
  }, [initialConversations]);

  // Active student conversation object
  const activeConversation =
    conversations.find((c) => c.id === selectedUserId) ||
    conversations[0] ||
    null;

  // WhatsApp-style Auto-scroll to bottom
  const scrollToBottom = React.useCallback((instant = true) => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? "instant" : "smooth", block: "end" });
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

  // Continuous MutationObserver: ensures any content change keeps chat pinned to bottom
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;

    const observer = new MutationObserver(() => {
      el.scrollTop = el.scrollHeight;
    });

    observer.observe(el, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [selectedUserId]);

  // Auto-scroll when selected contact changes or on mount
  useEffect(() => {
    if (!activeConversation) return;

    scrollToBottom(true);
    const timers = [
      setTimeout(() => scrollToBottom(true), 20),
      setTimeout(() => scrollToBottom(true), 80),
      setTimeout(() => scrollToBottom(true), 200),
      setTimeout(() => scrollToBottom(true), 350),
    ];

    // Automatically mark student's unread messages as read when selecting conversation
    if (activeConversation.unreadCount > 0) {
      markStudentMessagesAsRead(activeConversation.id).catch(() => { });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id ? { ...c, unreadCount: 0 } : c
        )
      );
      setLiveStats((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - activeConversation.unreadCount),
      }));

      // Broadcast and emit event so AdminNav immediately clears the red dot without refresh
      try {
        channelRef.current?.send({
          type: "broadcast",
          event: "messages_read",
          payload: { userId: activeConversation.id },
        });
      } catch { }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("admin_messages_updated"));
      }
    }

    return () => timers.forEach(clearTimeout);
  }, [selectedUserId, activeConversation?.messages.length, scrollToBottom]);

  // ─── Realtime WebSockets Live Sync & Typing Indicator ─────────────────────
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase.channel("coaching-live-sync", {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    const handleIncomingMessage = (newMsg: any) => {
      if (!newMsg) return;
      // If this broadcast originated from this exact tab/session, ignore (already rendered optimistically)
      if (newMsg.sender_session_id === sessionId) return;

      const title = newMsg.title || "";
      const profile = currentUserProfileRef.current;

      // Strictly accept incoming messages directed to this specific staff member by Email, ID, or Name
      if (newMsg.type === "student_message" || (title && title.toUpperCase().includes("[STUDENT]"))) {
        const staff = currentUserProfileRef.current || currentUser;
        if (staff) {
          const myId = staff.id?.toLowerCase();
          const myEmail = staff.email?.toLowerCase();
          const myName = staff.name?.toLowerCase();
          const lowerTitle = title.toLowerCase();

          const isToMeById = myId && (lowerTitle.includes(`[to_id:${myId}]`) || lowerTitle.includes(`[to:${myId}]`));
          const isToMeByEmail = myEmail && (lowerTitle.includes(`[to_email:${myEmail}]`) || lowerTitle.includes(`[to:${myEmail}]`));
          const isToMeByName = myName && (lowerTitle.includes(`[to_name:${myName}]`) || lowerTitle.includes(`[to:${myName}]`));

          if (!isToMeById && !isToMeByEmail && !isToMeByName) {
            return; // Ignore student message addressed to a different staff member
          }
        }
      }

      const targetUserId = newMsg.user_id;

      setConversations((prev) => {
        const studentExists = prev.some((c) => c.id === targetUserId);
        if (!studentExists) {
          getAdminConversations().then((freshConvs) => {
            if (freshConvs) setConversations(freshConvs);
          });
          return prev;
        }

        const updated = prev.map((c) => {
          if (c.id === targetUserId) {
            // Check if this message already exists or replaces an optimistic message
            const existingIdx = c.messages.findIndex(
              (m) =>
                m.id === newMsg.id ||
                ((m as any).client_key && (m as any).client_key === (newMsg as any).client_key) ||
                (typeof m.id === "string" &&
                  m.id.startsWith("msg-") &&
                  m.content === newMsg.content)
            );

            let updatedMsgs: any[];
            if (existingIdx !== -1) {
              updatedMsgs = [...c.messages];
              // Preserve stable client_key so React never unmounts/flickers the DOM node!
              updatedMsgs[existingIdx] = {
                ...newMsg,
                client_key: (c.messages[existingIdx] as any).client_key || c.messages[existingIdx].id,
              };
            } else {
              updatedMsgs = [...c.messages, { ...newMsg, client_key: newMsg.id }];
            }

            const isFromStudent =
              newMsg.title?.includes("[STUDENT]") ||
              newMsg.type === "student_message";
            const snippet = (newMsg.content || "").replace(
              /^\[STUDENT\](\[[^\]]+\])*\s*/,
              ""
            );
            return {
              ...c,
              lastMessageSnippet: snippet,
              lastMessageTime: new Date(newMsg.created_at || Date.now()).toLocaleTimeString(
                "en-US",
                { hour: "numeric", minute: "2-digit" }
              ),
              lastTimestamp: new Date(newMsg.created_at || Date.now()).getTime(),
              unreadCount:
                isFromStudent && selectedUserId !== c.id
                  ? c.unreadCount + 1
                  : c.unreadCount,
              messages: updatedMsgs,
            };
          }
          return c;
        });

        // Reorder: newest message at top!
        return updated.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      });

      // If incoming message is from a student, play chime and notify AdminNav
      if (
        newMsg.title?.includes("[STUDENT]") ||
        newMsg.type === "student_message"
      ) {
        playMessageChime();
        setLiveStats((prev) => ({ ...prev, unread: prev.unread + 1 }));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("admin_messages_updated"));
        }
      }

      if (targetUserId === selectedUserId) {
        setTimeout(() => scrollToBottom(true), 60);
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
            handleIncomingMessage(payload.new as any);
          } else if (payload.eventType === "UPDATE") {
            const updatedMsg = payload.new as any;
            setConversations((prev) =>
              prev.map((c) => ({
                ...c,
                messages: c.messages.map((m) =>
                  m.id === updatedMsg.id ? { ...updatedMsg, client_key: (m as any).client_key || m.id } : m
                ),
              }))
            );
          }
        }
      )
      .on("broadcast", { event: "new_message" }, (payload) => {
        if (payload.payload) {
          handleIncomingMessage(payload.payload);
        }
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.sender_session_id === sessionId) return;
        if (payload.payload?.sender === "student" && payload.payload?.isTyping) {
          setIsStudentTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsStudentTyping(false);
          }, 2500);
        } else if (payload.payload?.sender === "student" && !payload.payload?.isTyping) {
          setIsStudentTyping(false);
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [selectedUserId, sessionId]);

  const emitTyping = (isTyping: boolean) => {
    try {
      channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { sender: "coach", sender_session_id: sessionId, isTyping },
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

  // Live Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [updatedConvs, updatedStats] = await Promise.all([
        getAdminConversations(),
        getMessageStats(),
      ]);
      if (updatedConvs) setConversations(updatedConvs);
      if (updatedStats) setLiveStats(updatedStats);
      toast.success("Inbox refreshed!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to refresh inbox.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Send Reply from Coach to Selected Student
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = content.trim();
    if (!text || !activeConversation) return;

    emitTyping(false);

    // Optimistic UI insertion
    const senderName = currentUserProfile?.name || "Admissions Coach";
    const senderRole = currentUserProfile?.role || "Coach";
    const title = `[COACH][FROM:${currentUserProfile?.id || "coach"}][FROM_ID:${currentUserProfile?.id || "coach"}][FROM_EMAIL:${currentUserProfile?.email || ""}][NAME:${senderName}][ROLE:${senderRole}] Advisory Feedback`;

    const optimisticId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg = {
      id: optimisticId,
      client_key: optimisticId,
      sender_session_id: sessionId,
      user_id: activeConversation.id,
      title,
      sender_name: senderName,
      sender_role: senderRole,
      content: text,
      type: selectedType,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    // Update conversation state and move student to top of inbox
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id === activeConversation.id) {
          return {
            ...c,
            lastMessageSnippet: text,
            lastMessageTime: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            lastTimestamp: Date.now(),
            messages: [...c.messages, optimisticMsg],
          };
        }
        return c;
      });
      // Re-sort: newest at top!
      return updated.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    });

    setContent("");
    scrollToBottom(true);
    setIsSending(true);

    // Broadcast instant peer-to-peer over WebSocket to recipient
    try {
      channelRef.current?.send({
        type: "broadcast",
        event: "new_message",
        payload: optimisticMsg,
      });
    } catch { }

    try {
      await sendCoachReply(activeConversation.id, text, selectedType);
    } catch (err: any) {
      toast.error(err.message || "Failed to send response.");
      // Rollback optimistic
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversation.id) {
            return {
              ...c,
              messages: c.messages.filter((m) => (m as any).client_key !== optimisticId),
            };
          }
          return c;
        })
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // Broadcast Submission
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastContent.trim()) {
      toast.error("Please fill in both title and content for broadcast.");
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await broadcastMessage(
        broadcastTitle,
        broadcastContent,
        broadcastType,
        broadcastTarget
      );
      if (res?.error) {
        toast.error(`Broadcast failed: ${res.error}`);
      } else {
        toast.success(`Announcement broadcast to ${(res as any)?.count || 0} users!`);
        setIsBroadcastOpen(false);
        setBroadcastTitle("");
        setBroadcastContent("");

        if (channelRef.current && (res as any)?.inserted) {
          (res as any).inserted.forEach((msg: any) => {
            channelRef.current.send({
              type: "broadcast",
              event: "new_message",
              payload: { ...msg, sender_session_id: sessionId },
            });
          });
        }

        handleRefresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast announcement.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Filter contacts in Left Column
  const filteredConversations = conversations.filter((c) => {
    const q = (searchQuery || "").toLowerCase().trim();
    const matchSearch =
      !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.gradeLevel || "").toLowerCase().includes(q);

    if (filterTab === "unread") return matchSearch && (c.unreadCount || 0) > 0;
    if (filterTab === "student") return matchSearch && c.accountType === "student";
    if (filterTab === "parent") return matchSearch && c.accountType === "parent";
    if (filterTab === "staff") return matchSearch && c.accountType === "staff";
    return matchSearch;
  });

  const quickCoachingTemplates = [
    "Essay feedback ready! ✍️",
    "FAFSA priority deadline reminder 💰",
    "Schedule 1:1 strategy session 📅",
    "Scholarship matches updated 🎓",
    "Great progress on your college list! 🌟",
  ];

  // Dynamically calculate actual unread count directly from real loaded conversations
  const dynamicUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP STATS BAR & QUICK ACTIONS
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/10">
            <MessageSquareText className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Admissions Coach & Student Inbox
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Live 2-way direct messaging, student inquiries, and personalized guidance
            </p>
          </div>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {conversations.length} Active Users
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          {dynamicUnreadCount} Unread Inquiries
        </div>

        <button
          onClick={() => setIsBroadcastOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-slate-900/10"
        >
          <Radio className="w-4 h-4 text-emerald-400" />
          New Broadcast
        </button>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh All Threads"
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN 2-WAY MESSENGER INTERFACE (WhatsApp Web Style)
          ───────────────────────────────────────────────────────────── */}
      <div className="h-[750px] max-h-[85vh] rounded-3xl border border-slate-200 overflow-hidden flex shadow-xl bg-[#F0F2F5]">
        {/* ── LEFT COLUMN: STUDENT INBOX LIST ── */}
        <div
          className={`w-full md:w-[350px] lg:w-[380px] flex flex-col bg-white border-r border-slate-200 shrink-0 h-full ${showMobileChat ? "hidden md:flex" : "flex"
            }`}
        >
          {/* Header */}
          <div className="bg-[#111827] px-4 py-4.5 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center">
                AD
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">Student Inquiries</h3>
                <p className="text-[10px] text-slate-300">2-Way Advisory Queue</p>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or grade..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-around gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {[
                { id: "all", label: "All" },
                { id: "unread", label: "Unread", count: dynamicUnreadCount },
                { id: "student", label: "Students" },
                { id: "parent", label: "Parents" },
                // { id: "staff", label: "Coaches/Staff" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${filterTab === tab.id
                    ? "bg-[#111827] text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  {tab.label}
                  {tab.count ? (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                      {tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0 [&::-webkit-scrollbar]:hidden">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No conversations found</p>
                <p className="text-[10px]">No messages matching the selected filter.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConversation?.id;
                const unread = conv.unreadCount || 0;

                const badgeStyle =
                  conv.accountType === "staff"
                    ? "bg-amber-100 text-amber-900 border border-amber-200"
                    : conv.accountType === "parent"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-indigo-100 text-indigo-800 border border-indigo-200";

                const badgeLabel =
                  conv.accountType === "staff"
                    ? conv.role === "super_admin"
                      ? "Admin"
                      : "Coach"
                    : conv.accountType === "parent"
                      ? "Parent"
                      : "Student";

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedUserId(conv.id);
                      setShowMobileChat(true);
                    }}
                    className={`w-full p-3 sm:px-3.5 sm:py-3 flex items-start gap-3 text-left transition-all hover:bg-slate-50 ${isSelected
                      ? "bg-slate-100/90 border-l-4 border-emerald-500 shadow-2xs"
                      : "bg-white"
                      }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <div
                        className={`w-11 h-11 rounded-full text-white font-black text-sm flex items-center justify-center shadow-2xs ${conv.accountType === "staff"
                          ? "bg-gradient-to-tr from-amber-600 to-orange-500"
                          : conv.accountType === "parent"
                            ? "bg-gradient-to-tr from-emerald-600 to-teal-500"
                            : "bg-gradient-to-tr from-indigo-600 to-violet-500"
                          }`}
                      >
                        {conv.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>

                    {/* Info & Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {conv.name}
                          </h4>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider shrink-0 ${badgeStyle}`}>
                            {badgeLabel}
                          </span>
                        </div>
                        {conv.lastMessageTime && (
                          <span className="text-[10px] font-medium text-slate-400 shrink-0">
                            {conv.lastMessageTime}
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
                        {conv.gradeLevel} • GPA {conv.gpa}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-[11px] text-slate-600 truncate leading-snug">
                          {conv.lastMessageSnippet}
                        </p>

                        {/* Red Unread Badge */}
                        {unread > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold shrink-0 shadow-2xs min-w-[18px] text-center animate-pulse">
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

        {/* ── RIGHT COLUMN: ACTIVE 2-WAY CHAT FEED & ADVISORY DESK ── */}
        <div
          className={`flex-1 flex flex-col h-full bg-[#EFEAE2]/40 min-w-0 ${showMobileChat ? "flex" : "hidden md:flex"
            }`}
        >
          {activeConversation ? (
            <>
              {/* Top Header */}
              <div className="bg-[#111827] px-4 sm:px-5 py-3.5 text-white flex items-center justify-between shrink-0 shadow-sm border-b border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="p-1 rounded-lg text-slate-300 hover:text-white md:hidden"
                    title="Back to inbox"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-sm flex items-center justify-center shadow-sm">
                      {activeConversation.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#111827]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-white truncate leading-none">
                        {activeConversation.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
                        {activeConversation.gradeLevel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-2 truncate">
                      {isStudentTyping ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                          typing...
                        </span>
                      ) : (
                        <>
                          <span>{activeConversation.email}</span>
                          <span>•</span>
                          <span>GPA: {activeConversation.gpa}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/*<Link
                    href={`/admin/students`}
                    className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                  >
                    <User className="w-3.5 h-3.5" /> View Profile
                  </Link> */}

                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    title="Refresh thread"
                    className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Chat Messages Feed Area with WhatsApp CSS flex-col-reverse */}
              <div
                ref={setChatScrollRef}
                className="flex-1 overflow-y-auto flex flex-col-reverse p-4 sm:p-5 gap-3 bg-[#EFEAE2]/40 bg-radial-[at_top_right] from-slate-50 to-[#EFEAE2]/60 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                <div ref={setMessagesEndRef} />

                {activeConversation.messages.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-3 my-auto">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center mx-auto text-emerald-600">
                      <MessageSquare className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">No message history yet</p>
                      <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
                        Send a message below to provide personalized guidance, essay feedback, or scholarship recommendations to {activeConversation.name}.
                      </p>
                    </div>
                  </div>
                ) : (
                  [...activeConversation.messages].reverse().map((msg, idx) => {
                    const isFromStudent =
                      msg.title?.includes("[STUDENT]") || msg.type === "student_message";

                    const timeStr = new Date(msg.created_at || Date.now()).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    });

                    const displayContent = (msg.content || "").replace(/^\[STUDENT\](\[[^\]]+\])*\s*/, "");

                    return (
                      <div
                        key={(msg as any).client_key || msg.id || idx}
                        className={`flex ${!isFromStudent ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 sm:px-4 sm:py-2.5 shadow-2xs relative ${!isFromStudent
                            ? "bg-[#00A884] text-white rounded-tr-xs"
                            : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                            }`}
                        >
                          {/* Sender & Recipient Routing Tag */}
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`text-[10px] font-extrabold uppercase tracking-wider ${!isFromStudent ? "text-emerald-100" : "text-indigo-700"
                                  }`}
                              >
                                {isFromStudent
                                  ? activeConversation.name
                                  : ((msg as any).sender_name || (msg.title && (msg.title.match(/\[NAME:([^\]]+)\]/)?.[1])) || (currentUserProfile?.name || "Admissions Coach"))}
                              </span>
                              {isFromStudent && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200/80 shrink-0">
                                  → {msg.title?.match(/\[TO_NAME:([^\]]+)\]/)?.[1] || (msg.title?.includes("super_admin") ? "Super Admin" : "College Coach")}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${!isFromStudent
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-600"
                                }`}
                            >
                              {msg.type || "guidance"}
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text break-words">
                            {displayContent}
                          </p>

                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${!isFromStudent ? "text-emerald-100/90" : "text-slate-400"
                              }`}
                          >
                            <span>{timeStr}</span>
                            {!isFromStudent && (
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

                {/* Advisory Notice */}
                <div className="flex justify-center my-1">
                  <span className="px-3.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 font-medium shadow-2xs text-center flex items-center gap-1.5 max-w-md">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Direct two-way advisory channel with {activeConversation.name}.
                  </span>
                </div>
              </div>

              {/* Quick Coaching Template Chips */}
              <div className="bg-slate-100/90 px-4 py-2 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto shrink-0 [&::-webkit-scrollbar]:hidden">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                  Templates:
                </span>
                {quickCoachingTemplates.map((template, tIdx) => (
                  <button
                    key={tIdx}
                    type="button"
                    onClick={() => setContent(template)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 transition-all shrink-0 shadow-2xs whitespace-nowrap"
                  >
                    {template}
                  </button>
                ))}
              </div>

              {/* Coach Reply Composer */}
              <div className="bg-white border-t border-slate-200 p-3 sm:p-4 shrink-0 shadow-lg space-y-2">
                {/* Category Type Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 mr-1">Type:</span>
                  {MESSAGE_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setSelectedType(type.value)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 shrink-0 ${isSelected
                          ? "bg-[#111827] text-white border-[#111827] shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        <Icon className="w-3 h-3" />
                        {type.label}
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="text"
                      value={content}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder={`Type guidance reply to ${activeConversation.name}... (Press Enter to send)`}
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
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <Users className="w-12 h-12 text-slate-300" />
              <p className="text-base font-bold text-slate-700">No Conversation Selected</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Select a student or parent from the left inbox to view their conversation history and reply.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. BROADCAST ANNOUNCEMENT MODAL
          ───────────────────────────────────────────────────────────── */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#111827] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Broadcast Announcement</h3>
                  <p className="text-xs text-slate-300">Deliver mass guidance or urgent alert</p>
                </div>
              </div>
              <button
                onClick={() => setIsBroadcastOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Target Audience</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "all", label: "All Users" },
                    { id: "student", label: "Students Only" },
                    { id: "parent", label: "Parents Only" },
                  ].map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setBroadcastTarget(target.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${broadcastTarget === target.id
                        ? "bg-[#111827] text-white border-[#111827] shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Broadcast Title / Topic</label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g., FAFSA Deadline Alert or Workshop Reminder"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Message Content</label>
                <textarea
                  rows={4}
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  placeholder="Type full announcement message..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBroadcastOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBroadcasting || !broadcastTitle.trim() || !broadcastContent.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isBroadcasting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Send Broadcast</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
