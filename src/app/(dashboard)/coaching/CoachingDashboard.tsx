"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Video,
  Users,
  User,
  CheckCircle2,
  CalendarDays,
  ChevronRight,
  MessageSquare,
  History,
  Star,
  BookOpen,
  Bell,
  Sparkles,
  ExternalLink,
  Target,
  ClipboardList,
  Headphones,
} from "lucide-react";
import { toast } from "sonner";
import { CoachingIllustration } from "./CoachingIllustration";
import {
  SessionDetailsModal,
  MessageCoachModal,
  CoachingCalendarModal,
  CoachingHistoryModal,
  SessionFeedbackModal,
  CoachingResourcesModal,
} from "./CoachingModals";
import { UpgradeFlowModal } from "@/components/ui/UpgradeFlowModal";
import type { SubscriptionPlan } from "@/lib/subscription";
import type { CoachInfo, CoachingContact } from "@/app/actions/coaching";

interface CoachingDashboardProps {
  initialMessages?: any[];
  initialSessions?: any[];
  initialContacts?: CoachingContact[];
  coachInfo?: CoachInfo;
  userPlan?: SubscriptionPlan;
  userName?: string;
}

export function CoachingDashboard({
  initialMessages = [],
  initialSessions = [],
  initialContacts = [],
  coachInfo,
  userPlan = "elite",
  userName = "Student",
}: CoachingDashboardProps) {
  // State for sessions initialized directly from server
  const [sessions, setSessions] = useState<any[]>(initialSessions);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  // Modals state
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Messages state
  const [messages, setMessages] = useState<any[]>(initialMessages);

  // Keep sessions synced if initialSessions changes
  useEffect(() => {
    if (initialSessions && initialSessions.length > 0) {
      setSessions(initialSessions);
    }
  }, [initialSessions]);

  const handleEnroll = async (sessionId: string) => {
    setEnrollingId(sessionId);
    try {
      const { enrollInSession } = await import("@/app/actions/coaching");
      await enrollInSession(sessionId);
      toast.success("Successfully registered for the session!");
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, isEnrolled: true } : s))
      );
      if (selectedSession && selectedSession.id === sessionId) {
        setSelectedSession((prev: any) => ({ ...prev, isEnrolled: true }));
      }
    } catch (e: any) {
      console.error("Enroll error:", e);
      toast.error(e.message || "Failed to register for session");
    } finally {
      setEnrollingId(null);
    }
  };

  const handleJoinClick = (session: any) => {
    if (!session.isEnrolled) {
      handleEnroll(session.id);
      return;
    }
    if (session.meeting_link) {
      window.open(session.meeting_link, "_blank", "noopener,noreferrer");
    } else {
      toast.info("Meeting link will activate 15 minutes before the session.");
    }
  };

  const openDetails = (session: any) => {
    setSelectedSession(session);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 max-w-full overflow-hidden pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. Clean Page Header with Reference Coach Illustration
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 pb-1">
        <div className="space-y-1.5 max-w-xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            College Coach
          </h1>
          <p className="text-slate-500 text-sm sm:text-base font-normal leading-relaxed">
            Your personal guide for colleges and scholarships.
            <br />
            We&apos;re here to help you every step of the way!
          </p>
        </div>

        {/* Exact Reference Coach Illustration */}
        <div className="w-full md:w-auto flex justify-center md:justify-end shrink-0">
          <CoachingIllustration className="w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px]" />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. Two-Column Dashboard Layout
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── LEFT COLUMN (2 Cols) ── */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Card 1: Upcoming Coaching Sessions */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-sm space-y-5 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Upcoming Coaching Sessions
              </h2>

              <button
                type="button"
                onClick={() => setIsCalendarOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-violet-50 text-[#635BFF] border border-[#D5D2FE] font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs shrink-0"
              >
                <Calendar className="w-3.5 h-3.5 text-[#635BFF]" />
                View Calendar
              </button>
            </div>

            {/* Sessions List */}
            <div className="space-y-4 min-w-0">
              {loadingSessions ? (
                <div className="space-y-3">
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      className="p-4 sm:p-5 rounded-2xl border border-slate-100 bg-slate-50/60 animate-pulse flex items-center gap-4"
                    >
                      <div className="w-16 h-20 bg-slate-200 rounded-2xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-slate-200 rounded-lg w-1/3" />
                        <div className="h-4 bg-slate-200 rounded-lg w-1/2" />
                      </div>
                      <div className="w-24 h-9 bg-slate-200 rounded-xl shrink-0" />
                    </div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-slate-200/70 border-dashed space-y-2">
                  <CalendarDays className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No upcoming sessions scheduled</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    New 1:1 advisory slots and group workshops are posted weekly.
                  </p>
                </div>
              ) : (
                sessions.map((session, idx) => {
                  const sDate = new Date(session.session_date);
                  const monthName = sDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                  const dayNum = sDate.getDate();
                  const dayOfWeek = sDate.toLocaleDateString("en-US", { weekday: "short" });
                  const timeFormatted = sDate.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const isPremium1on1 =
                    session.session_type === "1:1" || session.session_type === "private" || session.session_type === "individual";

                  return (
                    <div
                      key={session.id || idx}
                      className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-100 hover:border-violet-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0"
                    >
                      {/* Left: Date Badge & Details */}
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Date Box */}
                        <div
                          className={`w-16 h-20 sm:w-18 sm:h-20 rounded-2xl flex flex-col items-center justify-center p-2 shrink-0 text-center ${isPremium1on1 ? "bg-[#F4F1FF]" : "bg-[#EAF5FF]"
                            }`}
                        >
                          <span
                            className={`text-[10px] font-extrabold uppercase tracking-wider ${isPremium1on1 ? "text-[#7C5CFC]" : "text-[#2F80ED]"
                              }`}
                          >
                            {monthName}
                          </span>
                          <span className="text-2xl font-black text-slate-900 leading-none my-0.5">
                            {dayNum}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">
                            {dayOfWeek}
                          </span>
                        </div>

                        {/* Title & Info */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                              {session.title}
                            </h3>
                            {isPremium1on1 ? (
                              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#F4F1FF] text-[#7C5CFC]">
                                Premium
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#EAF5FF] text-[#2F80ED]">
                                Group
                              </span>
                            )}
                          </div>

                          <div className="flex items-center flex-wrap gap-3 sm:gap-4 text-xs font-normal text-slate-500">
                            <span className="flex items-center gap-1.5 whitespace-nowrap">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {timeFormatted} –{" "}
                              {new Date(
                                sDate.getTime() + (session.duration_minutes || 60) * 60000
                              ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>

                            <span className="flex items-center gap-1.5 whitespace-nowrap">
                              <Video className="w-3.5 h-3.5 text-slate-400" />
                              Virtual (Zoom)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleJoinClick(session)}
                          disabled={enrollingId === session.id}
                          className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#635BFF] hover:bg-[#5249E0] text-white shadow-sm transition-all flex items-center justify-center min-w-[110px]"
                        >
                          {session.isEnrolled ? "Join Session" : "Register"}
                        </button>

                        <button
                          type="button"
                          onClick={() => openDetails(session)}
                          className="text-xs font-semibold text-[#635BFF] hover:text-[#5249E0] transition-colors block text-center"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 2: After Every Session, We Help You Take Action */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-sm space-y-5 min-w-0">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                After Every Session, We Help You Take Action
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl">
                Your coach will assign action items that automatically appear in your Dashboard under{" "}
                <span className="font-semibold text-slate-700">Today&apos;s Priorities</span> and{" "}
                <span className="font-semibold text-slate-700">This Week&apos;s Goals</span>.
              </p>
            </div>

            {/* 3-Step Visual Diagram */}
            <div className="pt-2 pb-1">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-2 bg-[#FAF9FF] p-5 sm:p-6 rounded-2xl border border-violet-50/60 max-w-xl">
                {/* Step 1: Talk with coach */}
                <div className="flex flex-col items-center text-center space-y-2 flex-1">
                  <div className="w-14 h-14 rounded-full bg-[#EAF5FF] flex items-center justify-center text-[#2F80ED] shadow-xs">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    Talk with
                    <br />
                    your coach
                  </p>
                </div>

                {/* Arrow 1 */}
                <div className="text-slate-300 font-bold text-lg hidden sm:block">→</div>

                {/* Step 2: Get action items */}
                <div className="flex flex-col items-center text-center space-y-2 flex-1">
                  <div className="w-14 h-14 rounded-full bg-[#F4F1FF] flex items-center justify-center text-[#7C5CFC] shadow-xs">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    Get action
                    <br />
                    items
                  </p>
                </div>

                {/* Arrow 2 */}
                <div className="text-slate-300 font-bold text-lg hidden sm:block">→</div>

                {/* Step 3: Achieve college goals */}
                <div className="flex flex-col items-center text-center space-y-2 flex-1">
                  <div className="w-14 h-14 rounded-full bg-[#FFF1EE] flex items-center justify-center text-[#EB5757] shadow-xs">
                    <Target className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    Achieve your
                    <br />
                    college goals!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: How Coaching Works */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-sm space-y-5 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              How Coaching Works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {/* Pillar 1 */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#F4F1FF] text-[#7C5CFC] flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#7C5CFC]">Premium Members</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    1–2 live individual virtual coaching sessions per month.
                  </p>
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#E6F9F5] text-[#27AE60] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#27AE60]">Coaching Members</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    1 live virtual group coaching session per month.
                  </p>
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#FFF6E9] text-[#F2994A] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">After Each Session</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Action items, reminders, and follow-ups appear in your Dashboard, Messages, and Calendar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Reminder Alert Banner */}
          <div className="bg-[#E8F8F5] border border-[#D0F2EB] rounded-2xl p-3.5 px-4 flex items-center gap-3 text-xs text-[#0D6857] font-medium min-w-0">
            <Bell className="w-4 h-4 text-[#10B981] shrink-0" />
            <p className="leading-relaxed">
              You will receive reminders and follow-ups for your sessions, action items, and important announcements.
            </p>
          </div>
        </div>

        {/* ── RIGHT COLUMN (1 Col) ── */}
        <div className="lg:col-span-1 space-y-6 min-w-0">
          {/* Card 1: Your Coach */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4 min-w-0">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Your Coach</h2>

            <div className="flex items-center gap-3.5">
              {coachInfo?.avatarUrl ? (
                <img
                  src={coachInfo.avatarUrl}
                  alt={coachInfo.name}
                  className="w-14 h-14 rounded-full object-cover shrink-0 ring-2 ring-slate-100 shadow-2xs"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white flex items-center justify-center font-black text-lg shadow-md shadow-violet-200 ring-2 ring-slate-100 shrink-0">
                  {(coachInfo?.name || "Admin")
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
              )}

              <div className="space-y-0.5 min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {coachInfo?.name || "Super Admin"}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {coachInfo?.displayTitle || "Lead Admissions Director"}
                </p>
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 fill-[#F2C94C] text-[#F2C94C]" />
                  {coachInfo?.rating || 4.9}{" "}
                  <span className="text-slate-400 font-normal">
                    ({coachInfo?.studentsCount || 230}+ students)
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMessageOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-violet-50 text-[#635BFF] border border-[#D5D2FE] font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
            >
              <MessageSquare className="w-4 h-4 text-[#635BFF]" />
              Message Coach
            </button>
          </div>

          {/* Card 2: Quick Actions */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-2 min-w-0">
            <h2 className="text-base font-bold text-slate-900 tracking-tight mb-3">
              Quick Actions
            </h2>

            {/* Action 1: Register for Group Session */}
            <button
              type="button"
              onClick={() => {
                const groupSession = sessions.find((s) => s.session_type === "group");
                if (groupSession) {
                  openDetails(groupSession);
                } else {
                  setIsCalendarOpen(true);
                }
              }}
              className="w-full p-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#E6F9F5] text-[#27AE60] flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                  Register for Group Session
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Action 2: View Coaching History */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="w-full p-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#EAF5FF] text-[#2F80ED] flex items-center justify-center shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                  View Coaching History
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Action 3: Session Feedback */}
            <button
              type="button"
              onClick={() => setIsFeedbackOpen(true)}
              className="w-full p-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#FFF6E9] text-[#F2994A] flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                  Session Feedback
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Action 4: Coaching Resources */}
            <button
              type="button"
              onClick={() => setIsResourcesOpen(true)}
              className="w-full p-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#F4F1FF] text-[#7C5CFC] flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                  Coaching Resources
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. Interactive Modals
          ───────────────────────────────────────────────────────────── */}
      <SessionDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        session={selectedSession}
        onEnroll={handleEnroll}
        isEnrolling={enrollingId === selectedSession?.id}
      />

      <MessageCoachModal
        isOpen={isMessageOpen}
        onClose={() => setIsMessageOpen(false)}
        coachName={coachInfo?.name || "Super Admin"}
        initialMessages={messages}
        contacts={initialContacts}
        onMessageSent={() => { }}
      />

      <CoachingCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        sessions={sessions}
        onSelectSession={(s) => openDetails(s)}
      />

      <CoachingHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
      />

      <SessionFeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        coachName={coachInfo?.name || "Super Admin"}
      />

      <CoachingResourcesModal
        isOpen={isResourcesOpen}
        onClose={() => setIsResourcesOpen(false)}
      />

      <UpgradeFlowModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        targetPlan="elite"
        currentPlan={userPlan}
        featureName="1-on-1 College Coaching"
      />
    </div>
  );
}
