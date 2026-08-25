"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Calendar, Trash2, Video, ListTodo, User, Search, Check, X, BookOpen, Star, MessageSquare, ChevronLeft, ChevronRight, FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getAdminCoachingSessions,
  getAdminCoachingFeedback,
  createSession,
  updateSession,
  deleteSession,
  assignActionItem,
  updateAttendance,
  updateCoachingNotes,
  type CoachingResourceItem,
  type AdminCoachingFeedbackItem
} from "@/app/actions/admin-coaching";
import { CoachingResourcesAdmin } from "./CoachingResourcesAdmin";

export function CoachingAdminTable({
  initialSessions,
  studentsList = [],
  initialResources = [],
  initialFeedback = []
}: {
  initialSessions: any[];
  studentsList?: any[];
  initialResources?: CoachingResourceItem[];
  initialFeedback?: AdminCoachingFeedbackItem[];
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>(initialSessions);
  const [feedback, setFeedback] = useState<AdminCoachingFeedbackItem[]>(initialFeedback);
  const [isCreating, setIsCreating] = useState(false);
  const [isManagingResources, setIsManagingResources] = useState(false);
  const [isViewingFeedback, setIsViewingFeedback] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [viewingSessionFeedback, setViewingSessionFeedback] = useState<{
    session: any;
    reviews: AdminCoachingFeedbackItem[];
    avgRating: string;
  } | null>(null);

  // Filter Tab State: 'all' | 'individual' | 'group'
  const [categoryFilter, setCategoryFilter] = useState<"all" | "individual" | "group">("all");

  // Create Session Form State
  const [sessionType, setSessionType] = useState<"group" | "individual">("group");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Edit Session Form State
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [editSessionType, setEditSessionType] = useState<"group" | "individual">("group");
  const [editSelectedStudentIds, setEditSelectedStudentIds] = useState<string[]>([]);
  const [editStudentSearchQuery, setEditStudentSearchQuery] = useState("");

  // Assign Task State
  const [assigningStudent, setAssigningStudent] = useState<any | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  // Notes State
  const [notingStudent, setNotingStudent] = useState<any | null>(null);
  const [coachingNotes, setCoachingNotes] = useState("");

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  useEffect(() => {
    setFeedback(initialFeedback);
  }, [initialFeedback]);

  const refreshSessions = async () => {
    try {
      const latest = await getAdminCoachingSessions();
      setSessions(latest);
    } catch (err) {
      console.error("Failed to refresh coaching sessions:", err);
    }
  };

  const refreshFeedback = async () => {
    try {
      const latest = await getAdminCoachingFeedback();
      setFeedback(latest);
    } catch (err) {
      console.error("Failed to refresh coaching feedback:", err);
    }
  };

  // Real-time live synchronization for coaching sessions, enrollments, and feedback
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("coaching-admin-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coaching_enrollments" },
        () => {
          refreshSessions();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coaching_sessions" },
        () => {
          refreshSessions();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coaching_feedback" },
        () => {
          refreshFeedback();
          refreshSessions();
        }
      )
      .on(
        "broadcast",
        { event: "coaching_update" },
        () => {
          refreshFeedback();
          refreshSessions();
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (sessionType === "individual" && selectedStudentIds.length === 0) {
      import("sonner").then(({ toast }) => {
        toast.error("Please select a student for this 1-on-1 session.");
      });
      return;
    }

    const formData = new FormData(e.currentTarget);
    const sessionDateVal = formData.get("session_date") as string;
    if (!sessionDateVal || new Date(sessionDateVal).getTime() < Date.now() - 60000) {
      import("sonner").then(({ toast }) => {
        toast.error("Please select a present or future date and time for this session.");
      });
      return;
    }

    formData.set("session_type", sessionType);
    formData.set("student_ids", JSON.stringify(selectedStudentIds));

    const res = await createSession(formData);
    if (res?.error) {
      import("sonner").then(({ toast }) => {
        toast.error(`Failed to create session: ${res.error}`);
      });
      return;
    }

    setIsCreating(false);
    setSelectedStudentIds([]);
    setStudentSearchQuery("");
    setSessionType("group");
    await refreshSessions();
    router.refresh();

    import("sonner").then(({ toast }) => {
      toast.success("Coaching session created successfully!");
    });
  };

  const handleStartEdit = (session: any) => {
    setEditingSession(session);
    const type =
      session.session_type === "individual" ||
        session.session_type === "1:1" ||
        session.session_type === "private"
        ? "individual"
        : "group";
    setEditSessionType(type);
    const enrolledIds = (session.enrollments || [])
      .map((e: any) => e.student_id || e.id)
      .filter(Boolean);
    setEditSelectedStudentIds(enrolledIds);
    setEditStudentSearchQuery("");
    setIsCreating(false);
    setIsManagingResources(false);
    setIsViewingFeedback(false);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSession) return;

    if (editSessionType === "individual" && editSelectedStudentIds.length === 0) {
      import("sonner").then(({ toast }) => {
        toast.error("Please select a student for this 1-on-1 session.");
      });
      return;
    }

    const formData = new FormData(e.currentTarget);
    const sessionDateVal = formData.get("session_date") as string;
    if (!sessionDateVal || new Date(sessionDateVal).getTime() < Date.now() - 60000) {
      import("sonner").then(({ toast }) => {
        toast.error("Please select a present or future date and time for this session.");
      });
      return;
    }

    formData.set("session_type", editSessionType);
    formData.set("student_ids", JSON.stringify(editSelectedStudentIds));

    const res = await updateSession(editingSession.id, formData);
    if (res?.error) {
      import("sonner").then(({ toast }) => {
        toast.error(`Failed to update session: ${res.error}`);
      });
      return;
    }

    setEditingSession(null);
    await refreshSessions();
    router.refresh();

    import("sonner").then(({ toast }) => {
      toast.success("Coaching session updated successfully!");
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this session?")) {
      await deleteSession(id);
      await refreshSessions();
      router.refresh();
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningStudent) return;

    await assignActionItem(
      assigningStudent.student_id,
      taskTitle,
      "COACHING",
      taskDueDate
    );

    setAssigningStudent(null);
    setTaskTitle("");
    setTaskDueDate("");

    import("sonner").then(({ toast }) => {
      toast.success("Action item assigned to student's dashboard!");
    });
  };

  const handleAttendanceChange = async (enrollmentId: string, status: string) => {
    await updateAttendance(enrollmentId, status);
    await refreshSessions();
    router.refresh();
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notingStudent) return;

    const enrollmentId = notingStudent.id;
    const newNotes = coachingNotes.trim();

    // Optimistic UI update
    setSessions((prev) =>
      prev.map((sess) => ({
        ...sess,
        enrollments: (sess.enrollments || []).map((en: any) =>
          en.id === enrollmentId ? { ...en, internal_notes: newNotes } : en
        ),
      }))
    );

    setNotingStudent(null);
    setCoachingNotes("");

    try {
      await updateCoachingNotes(enrollmentId, newNotes);
      await refreshSessions();
      router.refresh();

      import("sonner").then(({ toast }) => {
        toast.success("Coaching notes saved securely.");
      });
    } catch (err) {
      console.error("Error saving note:", err);
    }
  };

  const filteredStudents = (studentsList || []).filter((s: any) => {
    if (!studentSearchQuery.trim()) return true;
    const q = studentSearchQuery.toLowerCase().trim();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  const selectedSingleStudent = selectedStudentIds.length === 1
    ? (studentsList || []).find((s: any) => s.id === selectedStudentIds[0])
    : null;

  const filteredEditStudents = (studentsList || []).filter((s: any) => {
    if (!editStudentSearchQuery.trim()) return true;
    const q = editStudentSearchQuery.toLowerCase().trim();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  const editSelectedSingleStudent = editSelectedStudentIds.length === 1
    ? (studentsList || []).find((s: any) => s.id === editSelectedStudentIds[0])
    : null;

  // Local ISO string (YYYY-MM-DDTHH:mm) for min date/time attribute & prefill clamping
  const getNowLocalISO = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getEditSessionDateInitialValue = (sessionDateStr: string | null | undefined) => {
    const nowISO = getNowLocalISO();
    if (!sessionDateStr) return nowISO;
    const d = new Date(sessionDateStr);
    if (isNaN(d.getTime()) || d.getTime() < Date.now()) {
      return nowISO;
    }
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const localMinDateTime = getNowLocalISO();

  const [feedbackPage, setFeedbackPage] = useState(1);
  const FEEDBACK_PER_PAGE = 10;
  const totalFeedbackPages = Math.ceil(feedback.length / FEEDBACK_PER_PAGE) || 1;
  const paginatedFeedback = feedback.slice(
    (feedbackPage - 1) * FEEDBACK_PER_PAGE,
    feedbackPage * FEEDBACK_PER_PAGE
  );

  const avgRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + (Number(f.rating) || 5), 0) / feedback.length).toFixed(1)
    : "0.0";

  const allCount = sessions.length;
  const individualCount = sessions.filter(
    (s) => s.session_type === "individual" || s.session_type === "1:1" || s.session_type === "private"
  ).length;
  const groupCount = sessions.filter(
    (s) => s.session_type === "group" || !s.session_type
  ).length;

  const filteredSessions = sessions.filter((s) => {
    if (categoryFilter === "individual") {
      return s.session_type === "individual" || s.session_type === "1:1" || s.session_type === "private";
    }
    if (categoryFilter === "group") {
      return s.session_type === "group" || !s.session_type;
    }
    return true;
  }).sort((a, b) => {
    const timeA = new Date(a.session_date).getTime();
    const timeB = new Date(b.session_date).getTime();
    const nowTime = Date.now();
    const isPastA = timeA < nowTime;
    const isPastB = timeB < nowTime;

    if (isPastA !== isPastB) {
      return isPastA ? 1 : -1;
    }

    // If both active, earlier first. If both past, latest first.
    return isPastA ? timeB - timeA : timeA - timeB;
  });

  return (
    <div className="space-y-6">

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <span>{sessions.length} total sessions</span>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {/* Student Feedback Button */}
          <Button
            type="button"
            onClick={() => {
              setIsViewingFeedback(!isViewingFeedback);
              if (!isViewingFeedback) {
                setIsManagingResources(false);
                setIsCreating(false);
              }
            }}
            variant="outline"
            className={`gap-2 text-xs h-9 font-bold flex-1 sm:flex-none border-amber-200 transition-all ${isViewingFeedback
              ? "bg-amber-50 border-amber-500 text-amber-800 shadow-xs ring-2 ring-amber-200"
              : "text-amber-700 hover:bg-amber-50/70 hover:border-amber-300"
              }`}
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            {isViewingFeedback ? "Close Feedback" : `Student Feedback (${feedback.length})`}
          </Button>

          {/* Coaching Resources Button */}
          <Button
            type="button"
            onClick={() => {
              setIsManagingResources(!isManagingResources);
              if (!isManagingResources) {
                setIsViewingFeedback(false);
                setIsCreating(false);
              }
            }}
            variant="outline"
            className={`gap-2 text-xs h-9 font-bold flex-1 sm:flex-none border-indigo-200 transition-all ${isManagingResources
              ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs ring-2 ring-indigo-200"
              : "text-indigo-600 hover:bg-indigo-50/70 hover:border-indigo-300"
              }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            {isManagingResources ? "Close Resources" : "Coaching Resources"}
          </Button>

          {/* Create Session Button */}
          <Button
            type="button"
            onClick={() => {
              setIsCreating(!isCreating);
              if (!isCreating) {
                setIsManagingResources(false);
                setIsViewingFeedback(false);
                setSessionType("group");
                setSelectedStudentIds([]);
                setStudentSearchQuery("");
              }
            }}
            className="gap-2 text-xs h-9 font-bold bg-slate-900 text-white hover:bg-slate-800 flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4" /> {isCreating ? "Close Form" : "Create Session"}
          </Button>
        </div>
      </div>

      {/* Category Filter Tabs (Below the Header Bar) */}
      {!isCreating && !isManagingResources && !isViewingFeedback && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${categoryFilter === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
          >
            <span>All Sessions</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${categoryFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
              }`}>
              {allCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("individual")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${categoryFilter === "individual"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-purple-50/50 hover:text-purple-700 hover:border-purple-200"
              }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>1-on-1 Sessions</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${categoryFilter === "individual" ? "bg-purple-700 text-white" : "bg-purple-50 text-purple-700"
              }`}>
              {individualCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("group")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${categoryFilter === "group"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50/50 hover:text-indigo-700 hover:border-indigo-200"
              }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Group Sessions</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${categoryFilter === "group" ? "bg-indigo-700 text-white" : "bg-indigo-50 text-indigo-700"
              }`}>
              {groupCount}
            </span>
          </button>
        </div>
      )}

      {/* Student Feedback Section */}
      {isViewingFeedback && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> Student Feedback & Ratings
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {feedback.length} reviews
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
              <span className="text-2xl font-black">{avgRating}</span>
              <div className="text-xs">
                <div className="flex text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${feedback.length > 0 && s <= Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"}`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-slate-600">{feedback.length} total reviews</span>
              </div>
            </div>
          </div>

          {feedback.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No student feedback submitted yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                When students complete sessions and submit ratings via their coaching dashboard, their comments will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedFeedback.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4.5 space-y-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.studentName}</h4>
                        <p className="text-[11px] text-slate-500">{item.studentEmail}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${s <= item.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-black text-slate-700 ml-1">{item.rating}.0</span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-150 text-xs text-slate-700 leading-relaxed italic">
                      "{item.comments}"
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                      <span className="text-violet-600 font-bold">{item.sessionTitle || "General Coaching"}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls (10 items per page) */}
              {totalFeedbackPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">
                    Showing {((feedbackPage - 1) * FEEDBACK_PER_PAGE) + 1}–{Math.min(feedbackPage * FEEDBACK_PER_PAGE, feedback.length)} of {feedback.length} reviews
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFeedbackPage((p) => Math.max(1, p - 1))}
                      disabled={feedbackPage === 1}
                      className="h-8 px-2.5 text-xs font-bold gap-1 rounded-xl"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </Button>

                    <div className="flex items-center gap-1 px-2 text-xs font-bold text-slate-700">
                      <span>{feedbackPage}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-500">{totalFeedbackPages}</span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFeedbackPage((p) => Math.min(totalFeedbackPages, p + 1))}
                      disabled={feedbackPage === totalFeedbackPages}
                      className="h-8 px-2.5 text-xs font-bold gap-1 rounded-xl"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Coaching Resources Management Section (Quick Access) */}
      {isManagingResources && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <CoachingResourcesAdmin initialResources={initialResources || []} />
        </div>
      )}

      {/* Create Form */}
      {isCreating && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Create New Session</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input name="title" required placeholder="e.g. Essay Brainstorming" />
              </div>
              <div className="space-y-2">
                <Label>Session Type</Label>
                <select
                  name="session_type"
                  value={sessionType}
                  onChange={(e) => {
                    const newType = e.target.value as "group" | "individual";
                    setSessionType(newType);
                    if (newType === "group") setSelectedStudentIds([]);
                  }}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="group">Group Coaching</option>
                  <option value="individual">1-on-1 Session</option>
                </select>
              </div>

              {/* 1-on-1 Student Selection Box */}
              {sessionType === "individual" && (
                <div className="md:col-span-2 space-y-3 p-4 bg-purple-50/70 border border-purple-200 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label className="text-purple-950 font-bold flex items-center gap-1.5 text-sm">
                        <User className="w-4 h-4 text-purple-600" />
                        Select Student for 1-on-1 Session <span className="text-rose-500">*</span>
                      </Label>
                      <p className="text-xs text-purple-700 mt-0.5">
                        This 1-on-1 session will appear exclusively on the selected student's coaching dashboard.
                      </p>
                    </div>
                    {selectedSingleStudent ? (
                      <div className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full shrink-0 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> Student Selected
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-purple-800 bg-purple-200/80 px-3 py-1 rounded-full shrink-0">
                        1 Student Required
                      </div>
                    )}
                  </div>

                  {/* If student is selected, collapse list and show selected student card with Change button */}
                  {selectedSingleStudent ? (
                    <div className="flex items-center justify-between p-3.5 bg-white border-2 border-purple-400 rounded-2xl shadow-xs animate-in zoom-in-95 duration-150">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                          {selectedSingleStudent.name ? selectedSingleStudent.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-extrabold text-purple-950 truncate leading-tight">
                              {selectedSingleStudent.name}
                            </p>
                            {selectedSingleStudent.grade_level && (
                              <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                                {selectedSingleStudent.grade_level}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{selectedSingleStudent.email}</p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStudentIds([]);
                          setStudentSearchQuery("");
                        }}
                        className="text-xs h-8 px-3 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 font-bold rounded-xl shrink-0 cursor-pointer"
                      >
                        Change Student
                      </Button>
                    </div>
                  ) : (
                    /* Searchable list when no student is selected yet */
                    <div className="space-y-2.5">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          type="text"
                          placeholder="Search student by name or email..."
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          className="pl-9 h-10 bg-white border-purple-200 text-sm rounded-xl focus-visible:ring-purple-500"
                          autoFocus
                        />
                        {studentSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setStudentSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                        {filteredStudents.length === 0 ? (
                          <div className="text-xs text-slate-500 italic p-4 text-center bg-white rounded-xl border border-purple-100">
                            {studentSearchQuery ? "No students match your search filter." : "No registered students found."}
                          </div>
                        ) : (
                          filteredStudents.map((student: any) => (
                            <div
                              key={student.id}
                              onClick={() => {
                                // Single selection: sets selected student and collapses list
                                setSelectedStudentIds([student.id]);
                                setStudentSearchQuery("");
                              }}
                              className="flex items-center justify-between p-2.5 rounded-xl border bg-white border-slate-200 hover:border-purple-400 hover:bg-purple-50/60 text-slate-700 transition-all cursor-pointer select-none group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
                                  {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-purple-950">
                                    {student.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500 truncate">{student.email}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {student.grade_level && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium hidden sm:inline-block">
                                    {student.grade_level}
                                  </span>
                                )}
                                <span className="text-xs font-bold text-purple-600 group-hover:underline">
                                  Select
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input
                  name="session_date"
                  type="datetime-local"
                  min={getNowLocalISO()}
                  defaultValue={getNowLocalISO()}
                  onChange={(e) => {
                    const minVal = getNowLocalISO();
                    if (e.target.value && e.target.value < minVal) {
                      e.target.value = minVal;
                      import("sonner").then(({ toast }) => {
                        toast.error("Past dates are disabled. Reset to current time.");
                      });
                    }
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Meeting Link (Zoom/Google Meet)</Label>
                <Input name="meeting_link" type="url" placeholder="https://zoom.us/j/..." />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Description</Label>
                <Input name="description" placeholder="Short description of what we'll cover" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button type="submit">Save Session</Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Session Form */}
      {editingSession && (
        <div className="bg-white p-6 rounded-3xl border border-indigo-200 shadow-md space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-600" /> Edit Coaching Session
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update session details, schedule, meeting link, or assigned student.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingSession(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleUpdate} className="space-y-6">
            {/* Session Type Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Session Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditSessionType("group");
                    setEditSelectedStudentIds([]);
                    setEditStudentSearchQuery("");
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${editSessionType === "group"
                    ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-200 text-indigo-900 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                    }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${editSessionType === "group" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">Group Session</p>
                    <p className="text-[11px] text-slate-500">Open to all students</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEditSessionType("individual")}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${editSessionType === "individual"
                    ? "border-purple-600 bg-purple-50/50 ring-2 ring-purple-200 text-purple-900 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                    }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${editSessionType === "individual" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">1-on-1 Session</p>
                    <p className="text-[11px] text-slate-500">Assigned to a specific student</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>Session Title</Label>
                <Input
                  name="title"
                  defaultValue={editingSession.title}
                  placeholder="e.g. Personal Statement Workshop or 1-on-1 Essay Strategy"
                  required
                />
              </div>

              {/* If 1-on-1, Select Student */}
              {editSessionType === "individual" && (
                <div className="md:col-span-2 space-y-3 p-4 bg-purple-50/50 border border-purple-200/80 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-purple-600" /> Assigned Student (Single Selection)
                    </Label>
                    <span className="text-[11px] font-semibold text-purple-700">
                      {editSelectedStudentIds.length === 1 ? "1 student selected" : "Select 1 student"}
                    </span>
                  </div>

                  {/* If a student is already selected, show selected student card */}
                  {editSelectedSingleStudent ? (
                    <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-purple-300 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {editSelectedSingleStudent.name ? editSelectedSingleStudent.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {editSelectedSingleStudent.name}
                            </p>
                            {editSelectedSingleStudent.grade_level && (
                              <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                                {editSelectedSingleStudent.grade_level}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{editSelectedSingleStudent.email}</p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditSelectedStudentIds([]);
                          setEditStudentSearchQuery("");
                        }}
                        className="text-xs h-8 font-bold border-purple-200 text-purple-700 hover:bg-purple-50 shrink-0 cursor-pointer"
                      >
                        Change Student
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <Input
                          value={editStudentSearchQuery}
                          onChange={(e) => setEditStudentSearchQuery(e.target.value)}
                          placeholder="Search student by name or email..."
                          className="pl-9 text-xs bg-white h-9"
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 border border-purple-100 rounded-xl p-2 bg-white/70">
                        {filteredEditStudents.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">
                            {editStudentSearchQuery ? "No students match your search filter." : "No registered students found."}
                          </div>
                        ) : (
                          filteredEditStudents.map((student: any) => (
                            <div
                              key={student.id}
                              onClick={() => {
                                setEditSelectedStudentIds([student.id]);
                                setEditStudentSearchQuery("");
                              }}
                              className="flex items-center justify-between p-2.5 rounded-xl border bg-white border-slate-200 hover:border-purple-400 hover:bg-purple-50/60 text-slate-700 transition-all cursor-pointer select-none group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
                                  {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-purple-950">
                                    {student.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500 truncate">{student.email}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {student.grade_level && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium hidden sm:inline-block">
                                    {student.grade_level}
                                  </span>
                                )}
                                <span className="text-xs font-bold text-purple-600 group-hover:underline">
                                  Select
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input
                  key={editingSession.id}
                  name="session_date"
                  type="datetime-local"
                  min={getNowLocalISO()}
                  defaultValue={getEditSessionDateInitialValue(editingSession.session_date)}
                  onChange={(e) => {
                    const minVal = getNowLocalISO();
                    if (e.target.value && e.target.value < minVal) {
                      e.target.value = minVal;
                      import("sonner").then(({ toast }) => {
                        toast.error("Past dates are disabled. Reset to current time.");
                      });
                    }
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Meeting Link (Zoom/Google Meet)</Label>
                <Input
                  name="meeting_link"
                  type="url"
                  defaultValue={editingSession.meeting_link || ""}
                  placeholder="https://zoom.us/j/..."
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Description</Label>
                <Input
                  name="description"
                  defaultValue={editingSession.description || ""}
                  placeholder="Short description of what we'll cover"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingSession(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
                Update Session
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Sessions List - Hidden when any management tab is open */}
      {!isCreating && !editingSession && !isManagingResources && !isViewingFeedback && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-in fade-in duration-200">
          {filteredSessions.length === 0 ? (
            <div className="md:col-span-2 py-16 text-center border border-dashed border-slate-200 rounded-3xl bg-white p-8">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                {categoryFilter === "individual"
                  ? "No 1-on-1 sessions scheduled yet"
                  : categoryFilter === "group"
                    ? "No group sessions scheduled yet"
                    : "No coaching sessions scheduled yet"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                {categoryFilter === "individual"
                  ? "Click the button below to schedule your first 1-on-1 coaching session."
                  : categoryFilter === "group"
                    ? "Click the button below to schedule your first group workshop session."
                    : "Click the button below to schedule your first group or 1-on-1 coaching session."}
              </p>
              <Button
                onClick={() => {
                  setIsCreating(true);
                  if (categoryFilter === "individual") setSessionType("individual");
                  if (categoryFilter === "group") setSessionType("group");
                }}
                className="gap-2 text-xs font-bold bg-slate-900 text-white"
              >
                <Plus className="w-4 h-4" /> Create Session
              </Button>
            </div>
          ) : (
            filteredSessions.map((session, index) => {
              const sessionTime = new Date(session.session_date).getTime();
              const nowTime = Date.now();
              const isPast = sessionTime < nowTime;
              const prevSession = index > 0 ? filteredSessions[index - 1] : null;
              const isFirstPastSession = isPast && (!prevSession || new Date(prevSession.session_date).getTime() >= nowTime);

              const sessionFeedback = feedback.filter(
                (f) => f.sessionId === session.id || (f.sessionTitle && session.title && f.sessionTitle.trim().toLowerCase() === session.title.trim().toLowerCase())
              );
              const sessionRating = sessionFeedback.length > 0
                ? (sessionFeedback.reduce((sum, f) => sum + (Number(f.rating) || 5), 0) / sessionFeedback.length).toFixed(1)
                : null;

              return (
                <React.Fragment key={session.id}>
                  {isFirstPastSession && (
                    <div className="md:col-span-2 my-2 w-full">
                      <div className="flex items-center gap-4">
                        <hr className="flex-1 border-slate-200" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-1 rounded-full">Past Sessions</span>
                        <hr className="flex-1 border-slate-200" />
                      </div>
                    </div>
                  )}
                  <div className={`rounded-2xl border ${isPast ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-slate-300'} shadow-sm overflow-hidden flex flex-col transition-all`}>
                    <div className="p-5 flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {session.session_type === 'group' ? (
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${isPast ? 'bg-slate-200/60 text-slate-500' : 'bg-indigo-100 text-indigo-700'}`}>
                              <Users className="w-3.5 h-3.5" /> Group
                            </span>
                          ) : (
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${isPast ? 'bg-slate-200/60 text-slate-500' : 'bg-purple-100 text-purple-700'}`}>
                              <User className="w-3.5 h-3.5" /> 1-on-1
                            </span>
                          )}
                          {isPast && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-200/60 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                              Completed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => !isPast && handleStartEdit(session)}
                            disabled={isPast}
                            className={`p-1.5 rounded-lg transition-colors ${isPast ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer'}`}
                            title={isPast ? "Cannot edit past sessions" : "Edit Session"}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(session.id)}
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors p-1.5 rounded-lg cursor-pointer"
                            title="Delete Session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 mb-2">{session.title}</h3>
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">{session.description || "No description provided."}</p>

                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {new Date(session.session_date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </div>
                        {session.meeting_link && (
                          isPast ? (
                            <span
                              className="flex items-center gap-1.5 text-slate-400 font-semibold cursor-not-allowed"
                              title="Link disabled for past sessions"
                            >
                              <Video className="w-4 h-4" />
                              <span>Link attached</span>
                            </span>
                          ) : (
                            <a
                              href={session.meeting_link.startsWith("http://") || session.meeting_link.startsWith("https://") ? session.meeting_link : `https://${session.meeting_link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold hover:underline transition-colors group cursor-pointer"
                              title="Open meeting link (Zoom / Google Meet)"
                            >
                              <Video className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              <span>Link attached</span>
                            </a>
                          )
                        )}
                      </div>

                      {/* Session Star Rating Badge */}
                      {sessionFeedback.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setViewingSessionFeedback({ session, reviews: sessionFeedback, avgRating: sessionRating || "0.0" })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          title="Click to view reviews for this session"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{sessionRating}</span>
                          {/* <span className="text-[10px] font-semibold text-amber-700">({sessionFeedback.length})</span> */}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-400 border border-slate-200/60 rounded-lg text-[11px] font-semibold">
                          <Star className="w-3 h-3 text-slate-300" /> No reviews
                        </span>
                      )}
                    </div>

                    {/* Card Bottom Bar: Students Dropdown + Reviews Button */}
                    <div className="bg-slate-50 border-t border-slate-100 p-3.5 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedSessionId(selectedSessionId === session.id ? null : session.id)}
                        className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                      >
                        <span>Registered Students ({session.enrollments?.length || 0})</span>
                        <ChevronIcon isOpen={selectedSessionId === session.id} />
                      </button>

                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => setViewingSessionFeedback({ session, reviews: sessionFeedback, avgRating: sessionRating || "0.0" })}
                        className="gap-1.5 text-xs h-8 border-amber-200 bg-white hover:bg-amber-50 text-amber-800 font-bold rounded-xl"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        Reviews ({sessionFeedback.length})
                      </Button>
                    </div>

                    {selectedSessionId === session.id && (
                      <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-3">
                        {!session.enrollments || session.enrollments.length === 0 ? (
                          <div className="text-center py-4 text-sm text-slate-500">No students enrolled yet.</div>
                        ) : (
                          session.enrollments.map((e: any, i: number) => (
                            <div key={i} className="flex flex-col gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-slate-900 truncate" title={`${e.profiles?.student_first_name} ${e.profiles?.student_last_name}`}>
                                    {e.profiles?.student_first_name} {e.profiles?.student_last_name}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate" title={e.profiles?.student_email}>
                                    {e.profiles?.student_email}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <select
                                    defaultValue={e.attendance_status}
                                    onChange={(ev) => handleAttendanceChange(e.id, ev.target.value)}
                                    className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 outline-none font-medium cursor-pointer"
                                  >
                                    <option value="registered">Registered</option>
                                    <option value="attended">Attended</option>
                                    <option value="no_show">No Show</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={`gap-1.5 text-xs h-8 ${e.internal_notes ? "bg-amber-50 text-amber-800 border-amber-300 font-bold hover:bg-amber-100" : ""}`}
                                    onClick={() => {
                                      setNotingStudent(e);
                                      setCoachingNotes(e.internal_notes || "");
                                    }}
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    {e.internal_notes ? "Edit Note" : "Notes"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 text-xs h-8"
                                    onClick={() => setAssigningStudent({ ...e, sessionTitle: session.title })}
                                  >
                                    <ListTodo className="w-3.5 h-3.5" /> Assign Task
                                  </Button>
                                </div>
                              </div>

                              {/* Direct In-Card Note Display */}
                              {e.internal_notes && (
                                <div className="text-xs bg-amber-50/80 border border-amber-200/90 rounded-xl p-2.5 flex items-start gap-2 text-amber-950">
                                  <FileText className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-amber-800">Staff Note: </span>
                                    <span className="text-slate-700 italic font-medium">"{e.internal_notes}"</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      )}

      {/* Assign Task Modal */}
      {assigningStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">Assign Action Item</h3>
              <p className="text-xs text-slate-500 mt-1">
                For {assigningStudent.profiles?.student_first_name} {assigningStudent.profiles?.student_last_name}
              </p>
            </div>
            <form onSubmit={handleAssignTask} className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Write intro paragraph for Common App"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  required
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setAssigningStudent(null)}>Cancel</Button>
                <Button type="submit">Assign Task</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Private Notes Modal */}
      {notingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Private Coaching Notes
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  For <span className="font-semibold text-slate-800">{notingStudent.profiles?.student_first_name} {notingStudent.profiles?.student_last_name}</span>. Only visible to staff.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotingStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNotes} className="p-5 space-y-4">
              {notingStudent.internal_notes && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 space-y-1">
                  <p className="font-bold text-[10px] uppercase tracking-wider text-amber-800">Current Saved Note:</p>
                  <p className="text-slate-700 italic leading-relaxed">"{notingStudent.internal_notes}"</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {notingStudent.internal_notes ? "Update Note" : "Write Note"}
                </label>
                <textarea
                  className="w-full min-h-[120px] p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  placeholder="Add session observations, progress, and recommendations here..."
                  value={coachingNotes}
                  onChange={(e) => setCoachingNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setNotingStudent(null)}>Cancel</Button>
                <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800">Save Note</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session-Specific Reviews Modal Popup */}
      {viewingSessionFeedback && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 p-5 text-white flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-100">
                  <Star className="w-4 h-4 fill-amber-200 text-amber-200" />
                  Session Feedback & Reviews
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1 line-clamp-1">
                  {viewingSessionFeedback.session.title}
                </h3>
                <p className="text-xs text-amber-100/90 mt-0.5">
                  {new Date(viewingSessionFeedback.session.session_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} • {viewingSessionFeedback.reviews.length} total {viewingSessionFeedback.reviews.length === 1 ? "review" : "reviews"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewingSessionFeedback(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score Banner */}
            <div className="bg-amber-50/70 border-b border-amber-200/60 p-4 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-amber-900">
                  {viewingSessionFeedback.reviews.length > 0 ? viewingSessionFeedback.avgRating : "0.0"}
                </span>
                <div>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${viewingSessionFeedback.reviews.length > 0 &&
                          s <= Math.round(Number(viewingSessionFeedback.avgRating))
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200 fill-slate-200"
                          }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] font-bold text-slate-600">
                    {viewingSessionFeedback.reviews.length > 0 ? "Average Student Rating" : "No ratings yet"}
                  </p>
                </div>
              </div>

              <span className="text-xs font-extrabold text-amber-800 bg-amber-200/70 px-3 py-1 rounded-full">
                {viewingSessionFeedback.reviews.length} {viewingSessionFeedback.reviews.length === 1 ? "Student Review" : "Student Reviews"}
              </span>
            </div>

            {/* Reviews List */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {viewingSessionFeedback.reviews.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No reviews submitted for this session yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    When students submit feedback specifically for "{viewingSessionFeedback.session.title}", it will show up here.
                  </p>
                </div>
              ) : (
                viewingSessionFeedback.reviews.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.studentName}</h4>
                        <p className="text-[11px] text-slate-500">{item.studentEmail}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${s <= item.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-black text-slate-700 ml-1">{item.rating}.0</span>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-150 text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                      "{item.comments}"
                    </div>

                    <div className="flex justify-end text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                      <span>Submitted on {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <Button
                type="button"
                onClick={() => setViewingSessionFeedback(null)}
                className="text-xs font-bold bg-slate-900 text-white rounded-xl px-5"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
