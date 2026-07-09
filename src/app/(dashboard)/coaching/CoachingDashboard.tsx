"use client";

import { useState } from "react";
import { Trophy, Mail, Bell, Sparkles, ChevronRight, CheckCircle2, Flame, HeartHandshake, Compass } from "lucide-react";

export function CoachingDashboard({ initialMessages }: { initialMessages: any[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [activeMessage, setActiveMessage] = useState<any | null>(null);

  const handleSelectMessage = async (msg: any) => {
    setActiveMessage(msg);
    if (!msg.is_read) {
      // Optimistic update
      setMessages(messages.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
      try {
        const res = await fetch("/api/coaching/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: msg.id })
        });
        if (!res.ok) throw new Error("Failed to mark as read");
      } catch (err) {
        // Revert on failure
        setMessages(messages.map(m => m.id === msg.id ? { ...m, is_read: false } : m));
      }
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'guidance': return <Compass className="w-5 h-5 text-blue-500" />;
      case 'motivation': return <Flame className="w-5 h-5 text-orange-500" />;
      case 'reminder': return <Bell className="w-5 h-5 text-fuchsia-500" />;
      case 'announcement': return <Sparkles className="w-5 h-5 text-emerald-500" />;
      default: return <Mail className="w-5 h-5 text-slate-500" />;
    }
  };

  const getBg = (type: string) => {
    switch(type) {
      case 'guidance': return "bg-blue-50";
      case 'motivation': return "bg-orange-50";
      case 'reminder': return "bg-fuchsia-50";
      case 'announcement': return "bg-emerald-50";
      default: return "bg-slate-50";
    }
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <HeartHandshake className="w-8 h-8 text-rose-500" />
          Coaching Center
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Your personal accountability hub. Stay on track with weekly guidance and reminders.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Left Column: Inbox List */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-slate-400" /> Inbox
            </h2>
            {unreadCount > 0 && (
              <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount} Unread
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-slate-200" />
                <p>You're all caught up! No messages yet.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg)}
                  className={`w-full text-left p-4 rounded-2xl transition-all border ${
                    activeMessage?.id === msg.id 
                      ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                      : msg.is_read 
                        ? "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                        : "bg-rose-50 border-rose-100 text-slate-900 shadow-sm"
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${activeMessage?.id === msg.id ? "bg-white/20" : getBg(msg.type)}`}>
                      {activeMessage?.id === msg.id ? (
                        <div className="text-white">{getIcon(msg.type)}</div>
                      ) : (
                        getIcon(msg.type)
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider ${activeMessage?.id === msg.id ? "text-slate-300" : "text-slate-400"}`}>
                          {msg.type}
                        </span>
                        {!msg.is_read && activeMessage?.id !== msg.id && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                        )}
                      </div>
                      <h3 className={`font-bold truncate ${!msg.is_read && activeMessage?.id !== msg.id ? "text-slate-900" : ""}`}>
                        {msg.title}
                      </h3>
                      <p className={`text-xs truncate mt-1 ${activeMessage?.id === msg.id ? "text-slate-400" : "text-slate-500"}`}>
                        {new Date(msg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Reading Pane & Accountability */}
        <div className="lg:col-span-2 flex flex-col gap-6 min-h-0 h-full">
          
          {activeMessage ? (
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-200 px-3 py-1 rounded-full">
                    {activeMessage.type}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {new Date(activeMessage.created_at).toLocaleString()}
                  </span>
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">
                  {activeMessage.title}
                </h2>
              </div>
              <div className="p-8 flex-1 overflow-y-auto">
                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                  {activeMessage.content}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl border border-indigo-100 p-12 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mb-6">
                <Compass className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Select a message</h2>
              <p className="text-slate-500 max-w-md">
                Click on a message in your inbox to read your latest guidance, announcements, and motivational check-ins.
              </p>
            </div>
          )}

          {/* Persistent Accountability Widget */}
          <div className="shrink-0 bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Focus of the Week</h3>
                <p className="font-medium text-slate-300">Complete your Profile and explore the AI Brainstorm Tool.</p>
              </div>
            </div>
            <button className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
