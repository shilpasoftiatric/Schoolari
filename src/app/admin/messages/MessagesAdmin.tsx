"use client";

import { useState, useTransition } from "react";
import { Send, Radio, Users, User, Compass, Flame, Bell, Sparkles, Mail, BarChart2, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMessageToStudent, broadcastMessage, deleteMessages } from "@/app/actions/admin-messages";
import { toast } from "sonner";

const MESSAGE_TYPES = [
  { value: "guidance", label: "Guidance", icon: Compass, color: "bg-blue-100 text-blue-700" },
  { value: "motivation", label: "Motivation", icon: Flame, color: "bg-orange-100 text-orange-700" },
  { value: "reminder", label: "Reminder", icon: Bell, color: "bg-fuchsia-100 text-fuchsia-700" },
  { value: "announcement", label: "Announcement", icon: Sparkles, color: "bg-emerald-100 text-emerald-700" },
];

export function MessagesAdmin({
  users,
  recentMessages,
  stats,
}: {
  users: any[];
  recentMessages: any[];
  stats: { total: number; unread: number };
}) {
  const [mode, setMode] = useState<"single" | "broadcast">("single");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [messageType, setMessageType] = useState("guidance");
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "student" | "parent">("all");
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [readingMessage, setReadingMessage] = useState<any | null>(null);

  const [isPending, startTransition] = useTransition();

  const filteredUsers = users.filter((u) => {
    const name = u.student_first_name
      ? `${u.student_first_name} ${u.student_last_name}`
      : `${u.first_name || ""}`;
    const email = u.student_email || u.email || "";
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase())
    );
  });

  const getStudentName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return "Student";
    return user.student_first_name ? `${user.student_first_name} ${user.student_last_name}` : user.first_name || "Student";
  };

  const handleSend = () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in the title and content.");
      return;
    }

    if (mode === "single" && !selectedUserId) {
      toast.error("Please select a recipient.");
      return;
    }

    startTransition(async () => {
      let result;
      if (mode === "single") {
        result = await sendMessageToStudent(selectedUserId, title, content, messageType);
      } else {
        result = await broadcastMessage(title, content, messageType, broadcastTarget);
      }

      if (result?.error) {
        toast.error(`Error: ${result.error}`);
      } else {
        const count = (result as any)?.count;
        toast.success(
          mode === "single"
            ? "Message sent successfully!"
            : `Broadcast sent to ${count} users!`
        );
        setTitle("");
        setContent("");
        setSelectedUserId("");
      }
    });
  };

  const handleDelete = () => {
    if (selectedMessages.length === 0) return;
    startTransition(async () => {
      const result = await deleteMessages(selectedMessages);
      if (result?.error) {
        toast.error(`Error: ${result.error}`);
      } else {
        toast.success(`${selectedMessages.length} message(s) deleted.`);
        setSelectedMessages([]);
      }
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedMessages((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: Compose */}
      <div className="lg:col-span-3 space-y-5">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Sent</p>
              <p className="text-3xl font-extrabold text-slate-900">{stats.total.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Unread</p>
              <p className="text-3xl font-extrabold text-slate-900">{stats.unread.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Compose Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-extrabold text-slate-900">Compose Message</h2>

          {/* Mode Tabs */}
          {readingMessage ? (
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Message from {getStudentName(readingMessage.user_id)}</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{readingMessage.title}</p>
                <p className="text-sm text-slate-700 mt-2 bg-white p-3 rounded-lg border border-slate-200">{readingMessage.content}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setReadingMessage(null)}>Clear</Button>
            </div>
          ) : (
            <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
              <button
                onClick={() => setMode("single")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === "single" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                <User className="w-4 h-4" /> Single Student
              </button>
              <button
                onClick={() => setMode("broadcast")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === "broadcast" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                <Radio className="w-4 h-4" /> Broadcast
              </button>
            </div>
          )}

          {/* Recipient */}
          {mode === "single" ? (
            <div className="space-y-2">
              <Label>Recipient</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="border border-slate-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-slate-100">
                  {filteredUsers.slice(0, 20).map((u) => {
                    const name = u.student_first_name
                      ? `${u.student_first_name} ${u.student_last_name}`
                      : `${u.first_name || ""}`.trim() || "Unknown";
                    const email = u.student_email || u.email || "";
                    return (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${selectedUserId === u.id ? "bg-violet-50" : "hover:bg-slate-50"}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {name[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{name}</p>
                          <p className="text-xs text-slate-500">{email}</p>
                        </div>
                        {selectedUserId === u.id && <Check className="w-4 h-4 text-violet-600 ml-auto" />}
                      </button>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-sm">No users found</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Send To</Label>
              <div className="flex gap-3">
                {[
                  { value: "all", label: "Everyone", icon: Users },
                  { value: "student", label: "Students Only", icon: User },
                  { value: "parent", label: "Parents Only", icon: User },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setBroadcastTarget(opt.value as typeof broadcastTarget)}
                    className={`flex-1 py-2.5 px-3 rounded-xl border-2 text-sm font-bold transition-all ${broadcastTarget === opt.value ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Type */}
          <div className="space-y-2">
            <Label>Message Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MESSAGE_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => setMessageType(t.value)}
                    className={`flex items-center gap-2 py-2 px-3 rounded-xl border-2 text-sm font-bold transition-all ${messageType === t.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                  >
                    <Icon className="w-4 h-4" /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title & Content */}
          <div className="space-y-2">
            <Label>Subject / Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete your scholarship essays this week!"
            />
          </div>
          <div className="space-y-2">
            <Label>Message Body</Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
              placeholder="Write your message here..."
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={isPending}
            className="w-full gap-2 bg-slate-900 text-white hover:bg-slate-800 h-11 text-sm font-bold"
          >
            {isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === "single" ? <Send className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
                {mode === "single" ? "Send Message" : "Broadcast to All"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right: Sent Log */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="font-bold text-slate-900">Message History</h2>
            {selectedMessages.length > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
                className="gap-1.5 h-8 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedMessages.length})
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {recentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Mail className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm">No messages sent yet.</p>
              </div>
            ) : (
              recentMessages.map((msg) => {
                const isStudent = msg.title?.startsWith("[STUDENT]");
                const displayTitle = isStudent ? msg.title.replace("[STUDENT]", "").trim() : msg.title;
                const typeObj = MESSAGE_TYPES.find((t) => t.value === msg.type);
                const Icon = isStudent ? User : typeObj?.icon || Mail;
                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      if (isStudent) {
                        setReadingMessage({ ...msg, title: displayTitle });
                        setMode("single");
                        setSelectedUserId(msg.user_id);
                        setTitle(`Re: ${displayTitle}`);
                      } else {
                        toggleSelect(msg.id);
                      }
                    }}
                    className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${selectedMessages.includes(msg.id) || readingMessage?.id === msg.id ? "bg-violet-50" : "hover:bg-slate-50"}`}
                  >
                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${isStudent ? "bg-rose-100 text-rose-600" : typeObj?.color || "bg-slate-100 text-slate-500"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-sm text-slate-900 truncate">
                        {isStudent ? (
                           <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded mr-2 text-[10px] uppercase">From {getStudentName(msg.user_id)}</span>
                        ) : null}
                        {displayTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold uppercase ${isStudent ? (msg.is_read ? "text-slate-400" : "text-rose-500") : (msg.is_read ? "text-slate-400" : "text-amber-500")}`}>
                          {isStudent ? (msg.is_read ? "Read" : "Unread (New)") : (msg.is_read ? "Read" : "Sent (Unread)")}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    {selectedMessages.includes(msg.id) && (
                      <Check className="w-4 h-4 text-violet-600 shrink-0 mt-1" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
