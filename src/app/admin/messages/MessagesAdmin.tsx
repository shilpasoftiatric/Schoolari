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
  Clock,
  Calendar,
  Smartphone,
  ListOrdered,
  AlertCircle,
  Trash2,
  CalendarClock,
  Layers,
  Info,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  AdminConversationUser,
  sendCoachReply,
  broadcastMessage,
  markStudentMessagesAsRead,
  getAdminConversations,
  getMessageStats,
  scheduleDirectMessage,
  scheduleBroadcastMessage,
  getScheduledMessages,
  cancelScheduledMessage,
  sendBulkSMS,
  getAudienceEstimate,
  ScheduledMessageItem,
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

  // ── Scheduled Messages Queue State ─────────────────────────────
  const [scheduledQueue, setScheduledQueue] = useState<ScheduledMessageItem[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // ── 1-on-1 Direct Schedule Modal State ─────────────────────────
  const [isDirectScheduleOpen, setIsDirectScheduleOpen] = useState(false);
  const [directScheduleDate, setDirectScheduleDate] = useState("");
  const [directScheduleTime, setDirectScheduleTime] = useState("");
  const [directScheduleChannel, setDirectScheduleChannel] = useState<"in_app" | "sms" | "both">("in_app");
  const [directScheduleType, setDirectScheduleType] = useState("guidance");
  const [directScheduleContent, setDirectScheduleContent] = useState("");
  const [isSubmittingDirectSchedule, setIsSubmittingDirectSchedule] = useState(false);

  // ── Broadcast Modal State (Enhanced with Scheduling & Channels) ──
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastType, setBroadcastType] = useState("announcement");
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "student" | "parent">("all");
  const [broadcastChannel, setBroadcastChannel] = useState<"in_app" | "sms" | "both">("in_app");
  const [broadcastIsScheduled, setBroadcastIsScheduled] = useState(false);
  const [broadcastScheduleDate, setBroadcastScheduleDate] = useState("");
  const [broadcastScheduleTime, setBroadcastScheduleTime] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // ── Bulk SMS & Multi-Channel Modal State ────────────────────────
  const [isBulkSMSOpen, setIsBulkSMSOpen] = useState(false);
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkContent, setBulkContent] = useState("");
  const [bulkTarget, setBulkTarget] = useState<"all" | "student" | "parent">("all");
  const [bulkChannel, setBulkChannel] = useState<"sms" | "in_app" | "both">("sms");
  const [bulkType, setBulkType] = useState("announcement");
  const [bulkIsScheduled, setBulkIsScheduled] = useState(false);
  const [bulkScheduleDate, setBulkScheduleDate] = useState("");
  const [bulkScheduleTime, setBulkScheduleTime] = useState("");
  const [bulkAudienceStats, setBulkAudienceStats] = useState<{
    totalUsers: number;
    usersWithPhone: number;
    eliteUsers: number;
  }>({ totalUsers: 0, usersWithPhone: 0, eliteUsers: 0 });
  const [isEstimatingAudience, setIsEstimatingAudience] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);

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

  // Load scheduled messages queue on mount
  const loadScheduledQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const items = await getScheduledMessages();
      setScheduledQueue(items);
    } catch (err) {
      console.error("Failed to fetch scheduled messages:", err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    loadScheduledQueue();
  }, []);

  // Fetch Audience Estimate when Bulk Modal is opened or target changes
  useEffect(() => {
    if (isBulkSMSOpen || isBroadcastOpen) {
      const target = isBulkSMSOpen ? bulkTarget : broadcastTarget;
      setIsEstimatingAudience(true);
      getAudienceEstimate(target)
        .then((stats) => {
          setBulkAudienceStats(stats);
        })
        .finally(() => setIsEstimatingAudience(false));
    }
  }, [isBulkSMSOpen, isBroadcastOpen, bulkTarget, broadcastTarget]);

  // Active student conversation object
  const activeConversation =
    conversations.find((c) => c.id === selectedUserId) ||
    conversations[0] ||
    null;

  // Auto-scroll to bottom
  const scrollToBottom = React.useCallback((instant = true) => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? "instant" : "smooth", block: "end" });
  }, []);

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
      if (newMsg.sender_session_id === sessionId) return;

      const title = newMsg.title || "";

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
            return;
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

        return updated.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      });

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
      const [updatedConvs, updatedStats, queue] = await Promise.all([
        getAdminConversations(),
        getMessageStats(),
        getScheduledMessages(),
      ]);
      if (updatedConvs) setConversations(updatedConvs);
      if (updatedStats) setLiveStats(updatedStats);
      if (queue) setScheduledQueue(queue);
      toast.success("Inbox and queue refreshed!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to refresh inbox.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Send Reply from Coach to Selected Student (Instant 1-on-1)
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
      return updated.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    });

    setContent("");
    scrollToBottom(true);
    setIsSending(true);

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

  // Open 1-on-1 Direct Schedule Modal
  const openDirectScheduleModal = () => {
    if (!activeConversation) {
      toast.error("Please select a student or parent first.");
      return;
    }
    setDirectScheduleContent(content.trim());
    setDirectScheduleType(selectedType);
    // Default to tomorrow 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];
    setDirectScheduleDate(dateStr);
    setDirectScheduleTime("10:00");
    setIsDirectScheduleOpen(true);
  };

  // Submit 1-on-1 Direct Scheduled Message
  const handleScheduleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation) return;
    if (!directScheduleContent.trim()) {
      toast.error("Please provide message content to schedule.");
      return;
    }
    if (!directScheduleDate || !directScheduleTime) {
      toast.error("Please choose a valid scheduled date and time.");
      return;
    }

    const scheduledDateObj = new Date(`${directScheduleDate}T${directScheduleTime}:00`);
    if (isNaN(scheduledDateObj.getTime())) {
      toast.error("Invalid scheduled date or time.");
      return;
    }

    if (scheduledDateObj.getTime() <= Date.now() + 60 * 1000) {
      toast.error("Scheduled time must be at least 2 minutes in the future.");
      return;
    }

    setIsSubmittingDirectSchedule(true);
    try {
      const res = await scheduleDirectMessage({
        targetUserId: activeConversation.id,
        content: directScheduleContent.trim(),
        scheduledFor: scheduledDateObj.toISOString(),
        messageType: directScheduleType,
        deliveryChannel: directScheduleChannel,
      });

      if (res?.error) {
        toast.error(`Scheduling failed: ${res.error}`);
      } else {
        toast.success(
          `Message scheduled for ${activeConversation.name} on ${scheduledDateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })} at ${scheduledDateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}!`
        );
        setIsDirectScheduleOpen(false);
        setContent("");
        loadScheduledQueue();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule message.");
    } finally {
      setIsSubmittingDirectSchedule(false);
    }
  };

  // Broadcast Submission (Supports instant broadcast and scheduled broadcast)
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastContent.trim()) {
      toast.error("Please fill in both title and content for broadcast.");
      return;
    }

    if (broadcastIsScheduled) {
      if (!broadcastScheduleDate || !broadcastScheduleTime) {
        toast.error("Please select a date and time for scheduled broadcast.");
        return;
      }
      const schedObj = new Date(`${broadcastScheduleDate}T${broadcastScheduleTime}:00`);
      if (isNaN(schedObj.getTime()) || schedObj.getTime() <= Date.now() + 60 * 1000) {
        toast.error("Scheduled time must be in the future.");
        return;
      }

      setIsBroadcasting(true);
      try {
        const res = await scheduleBroadcastMessage({
          title: broadcastTitle,
          content: broadcastContent,
          scheduledFor: schedObj.toISOString(),
          targetRole: broadcastTarget,
          messageType: broadcastType,
          deliveryChannel: broadcastChannel,
        });

        if (res?.error) {
          toast.error(`Schedule broadcast failed: ${res.error}`);
        } else {
          toast.success(
            `Broadcast scheduled for ${schedObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })} at ${schedObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}!`
          );
          setIsBroadcastOpen(false);
          setBroadcastTitle("");
          setBroadcastContent("");
          loadScheduledQueue();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to schedule broadcast.");
      } finally {
        setIsBroadcasting(false);
      }
      return;
    }

    // Instant Delivery
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

  // Bulk SMS & Alerts Modal Submission
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkContent.trim()) {
      toast.error("Please enter the SMS/Notification message content.");
      return;
    }

    if (bulkIsScheduled) {
      if (!bulkScheduleDate || !bulkScheduleTime) {
        toast.error("Please select a date and time for scheduled message.");
        return;
      }
      const schedObj = new Date(`${bulkScheduleDate}T${bulkScheduleTime}:00`);
      if (isNaN(schedObj.getTime()) || schedObj.getTime() <= Date.now() + 60 * 1000) {
        toast.error("Scheduled time must be in the future.");
        return;
      }

      setIsSendingBulk(true);
      try {
        const res = await scheduleBroadcastMessage({
          title: bulkTitle || "Schoolari Notification",
          content: bulkContent,
          scheduledFor: schedObj.toISOString(),
          targetRole: bulkTarget,
          messageType: bulkType,
          deliveryChannel: bulkChannel,
        });

        if (res?.error) {
          toast.error(`Scheduling failed: ${res.error}`);
        } else {
          toast.success(
            `Bulk ${bulkChannel.toUpperCase()} scheduled for ${schedObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })} at ${schedObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}!`
          );
          setIsBulkSMSOpen(false);
          setBulkContent("");
          setBulkTitle("");
          loadScheduledQueue();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to schedule bulk message.");
      } finally {
        setIsSendingBulk(false);
      }
      return;
    }

    // Instant Delivery
    setIsSendingBulk(true);
    try {
      const res = await sendBulkSMS({
        title: bulkTitle,
        content: bulkContent,
        targetRole: bulkTarget,
        deliveryChannel: bulkChannel,
        messageType: bulkType,
      });

      if (res?.error) {
        toast.error(`Failed to send bulk: ${res.error}`);
      } else {
        const smsInfo = bulkChannel !== "in_app" ? ` (${res.sentSMS} SMS sent, ${res.skippedSMS || 0} skipped)` : "";
        const appInfo = bulkChannel !== "sms" ? ` (${res.sentInApp || 0} In-App delivered)` : "";
        toast.success(`Delivered successfully!${smsInfo}${appInfo}`);
        setIsBulkSMSOpen(false);
        setBulkContent("");
        setBulkTitle("");
        handleRefresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send bulk message.");
    } finally {
      setIsSendingBulk(false);
    }
  };

  // Cancel a scheduled message
  const handleCancelScheduled = async (id: string) => {
    setCancellingId(id);
    try {
      const res = await cancelScheduledMessage(id);
      if (res.error) {
        toast.error(`Cancel failed: ${res.error}`);
      } else {
        toast.success("Scheduled message cancelled.");
        setScheduledQueue((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel.");
    } finally {
      setCancellingId(null);
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

  const dynamicUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP STATS BAR & QUICK ACTIONS
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/10 shrink-0">
            <MessageSquareText className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Messages & Advisory Hub
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {conversations.length} Active
                </span>
                {dynamicUnreadCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200/70 text-rose-700 text-[11px] font-bold animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    {dynamicUnreadCount} Unread
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/70 text-slate-600 text-[11px] font-medium">
                    All caught up
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5 truncate">
              Live 2-way student chat, guidance scheduling, mass broadcasts & bulk SMS alerts
            </p>
          </div>
        </div>

        {/* Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Scheduled Messages Queue Button */}
          <button
            onClick={() => {
              loadScheduledQueue();
              setIsQueueOpen(true);
            }}
            className="h-9 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-2 transition-all border border-slate-200 shadow-2xs"
          >
            <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Scheduled Queue</span>
            {scheduledQueue.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-bold min-w-[18px] text-center">
                {scheduledQueue.length}
              </span>
            )}
          </button>

          {/* Broadcast Announcement Button */}
          <button
            onClick={() => {
              setBroadcastTarget("all");
              setBroadcastChannel("in_app");
              setBroadcastIsScheduled(false);
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setBroadcastScheduleDate(tomorrow.toISOString().split("T")[0]);
              setBroadcastScheduleTime("10:00");
              setIsBroadcastOpen(true);
            }}
            className="h-9 px-3.5 rounded-xl bg-[#111827] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm shadow-slate-900/10"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Broadcast</span>
          </button>

          {/* Bulk SMS & Notifications Button */}
          <button
            onClick={() => {
              setBulkTarget("all");
              setBulkChannel("sms");
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setBulkScheduleDate(tomorrow.toISOString().split("T")[0]);
              setBulkScheduleTime("10:00");
              setIsBulkSMSOpen(true);
            }}
            className="h-9 px-3.5 rounded-xl bg-[#00A884] hover:bg-[#008f6f] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm shadow-emerald-500/20"
          >
            <Smartphone className="w-3.5 h-3.5 text-white" />
            <span>Bulk SMS & Alerts</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh All Threads & Queue"
            className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN 2-WAY MESSENGER INTERFACE (WhatsApp Web Style)
          ───────────────────────────────────────────────────────────── */}
      <div className="h-[750px] max-h-[85vh] rounded-3xl border border-slate-200 overflow-hidden flex shadow-xl bg-[#F0F2F5]">
        {/* ── LEFT COLUMN: STUDENT INBOX LIST ── */}
        <div
          className={`w-full md:w-[280px] lg:w-[300px] xl:w-[330px] flex flex-col bg-white border-r border-slate-200 shrink-0 h-full ${showMobileChat ? "hidden md:flex" : "flex"
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
                  <button
                    onClick={openDirectScheduleModal}
                    title="Schedule guidance for future date/time"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700/60"
                  >
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Schedule</span>
                  </button>

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

              {/* Chat Messages Feed Area */}
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
                      placeholder={`Type guidance reply to ${activeConversation.name}... (Press Enter to send)`}
                      className="w-full pl-4 pr-12 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
                    />
                    {content.length > 0 && (
                      <span className="absolute right-3 text-[10px] font-medium text-slate-400">
                        {content.length}
                      </span>
                    )}
                  </div>

                  {/* Schedule 1-on-1 Clock Button */}
                  <button
                    type="button"
                    onClick={openDirectScheduleModal}
                    title="Schedule this message for later"
                    className="p-2.5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600 transition-all shrink-0"
                  >
                    <Clock className="w-4 h-4 text-indigo-600" />
                  </button>

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
          3. SCHEDULE DIRECT 1-ON-1 MESSAGE MODAL
          ───────────────────────────────────────────────────────────── */}
      {isDirectScheduleOpen && activeConversation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#111827] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Schedule 1-on-1 Guidance</h3>
                  <p className="text-xs text-slate-300">
                    To: {activeConversation.name} ({activeConversation.accountType || "Student"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDirectScheduleOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleDirectSubmit} className="p-5 sm:p-6 space-y-4">
              {/* Delivery Channel Tabs */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Delivery Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "in_app", label: "💬 In-App Only" },
                    { id: "sms", label: "📱 SMS Only" },
                    { id: "both", label: "⚡ In-App + SMS" },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setDirectScheduleChannel(ch.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${directScheduleChannel === ch.id
                        ? "bg-[#111827] text-white border-[#111827] shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Message Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MESSAGE_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setDirectScheduleType(type.value)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${directScheduleType === type.value
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      <type.icon className="w-3.5 h-3.5" />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Message Content</label>
                <textarea
                  rows={4}
                  value={directScheduleContent}
                  onChange={(e) => setDirectScheduleContent(e.target.value)}
                  placeholder={`Write scheduled guidance for ${activeConversation.name}...`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  required
                />
              </div>

              {/* Date & Time Pickers */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Scheduled Date & Time (US Local)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="date"
                      value={directScheduleDate}
                      onChange={(e) => setDirectScheduleDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="time"
                      value={directScheduleTime}
                      onChange={(e) => setDirectScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  The automated scheduler will deliver this message to {activeConversation.name} at the exact set time.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDirectScheduleOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDirectSchedule || !directScheduleContent.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSubmittingDirectSchedule ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  <span>Confirm Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. BROADCAST ANNOUNCEMENT MODAL (Instant + Schedule)
          ───────────────────────────────────────────────────────────── */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#111827] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Broadcast Announcement</h3>
                  <p className="text-xs text-slate-300">Deliver mass guidance or priority alerts</p>
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
              {/* Target Audience */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Target Audience</label>
                  <span className="text-[11px] text-slate-400">
                    Est. {isEstimatingAudience ? "..." : `${bulkAudienceStats.eliteUsers} Elite users`}
                  </span>
                </div>
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

              {/* Delivery Timing Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Delivery Timing</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastIsScheduled(false)}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${!broadcastIsScheduled
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Immediately</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastIsScheduled(true)}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${broadcastIsScheduled
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Schedule for Later</span>
                  </button>
                </div>
              </div>

              {/* Scheduled Date/Time if scheduled */}
              {broadcastIsScheduled && (
                <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 space-y-2 animate-in fade-in">
                  <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Scheduled Delivery Time</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={broadcastScheduleDate}
                      onChange={(e) => setBroadcastScheduleDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                    <input
                      type="time"
                      value={broadcastScheduleTime}
                      onChange={(e) => setBroadcastScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
              )}

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
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-md disabled:opacity-50 ${broadcastIsScheduled
                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    }`}
                >
                  {isBroadcasting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : broadcastIsScheduled ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{broadcastIsScheduled ? "Confirm Schedule" : "Send Broadcast"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. BULK SMS & MULTI-CHANNEL ALERTS MODAL
          ───────────────────────────────────────────────────────────── */}
      {isBulkSMSOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-teal-900 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Bulk SMS & Multi-Channel Alert</h3>
                  <p className="text-xs text-slate-300">Deliver text messages directly to US mobile numbers</p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkSMSOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Audience Target */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Target Audience</label>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {isEstimatingAudience
                      ? "Estimating..."
                      : bulkChannel === "in_app"
                      ? `💬 ${bulkAudienceStats.eliteUsers} Elite Members (In-App)`
                      : bulkChannel === "both"
                      ? `📱 ${bulkAudienceStats.usersWithPhone} SMS (All Tiers) • 💬 ${bulkAudienceStats.eliteUsers} Elite In-App`
                      : `📱 ${bulkAudienceStats.usersWithPhone} Phones (All Tiers) • 👥 ${bulkAudienceStats.totalUsers} Total Accounts`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "all", label: "All Members" },
                    { id: "student", label: "Students Only" },
                    { id: "parent", label: "Parents Only" },
                  ].map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setBulkTarget(target.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${bulkTarget === target.id
                        ? "bg-[#111827] text-white border-[#111827] shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Channel */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Delivery Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "sms", label: "📱 SMS (All Tiers)" },
                    { id: "in_app", label: "💬 In-App (Elite)" },
                    { id: "both", label: "⚡ SMS + In-App" },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setBulkChannel(ch.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${bulkChannel === ch.id
                        ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 font-medium pt-0.5">
                  {bulkChannel === "sms"
                    ? "✓ SMS texts will be sent to all selected students/parents across all tiers (Starter, Scholar, Elite)."
                    : bulkChannel === "in_app"
                    ? "✓ In-App coaching messages will be delivered to active Elite students and parents."
                    : "✓ SMS texts sent across all tiers + In-App coaching messages delivered to Elite students/parents."}
                </p>
              </div>

              {/* Timing Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Delivery Timing</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkIsScheduled(false)}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${!bulkIsScheduled
                      ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Immediately</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkIsScheduled(true)}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${bulkIsScheduled
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Schedule for Later</span>
                  </button>
                </div>
              </div>

              {/* Scheduled Date/Time if scheduled */}
              {bulkIsScheduled && (
                <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 space-y-2 animate-in fade-in">
                  <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Scheduled Delivery Time</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={bulkScheduleDate}
                      onChange={(e) => setBulkScheduleDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                    <input
                      type="time"
                      value={bulkScheduleTime}
                      onChange={(e) => setBulkScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Optional Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Title / Subject (Optional)</label>
                <input
                  type="text"
                  value={bulkTitle}
                  onChange={(e) => setBulkTitle(e.target.value)}
                  placeholder="e.g., Important Scholarship Notice"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Content with character counter and SMS segment indicator */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">SMS / Alert Message</label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {bulkContent.length} chars ({Math.ceil(Math.max(1, bulkContent.length) / 160)} SMS segment)
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={bulkContent}
                  onChange={(e) => setBulkContent(e.target.value)}
                  placeholder="Type message to deliver via SMS text and/or in-app notification..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  required
                />
              </div>

              {/* Twilio Compliance & Delivery Note */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-[11px] text-slate-600">
                <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <p>
                  SMS messages will automatically include standard US carrier compliance formatting (
                  <span className="font-mono text-[10px]">Reply STOP to unsubscribe</span>). Only US phone numbers formatted with valid area codes will be messaged.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkSMSOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingBulk || !bulkContent.trim()}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-md disabled:opacity-50 ${bulkIsScheduled
                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                    : "bg-teal-600 hover:bg-teal-700 shadow-teal-600/20"
                    }`}
                >
                  {isSendingBulk ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : bulkIsScheduled ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                  <span>{bulkIsScheduled ? "Schedule Bulk Delivery" : "Send Bulk Delivery"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. SCHEDULED MESSAGES QUEUE MODAL
          ───────────────────────────────────────────────────────────── */}
      {isQueueOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="bg-[#111827] p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Scheduled Messages Queue</h3>
                  <p className="text-xs text-slate-300">
                    {scheduledQueue.length} pending automated deliveries
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQueueOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
              {isLoadingQueue ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <p className="text-xs font-semibold">Loading scheduled queue...</p>
                </div>
              ) : scheduledQueue.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Clock className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No Pending Scheduled Messages</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    You can schedule direct 1-on-1 guidance or mass announcements using the Schedule buttons.
                  </p>
                </div>
              ) : (
                scheduledQueue.map((item) => {
                  const schedDate = new Date(item.scheduled_for);
                  const isPast = schedDate.getTime() <= Date.now();
                  const dateStr = schedDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const timeStr = schedDate.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });

                  const channelLabel =
                    item.delivery_channel === "sms"
                      ? "📱 SMS"
                      : item.delivery_channel === "both"
                        ? "⚡ In-App + SMS"
                        : "💬 In-App";

                  const targetLabel = item.target_user_id
                    ? `1-on-1: ${item.target_user_name || "Student"}`
                    : `Broadcast: ${item.target_role === "student" ? "Students Only" : item.target_role === "parent" ? "Parents Only" : "All Users"}`;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white transition-all space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-[10px] font-extrabold uppercase tracking-wide">
                            {targetLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-bold">
                            {channelLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {item.message_type || "guidance"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{dateStr} at {timeStr}</span>
                          {isPast && (
                            <span className="text-[10px] text-amber-600 font-semibold">(Due soon)</span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed line-clamp-3 bg-white p-3 rounded-xl border border-slate-100">
                        {item.content}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400 font-medium">
                          Created {new Date(item.created_at || Date.now()).toLocaleDateString()}
                        </span>

                        <button
                          onClick={() => handleCancelScheduled(item.id)}
                          disabled={cancellingId === item.id}
                          className="px-3 py-1 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200/80 transition-all flex items-center gap-1 disabled:opacity-50"
                        >
                          {cancellingId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          <span>Cancel Delivery</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={loadScheduledQueue}
                disabled={isLoadingQueue}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQueue ? "animate-spin text-indigo-600" : ""}`} />
                <span>Refresh Queue</span>
              </button>

              <button
                onClick={() => setIsQueueOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
