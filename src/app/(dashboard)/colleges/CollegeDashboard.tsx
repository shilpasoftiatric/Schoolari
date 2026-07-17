"use client";

import { useState, useEffect } from "react";
import {
  GraduationCap, Plus, Calendar, Save, Trash2, CheckCircle2, X,
  Building, BookOpen, Sparkles, RefreshCcw, ExternalLink, BellRing,
  Users, DollarSign, MapPin, Loader2, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getCollegeRecommendations,
  saveRecommendationToTracker,
  scheduleCollegeReminder,
  updateRecommendationStatus,
} from "@/app/actions/colleges";
import Swal from "sweetalert2";

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Constants                                                                   */
/* ──────────────────────────────────────────────────────────────────────────── */

const STATUS_COLORS = {
  researching: "bg-blue-50 text-blue-700 border-blue-200",
  applied:     "bg-amber-50 text-amber-700 border-amber-200",
  waitlisted:  "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  accepted:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:    "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_LABELS = {
  researching: "Researching",
  applied:     "Applied",
  waitlisted:  "Waitlisted",
  accepted:    "Accepted",
  rejected:    "Rejected",
};

/* ──────────────────────────────────────────────────────────────────────────── */
/*  AI College Recommendation Card                                              */
/* ──────────────────────────────────────────────────────────────────────────── */

function AICollegeCard({ rec, onSaved }: { rec: any; onSaved: () => void }) {
  const [status, setStatus] = useState<string>(rec.status || "NEW");
  const [processing, setProcessing] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("09:00");
  const [settingReminder, setSettingReminder] = useState(false);

  const isSaved    = status === "SAVED"   || status === "APPLIED";
  const isApplied  = status === "APPLIED";
  const isDismissed = status === "DISMISSED";

  const handleSave = async (asApplied = false) => {
    if (processing) return;
    setProcessing(true);
    const prev = status;
    setStatus(asApplied ? "APPLIED" : "SAVED");
    try {
      await saveRecommendationToTracker(rec, asApplied);
      Swal.fire({
        toast: true, position: "top-end", showConfirmButton: false, timer: 3500, icon: "success",
        title: asApplied ? "Marked as applied!" : "Added to your college list!",
      });
      onSaved();
    } catch (err: any) {
      setStatus(prev);
      Swal.fire({ toast: true, position: "top-end", showConfirmButton: false, timer: 3000, icon: "error", title: err.message || "Something went wrong." });
    } finally {
      setProcessing(false);
    }
  };

  const handleDismiss = async () => {
    setStatus("DISMISSED");
    await updateRecommendationStatus(rec.college_name, "DISMISSED");
  };

  const handleSetReminder = async () => {
    if (!reminderDate) {
      Swal.fire({ toast: true, position: "top-end", showConfirmButton: false, timer: 2500, icon: "warning", title: "Please select a date." });
      return;
    }
    setSettingReminder(true);
    try {
      await scheduleCollegeReminder(rec.college_name, reminderDate, reminderTime);
      setReminderOpen(false);
      Swal.fire({
        toast: true, position: "top-end", showConfirmButton: false, timer: 3500, icon: "success",
        title: "Reminder set! We'll notify you before the deadline.",
      });
    } catch (err: any) {
      Swal.fire({ toast: true, position: "top-end", showConfirmButton: false, timer: 3000, icon: "error", title: err.message || "Failed to set reminder." });
    } finally {
      setSettingReminder(false);
    }
  };

  if (isDismissed) return null;

  return (
    <div className="group bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Header */}
      <div className="flex items-start gap-4 mb-4 relative z-10">
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
          {rec.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rec.logo_url}
              alt={rec.college_name}
              className="w-10 h-10 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <GraduationCap className="w-7 h-7 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-extrabold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors line-clamp-2">
            {rec.college_name}
          </h3>
          {rec.city_state && (
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {rec.city_state}
            </p>
          )}
        </div>

        {/* Match Score */}
        {rec.score != null && (
          <div className="shrink-0 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Match</span>
            <span className="text-lg font-extrabold text-emerald-600 flex items-center gap-0.5">
              <Sparkles className="w-3.5 h-3.5" />{rec.score}%
            </span>
          </div>
        )}

        {/* Dismiss button */}
        <button onClick={handleDismiss} className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors" title="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap gap-3 mb-4 relative z-10">
        {rec.total_enrollment != null && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-xl">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {rec.total_enrollment.toLocaleString()} students
          </div>
        )}
        {rec.cost_of_attendance && rec.cost_of_attendance !== "Not Available" && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-xl">
            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            {rec.cost_of_attendance}/yr
          </div>
        )}
        {rec.offers_major != null && (
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl border ${rec.offers_major ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100"}`}>
            <BookOpen className="w-3.5 h-3.5" />
            {rec.offers_major ? "Offers Your Major" : "Major Not Listed"}
          </div>
        )}
      </div>

      {/* Description */}
      {rec.description && (
        <p className="text-sm text-slate-500 line-clamp-3 mb-3 relative z-10">{rec.description}</p>
      )}

      {/* Why Match */}
      {rec.reason && (
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 mb-4 relative z-10">
          <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-0.5">
            <Sparkles className="w-3.5 h-3.5" /> Why You Match
          </p>
          <p className="text-xs text-emerald-700/80">{rec.reason}</p>
        </div>
      )}

      {/* Applied status badge */}
      {(isSaved || isApplied) && (
        <div className={`inline-flex items-center gap-1.5 self-start mb-3 px-3 py-1.5 rounded-full text-xs font-bold border relative z-10 ${isApplied ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isApplied ? "Marked as Applied" : "Saved to Your List"}
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto space-y-2 relative z-10">
        {/* Reminder Modal */}
        {reminderOpen ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Set Application Reminder</p>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} className="rounded-xl text-sm" />
              <Input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} className="rounded-xl text-sm" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setReminderOpen(false)} variant="outline" className="flex-1 rounded-xl text-sm font-bold">Cancel</Button>
              <Button onClick={handleSetReminder} disabled={settingReminder} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold">
                {settingReminder ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set Reminder"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {!isSaved && (
              <Button
                onClick={() => handleSave(false)}
                disabled={processing}
                variant="outline"
                className="rounded-xl text-sm font-bold border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save to List"}
              </Button>
            )}
            {!isApplied && (
              <Button
                onClick={() => handleSave(true)}
                disabled={processing}
                className={`rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white ${!isSaved ? "" : "col-span-2"}`}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1.5" />Applied</>}
              </Button>
            )}
            <Button
              onClick={() => setReminderOpen(true)}
              variant="outline"
              className="rounded-xl text-sm font-bold col-span-2 border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <BellRing className="w-4 h-4 mr-1.5" /> Set Reminder
            </Button>
          </div>
        )}

        {/* Apply Link */}
        {rec.official_website && (
          <a
            href={rec.official_website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md text-sm"
          >
            Apply Now <ExternalLink className="w-4 h-4 opacity-60" />
          </a>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Main Dashboard Component                                                    */
/* ──────────────────────────────────────────────────────────────────────────── */

export function CollegeDashboard({ initialColleges }: { initialColleges: any[] }) {
  const [activeTab, setActiveTab] = useState<"ai" | "tracker">("ai");
  const [colleges, setColleges] = useState(initialColleges);

  /* ── Recommendations state ── */
  const [recs, setRecs] = useState<any[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState("");
  const [recsFetched, setRecsFetched] = useState(false);

  /* ── Add Modal ── */
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCollegeName, setNewCollegeName] = useState("");
  const [newCollegeDeadline, setNewCollegeDeadline] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  /* ── Edit Modal ── */
  const [editingCollege, setEditingCollege] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /* Metrics */
  const totalColleges  = colleges.length;
  const appliedCount   = colleges.filter(c => c.status === "applied").length;
  const acceptedCount  = colleges.filter(c => c.status === "accepted").length;

  /* ── Load recommendations when AI tab first shown ── */
  useEffect(() => {
    if (activeTab === "ai" && !recsFetched) {
      loadRecs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadRecs = async (force = false) => {
    setRecsLoading(true);
    setRecsError("");
    try {
      const data = await getCollegeRecommendations(force);
      setRecs(data);
      setRecsFetched(true);
    } catch (err: any) {
      setRecsError(err.message || "Failed to load recommendations.");
    } finally {
      setRecsLoading(false);
    }
  };

  /* ── Tracker handlers ── */
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollegeName.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/colleges/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collegeName: newCollegeName, deadline: newCollegeDeadline })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to add college"); }
      const newCollege = await res.json();
      setColleges([newCollege, ...colleges]);
      setNewCollegeName(""); setNewCollegeDeadline(""); setIsAddModalOpen(false);
    } catch (err: any) {
      Swal.fire({ toast: true, position: "top-end", showConfirmButton: false, timer: 3000, icon: "error", title: err.message || "Failed to add college." });
    } finally { setIsAdding(false); }
  };

  const openEditModal = (college: any) => {
    setEditingCollege(college); setEditStatus(college.status);
    setEditNotes(college.notes || ""); setEditDeadline(college.deadline || "");
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/colleges/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingCollege.id, updates: { status: editStatus, notes: editNotes, deadline: editDeadline } })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to save updates"); }
      setColleges(colleges.map(c => c.id === editingCollege.id ? { ...c, status: editStatus, notes: editNotes, deadline: editDeadline } : c));
      setEditingCollege(null);
    } catch (err: any) {
      Swal.fire({ toast: true, position: "top-end", showConfirmButton: false, timer: 3000, icon: "error", title: err.message || "Failed to save." });
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this college?")) return;
    try {
      const res = await fetch("/api/colleges/delete", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to delete college"); }
      setColleges(colleges.filter(c => c.id !== id));
      if (editingCollege?.id === id) setEditingCollege(null);
    } catch (err: any) {
      Swal.fire({ toast: true, position: "top-end", showConfirmButton: false, timer: 3000, icon: "error", title: err.message || "Failed to delete." });
    }
  };

  return (
    <div className="space-y-8 pb-8">

      {/* ── Header & Metrics ── */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-violet-500" />
            College Planning
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Your personalized college list, powered by AI — tailored to your major, GPA, and goals.
          </p>
        </div>
        <Button onClick={() => { setActiveTab("tracker"); setIsAddModalOpen(true); }} className="bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl py-6 px-6 shadow-sm shadow-violet-200 transition-all hover:-translate-y-0.5">
          <Plus className="w-5 h-5 mr-2" /> Add College
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Building, bg: "bg-blue-50", color: "text-blue-600", label: "Total Saved", value: totalColleges },
          { icon: BookOpen, bg: "bg-amber-50", color: "text-amber-600", label: "Applications Out", value: appliedCount },
          { icon: CheckCircle2, bg: "bg-emerald-50", color: "text-emerald-600", label: "Acceptances", value: acceptedCount },
        ].map(({ icon: Icon, bg, color, label, value }) => (
          <div key={label} className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
            <div className={`w-12 h-12 rounded-full ${bg} ${color} flex items-center justify-center`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-extrabold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit">
        {[
          { key: "ai", label: "AI Recommendations", icon: Sparkles },
          { key: "tracker", label: "My College List", icon: Building },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as "ai" | "tracker")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── AI Recommendations Tab ── */}
      {activeTab === "ai" && (
        <div>
          {recsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm animate-pulse space-y-4">
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-slate-200 rounded" />
                  <div className="h-3 bg-slate-200 rounded w-5/6" />
                  <div className="h-3 bg-slate-200 rounded w-4/6" />
                  <div className="h-10 bg-slate-200 rounded-xl mt-4" />
                </div>
              ))}
            </div>
          ) : recsError ? (
            <div className="text-center py-20 bg-red-50 rounded-3xl border border-red-100">
              <p className="text-red-500 font-semibold mb-4">{recsError}</p>
              <Button onClick={() => loadRecs(true)} variant="outline" className="rounded-xl font-bold">Try Again</Button>
            </div>
          ) : recs.filter(r => r.status !== "DISMISSED").length === 0 ? (
            <div className="text-center py-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
              <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">No recommendations yet</h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">Complete your onboarding profile to get personalized AI college recommendations.</p>
              <Button onClick={() => loadRecs(true)} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold">
                <Sparkles className="w-4 h-4 mr-2" /> Generate Recommendations
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-slate-500 font-medium">
                  {recs.filter(r => r.status !== "DISMISSED").length} personalized colleges matched to your profile
                </p>
                <Button onClick={() => loadRecs(true)} variant="outline" disabled={recsLoading} className="rounded-xl text-sm font-bold gap-2">
                  <RefreshCcw className="w-4 h-4" /> Refresh
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recs
                  .filter(r => r.status !== "DISMISSED")
                  .map((rec, i) => (
                    <AICollegeCard key={`${rec.college_name}-${i}`} rec={rec} onSaved={() => {}} />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── My College List (Tracker) Tab ── */}
      {activeTab === "tracker" && (
        <div>
          {colleges.length === 0 ? (
            <div className="text-center py-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
              <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">No colleges saved yet</h3>
              <p className="text-slate-500 mb-6">Start building your college list by adding your target schools.</p>
              <Button onClick={() => setIsAddModalOpen(true)} variant="outline" className="rounded-xl font-bold">
                Add Your First College
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {colleges.map((college) => (
                <div
                  key={college.id}
                  onClick={() => openEditModal(college)}
                  className="group bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                      {college.college_name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${STATUS_COLORS[college.status as keyof typeof STATUS_COLORS]}`}>
                      {STATUS_LABELS[college.status as keyof typeof STATUS_LABELS]}
                    </span>
                  </div>

                  <div className="mt-auto space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Deadline: {college.deadline ? new Date(college.deadline).toLocaleDateString() : "Not set"}
                    </div>
                    {college.notes && (
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl line-clamp-2 border border-slate-100">
                        {college.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Add Modal ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-extrabold text-slate-900">Add College</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">College Name</label>
                <Input
                  value={newCollegeName}
                  onChange={(e) => setNewCollegeName(e.target.value)}
                  placeholder="e.g. Harvard University"
                  required autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Application Deadline (Optional)</label>
                <Input type="date" value={newCollegeDeadline} onChange={(e) => setNewCollegeDeadline(e.target.value)} />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" onClick={() => setIsAddModalOpen(false)} variant="outline" className="rounded-xl font-bold">Cancel</Button>
                <Button type="submit" disabled={isAdding || !newCollegeName.trim()} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold">
                  {isAdding ? "Adding..." : "Add College"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingCollege && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-extrabold text-slate-900">{editingCollege.college_name}</h2>
              <button onClick={() => setEditingCollege(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Admission Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <option value="researching">Researching</option>
                  <option value="applied">Applied</option>
                  <option value="waitlisted">Waitlisted</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Application Deadline</label>
                <Input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Personal Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes about campus tours, requirements, essays..."
                  className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none h-32"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <button
                onClick={() => handleDelete(editingCollege.id)}
                className="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Remove College"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <div className="flex gap-3">
                <Button onClick={() => setEditingCollege(null)} variant="outline" className="rounded-xl font-bold">Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                  {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-1.5" />Save Changes</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
