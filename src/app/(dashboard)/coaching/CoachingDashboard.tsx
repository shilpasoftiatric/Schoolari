"use client";

import { useState, useEffect } from "react";
import { Trophy, Mail, Bell, Sparkles, ChevronRight, CheckCircle2, Flame, HeartHandshake, Compass, CalendarDays, Video, Users, User, ArrowRight, Send } from "lucide-react";

export function CoachingDashboard({ initialMessages }: { initialMessages: any[] }) {
  const [activeTab, setActiveTab] = useState<"inbox" | "sessions">("inbox");
  const [messages, setMessages] = useState(initialMessages);
  const [activeMessage, setActiveMessage] = useState<any | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [composeTitle, setComposeTitle] = useState("");
  const [composeContent, setComposeContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "sessions" && sessions.length === 0) {
      fetchSessions();
    }
  }, [activeTab]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch("/api/coaching/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleEnroll = async (sessionId: string) => {
    setEnrollingId(sessionId);
    try {
      const res = await fetch("/api/coaching/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      if (res.ok) {
        const { toast } = await import("sonner");
        toast.success("Successfully registered for the session!");
        fetchSessions(); // refresh
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEnrollingId(null);
    }
  };

  const handleSelectMessage = async (msg: any) => {
    setActiveMessage(msg);
    if (!msg.is_read) {
      setMessages(messages.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
      try {
        await fetch("/api/coaching/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: msg.id })
        });
      } catch (err) {
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
      <div className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <HeartHandshake className="w-8 h-8 text-rose-500" />
            College Coach
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Your personal accountability hub. Stay on track with live sessions and guidance.
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex p-1 bg-slate-200/60 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("inbox")}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "inbox" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Mail className="w-4 h-4" /> Inbox
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "sessions" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Video className="w-4 h-4" /> Live Sessions
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === "inbox" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left Column: Inbox List */}
            <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-slate-400" /> Messages
                </h2>
                <button
                  onClick={() => {
                    setIsComposing(true);
                    setActiveMessage(null);
                  }}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  New Message
                </button>
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
                        onClick={() => {
                          handleSelectMessage(msg);
                          setIsComposing(false);
                        }}
                        className={`w-full text-left p-4 rounded-2xl transition-all border ${
                          activeMessage?.id === msg.id && !isComposing
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
                          <p suppressHydrationWarning className={`text-xs truncate mt-1 ${activeMessage?.id === msg.id ? "text-slate-400" : "text-slate-500"}`}>
                            {new Date(msg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Reading Pane */}
            <div className="lg:col-span-2 flex flex-col h-full">
              {isComposing ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-extrabold text-slate-900">Message Your Coach</h2>
                    <p className="text-slate-500 text-sm mt-1">Send a direct message to your coaching team.</p>
                  </div>
                  <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Subject</label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900" 
                        placeholder="e.g. Question about my essay..."
                        value={composeTitle}
                        onChange={e => setComposeTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 flex-1 flex flex-col">
                      <label className="text-sm font-bold text-slate-700">Message</label>
                      <textarea 
                        className="w-full flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none" 
                        placeholder="Type your message here..."
                        value={composeContent}
                        onChange={e => setComposeContent(e.target.value)}
                      />
                    </div>
                    <div className="pt-4 flex gap-3 justify-end">
                      <button 
                        onClick={() => setIsComposing(false)}
                        className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={async () => {
                          if(!composeTitle || !composeContent) return;
                          setIsSending(true);
                          try {
                            const { sendStudentMessage } = await import("@/app/actions/coaching");
                            await sendStudentMessage(`${composeTitle}\n\n${composeContent}`);
                            setIsComposing(false);
                            setComposeTitle("");
                            setComposeContent("");
                            const { toast } = await import("sonner");
                            toast.success("Message sent to coach!");
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setIsSending(false);
                          }
                        }}
                        disabled={isSending || !composeTitle || !composeContent}
                        className="px-6 py-2.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSending ? "Sending..." : "Send Message"} <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : activeMessage ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-200 px-3 py-1 rounded-full">
                        {activeMessage.type}
                      </span>
                      <span suppressHydrationWarning className="text-xs text-slate-400 font-medium">
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
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 min-h-full">
            <div className="mb-8">
              <h2 className="text-2xl font-extrabold text-slate-900">Upcoming Live Sessions</h2>
              <p className="text-slate-500 mt-1">Register for group workshops or view your scheduled 1-on-1 coaching.</p>
            </div>
            
            {loadingSessions ? (
              <div className="flex justify-center p-12">
                <span className="w-8 h-8 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center p-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700">No sessions available</h3>
                <p className="text-slate-500 mt-1">Check back later for upcoming coaching sessions.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sessions.map((session) => (
                  <div key={session.id} className="border border-slate-200 rounded-2xl p-6 flex flex-col hover:border-slate-300 transition-colors bg-slate-50/50">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {session.session_type === 'group' ? (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full">
                            <Users className="w-3.5 h-3.5" /> Group Session
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider rounded-full">
                            <User className="w-3.5 h-3.5" /> 1-on-1 Coaching
                          </span>
                        )}
                      </div>
                      {session.isEnrolled && (
                        <span className="flex items-center gap-1 text-emerald-600 text-sm font-bold">
                          <CheckCircle2 className="w-4 h-4" /> Registered
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{session.title}</h3>
                    <p className="text-sm text-slate-600 mb-6 flex-1 line-clamp-3">{session.description}</p>
                    
                    <div className="bg-white rounded-xl p-4 border border-slate-100 mb-6 flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                        <CalendarDays className="w-6 h-6 text-slate-500" />
                      </div>
                      <div>
                        <p suppressHydrationWarning className="text-sm font-bold text-slate-900">
                          {new Date(session.session_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                        <p suppressHydrationWarning className="text-sm text-slate-500">
                          {new Date(session.session_date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    
                    {session.isEnrolled ? (
                      <a 
                        href={session.meeting_link || "#"} 
                        target="_blank" 
                        rel="noreferrer"
                        className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                          session.meeting_link 
                            ? "bg-slate-900 text-white hover:bg-slate-800" 
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <Video className="w-4 h-4" /> 
                        {session.meeting_link ? "Join Meeting" : "Link pending"}
                      </a>
                    ) : (
                      <button 
                        onClick={() => handleEnroll(session.id)}
                        disabled={enrollingId === session.id}
                        className="w-full py-3 px-4 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        {enrollingId === session.id ? (
                          <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <>Register Now <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
