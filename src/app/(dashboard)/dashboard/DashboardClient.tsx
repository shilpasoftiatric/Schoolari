"use client";

import Swal from "sweetalert2";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Trophy, Bookmark, FileEdit, GraduationCap, ArrowRight, Lightbulb, Bell, Banknote, ListTodo, Flame, Send, FolderOpen, Calendar, MoreHorizontal, CheckCircle2, Circle, Flag, Users, Laptop, Video, Wallet, BarChart3, Loader2, FileText, X, PlusCircle, ChevronRight, ChevronLeft, Target, Lock } from "lucide-react";
import { useTransition } from "react";
import { completeTask, moveTaskToTracker, skipTask } from "@/app/actions/tasks";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { canAccessFeature, type SubscriptionPlan } from "@/lib/subscription";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { ScholarshipCard } from "@/components/ui/ScholarshipCard";

import { UpgradeFlowModal } from "@/components/ui/UpgradeFlowModal";
import { searchScholarships } from "@/app/actions/scholarships";
import { ContentBanners } from "@/components/layout/ContentBanners";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAIState } from "@/context/AIStateContext";
import { AILoader } from "@/components/ui/AILoader";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  "In Progress": "bg-blue-100 text-blue-700",
  "Submitted": "bg-emerald-100 text-emerald-700",
  "Draft": "bg-amber-100 text-amber-700",
  "Won": "bg-purple-100 text-purple-700",
  "Lost": "bg-red-100 text-red-700",
  "Not Started": "bg-slate-100 text-slate-700",
};

// Map string icon names to Lucide components
const iconMap: Record<string, any> = {
  Bookmark, Send, FileEdit, FolderOpen, Users, Laptop, Video, Wallet, Sparkles: Lightbulb, Trophy,
  "Scholarships Matched": Bookmark,
  "Applied Scholarship Applications": CheckCircle2,
  "Essays Drafted": FileEdit,
  "Colleges Saved": GraduationCap
};

function ScholarshipSearchSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col h-full space-y-4 shadow-sm animate-pulse">
      <div className="flex justify-between items-start gap-4">
        <div className="w-20 h-6 bg-slate-200 rounded-full shrink-0" />
        <div className="w-20 h-6 bg-slate-200 rounded-full shrink-0" />
      </div>
      <div className="space-y-2 mt-4 flex-1">
        <div className="h-6 w-3/4 bg-slate-200 rounded-lg" />
        <div className="h-4 w-full bg-slate-200 rounded-lg mt-4" />
        <div className="h-4 w-5/6 bg-slate-200 rounded-lg" />
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
        <div className="space-y-1">
          <div className="h-3 w-12 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
        <div className="space-y-1 items-end flex flex-col">
          <div className="h-3 w-12 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="w-full h-12 bg-slate-200 rounded-xl mt-4" />
    </div>
  );
}

function DashboardSection({
  title,
  icon: Icon,
  colorClass,
  borderClass,
  bgClass,
  sectionData,
  category,
  emptyTip,
  onRefresh
}: {
  title: string,
  icon: any,
  colorClass: string,
  borderClass: string,
  bgClass: string,
  sectionData: any,
  category: string,
  emptyTip?: string,
  onRefresh?: () => void
}) {
  const completedTasks = sectionData?.tasks?.filter((t: any) => t.done).length || 0;
  const totalTasks = sectionData?.tasks?.length || 0;

  const [isPending, startTransition] = useTransition();
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});
  const [trackerTaskModal, setTrackerTaskModal] = useState<{ id: string; title: string } | null>(null);
  const [trackerDueDate, setTrackerDueDate] = useState<string>("");

  const handleComplete = async (taskId: string, taskTitle: string) => {
    // Optimistic UI state update
    setCompletedTaskIds((prev) => ({ ...prev, [taskId]: true }));

    const result = await Swal.fire({
      title: "Confirm Completion",
      text: `Did you complete: "${taskTitle}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, complete it",
      cancelButtonText: "No, undo selection",
      confirmButtonColor: "#10b981", // emerald-500
      cancelButtonColor: "#94a3b8"
    });

    if (result.isConfirmed) {
      startTransition(async () => {
        await completeTask(taskId, taskTitle);
        if (onRefresh) onRefresh();
      });
    } else {
      // Revert optimistic update
      setCompletedTaskIds((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    }
  };

  const handleSkip = (taskId: string) => {
    setCompletedTaskIds((prev) => ({ ...prev, [taskId]: true }));
    startTransition(async () => {
      await skipTask(taskId);
      if (onRefresh) onRefresh();
    });
  };

  const handleConfirmMoveToTracker = () => {
    if (!trackerTaskModal || !trackerDueDate) return;
    const { id, title } = trackerTaskModal;
    setTrackerTaskModal(null);
    setCompletedTaskIds((prev) => ({ ...prev, [id]: true }));

    startTransition(async () => {
      await moveTaskToTracker(id, title, category, trackerDueDate);
      setTrackerDueDate("");
      if (onRefresh) onRefresh();
    });
  };

  return (
    <Card className={cn("shadow-sm border-slate-100 flex flex-col justify-between overflow-hidden", borderClass)}>
      <CardHeader className={cn("pb-3 border-b border-slate-100/50", bgClass)}>
        <CardTitle className="text-base flex items-center justify-between font-extrabold text-slate-800">
          <span className="flex items-center gap-2">
            <Icon className={cn("w-5 h-5", colorClass)} /> {title}
          </span>
          {/* {totalTasks > 0 && (
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-100 shadow-sm")}>
              {completedTasks}/{totalTasks} Done
            </span>
          )} */}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-4 flex-1">
        <div className="space-y-3">
          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Do This Today</h4>
          <div className="space-y-2">
            {sectionData?.tasks && sectionData.tasks.length > 0 ? (
              sectionData.tasks.slice(0, 3).map((t: any, i: number) => {
                const isDone = t.done || completedTaskIds[t.id];
                const isOverdue = !isDone && t.due_date && new Date(t.due_date) < new Date();
                return (
                  <div key={t.id || i} className="flex flex-col p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div
                      onClick={() => !isDone && handleComplete(t.id, t.title)}
                      className="flex items-start gap-2.5 cursor-pointer select-none"
                    >
                      <button
                        type="button"
                        disabled={isPending || isDone}
                        className={cn("mt-0.5 shrink-0 transition-colors cursor-pointer", isDone ? "text-emerald-500" : isOverdue ? "text-red-400 hover:text-emerald-500" : "text-slate-300 group-hover:text-emerald-500")}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                      <span className={cn("text-sm font-semibold transition-all", isDone ? "line-through text-slate-400" : isOverdue ? "text-red-500" : "text-slate-700 group-hover:text-slate-900")}>
                        {t.title}
                      </span>
                    </div>
                    {!isDone && (
                      <div className="pl-6 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-3 text-[10px] font-bold text-slate-400">
                        {isOverdue && (
                          <button onClick={(e) => { e.stopPropagation(); handleSkip(t.id); }} disabled={isPending} className="hover:text-slate-600 flex items-center gap-1 cursor-pointer">
                            Skip <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTrackerTaskModal({ id: t.id, title: t.title });
                            setTrackerDueDate(new Date().toISOString().split("T")[0]);
                          }}
                          disabled={isPending}
                          className="hover:text-blue-500 flex items-center gap-1 cursor-pointer"
                        >
                          Move to Tracker <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 italic pl-2">No priority tasks today.</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Upcoming Deadlines</h4>
          <div className="space-y-2">
            {sectionData?.deadlines && sectionData.deadlines.length > 0 ? (
              sectionData.deadlines.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="text-sm font-semibold text-slate-700 truncate max-w-[140px]" title={d.name}>{d.name}</span>
                  <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ml-2", d.urgent ? "bg-red-50 text-red-600 border border-red-100 animate-pulse" : "bg-slate-100 text-slate-600")}>
                    {d.date}
                  </span>
                </div>
              ))
            ) : (
              <div className="pl-2 space-y-2">
                <p className="text-xs text-slate-400 italic">No upcoming deadlines.</p>
                {emptyTip && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                    {emptyTip}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Move to Tracker Modal Dialog */}
      <Dialog open={!!trackerTaskModal} onOpenChange={(open) => !open && setTrackerTaskModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Tracker</DialogTitle>
            <DialogDescription>
              Select a target deadline to move this task into your Tracker board.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm font-bold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">
              {trackerTaskModal?.title}
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Target Due Date</label>
              <Input
                type="date"
                value={trackerDueDate}
                onChange={(e) => setTrackerDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackerTaskModal(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirmMoveToTracker} disabled={!trackerDueDate || isPending} className="bg-violet-600 hover:bg-violet-700 text-white">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save to Tracker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function DashboardClient({
  initialData,
  firstName,
  streak = 1,
  userGoals = [],
  globalTasks = [],
  trackerItems = [],
  matchedScholarshipsCount = 0,
  plan = null,
  createdAt = null,
}: {
  initialData: any;
  firstName: string;
  streak?: number;
  userGoals?: string[];
  globalTasks?: any[];
  trackerItems?: any[];
  matchedScholarshipsCount?: number;
  plan?: import("@/lib/subscription").SubscriptionPlan;
  createdAt?: string | null;
}) {
  const { dashboardData, setDashboardData, prefetchBackgroundData } = useAIState();
  const router = useRouter();
  const [loading, setLoading] = useState(!initialData && !dashboardData);
  const [error, setError] = useState("");
  const [upsellDismissed, setUpsellDismissed] = useState(false);
  const [hasTriggeredUpdate, setHasTriggeredUpdate] = useState(false);

  const [trackerCategoryFilter, setTrackerCategoryFilter] = useState<string>("all");
  const [trackerCurrentPage, setTrackerCurrentPage] = useState<number>(1);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showEliteUpgradeModal, setShowEliteUpgradeModal] = useState(false);
  const [showScholarUpgradeModal, setShowScholarUpgradeModal] = useState(false);
  const [isRefreshingAI, setIsRefreshingAI] = useState(false);

  async function generateDashboard(showSkeleton = false, forceAI = false) {
    if (forceAI) {
      setIsRefreshingAI(true);
    } else if (showSkeleton && !dashboardData && !initialData) {
      setLoading(true);
    }

    try {
      const res = await fetch('/api/ai/generate-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: forceAI }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate AI data");

      setDashboardData(json);
      router.refresh();
      if (forceAI) {
        toast.success("AI Dashboard refreshed with fresh insights!");
      }
    } catch (err: any) {
      setError(err.message);
      if (forceAI) {
        toast.error(err.message || "Failed to refresh AI dashboard.");
      }
    } finally {
      setLoading(false);
      setIsRefreshingAI(false);
    }
  }

  // Real-time live synchronization for student dashboard items
  useEffect(() => {
    const supabase = createClient();

    const refreshDashboardData = async () => {
      try {
        await generateDashboard(false);
        router.refresh();
      } catch (err) {
        console.error("Realtime dashboard refresh error:", err);
      }
    };

    const channel = supabase
      .channel("student-dashboard-live-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "essays" }, refreshDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "saved_colleges" }, refreshDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "tracker_items" }, refreshDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refreshDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, refreshDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, refreshDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refreshDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isSearchModalOpen) {
      setIsSearching(true);
      timeoutId = setTimeout(async () => {
        try {
          const results = await searchScholarships(searchQuery);
          setSearchResults(results);
        } catch (err) {
          console.error("Failed to search scholarships:", err);
        } finally {
          setIsSearching(false);
        }
      }, 400);
    }
    return () => clearTimeout(timeoutId);
  }, [searchQuery, isSearchModalOpen]);

  useEffect(() => {
    if (isSearchModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isSearchModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchModalOpen(false);
    };
    if (isSearchModalOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen]);

  // Synchronize server initialData into context if context is empty
  useEffect(() => {
    if (initialData && !dashboardData) {
      setDashboardData(initialData);
    }
  }, [initialData, dashboardData, setDashboardData]);

  // Trigger background fetch if server indicates database cache is invalidated
  useEffect(() => {
    if (initialData === null && !hasTriggeredUpdate) {
      setHasTriggeredUpdate(true);
      generateDashboard(false);
    }
  }, [initialData, hasTriggeredUpdate]);

  const data = dashboardData || initialData;

  useEffect(() => {
    if (!data) {
      generateDashboard(true);
    }
  }, [data]);

  // Trigger background pre-fetching when dashboard data is loaded
  useEffect(() => {
    if (data && !loading) {
      prefetchBackgroundData();
    }
  }, [data, loading, prefetchBackgroundData]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl">
        <p>Error loading dashboard: {error}</p>
        <Button onClick={() => generateDashboard(true)} className="mt-4">Try Again</Button>
      </div>
    );
  }

  const coachTasks = globalTasks
    .filter(t => t.description === 'COACHING' && t.status === 'pending')
    .map(t => ({ id: t.id, title: t.title, done: false, due_date: t.due_date }));

  const coachSectionData = {
    tasks: coachTasks,
    deadlines: []
  };

  const renderLockedOverlay = (featureName: string, description: string, targetPlan: "scholar" | "elite") => (
    <div className="absolute inset-0 z-20 bg-white/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
        <Lock className="w-5 h-5 text-slate-400" />
      </div>
      <h3 className="font-bold text-slate-800 text-sm mb-1">{featureName} is Locked</h3>
      <p className="text-xs text-slate-600 mb-4 font-medium">{description}</p>
      <Button
        onClick={() => {
          if (targetPlan === 'elite') setShowEliteUpgradeModal(true);
          else setShowScholarUpgradeModal(true);
        }}
        size="sm"
        className="rounded-full bg-violet-600 hover:bg-violet-700 text-xs font-bold px-6 shadow-sm"
      >
        Upgrade to Unlock
      </Button>
    </div>
  );

  return (
    <div className="relative min-h-full space-y-8 pb-28">
      <AILoader
        isOpen={isRefreshingAI}
        message="Analyzing your profile & generating fresh AI recommendations..."
      />

      {/* Admin Content Banners & Announcements (Dashboard Only) */}
      <ContentBanners />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{firstName}&apos;s</span> Dashboard
          </h1>
          <p className="text-slate-500 mt-1 text-sm italic">"Every scholarship application is a step closer to your dream."</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-amber-200 bg-amber-50 text-amber-600 font-semibold text-sm shrink-0">
          <Flame className="w-4 h-4" />
          Day {streak} Streak
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button 
          onClick={() => generateDashboard(false, true)} 
          disabled={isRefreshingAI}
          className="gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white shadow-md rounded-xl cursor-pointer"
        >
          <Lightbulb className="w-4 h-4" /> Refresh AI Dashboard
        </Button>
        <Button variant="outline" onClick={() => setIsSearchModalOpen(true)} className="gap-2 rounded-xl border-slate-200 hover:border-violet-300 hover:text-violet-700 transition-all">
          <Search className="w-4 h-4 text-slate-400" /> Find Scholarships
        </Button>
      </div>

      {/* Elite Upsell Card — shown to non-Elite users after 7-14 days of activity */}
      {plan !== "elite" && !upsellDismissed && (() => {
        const daysSinceJoin = createdAt
          ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        if (daysSinceJoin < 7) return null;
        const dismissed = typeof window !== "undefined" && localStorage.getItem("elite_upsell_dismissed") === "true";
        if (dismissed) return null;
        return (
          <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-3xl p-6 shadow-xl shadow-amber-200 text-white overflow-hidden">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <button
              onClick={() => {
                setUpsellDismissed(true);
                if (typeof window !== "undefined") localStorage.setItem("elite_upsell_dismissed", "true");
              }}
              className="absolute top-4 right-4 z-20 p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 pointer-events-none" />
            </button>
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 ring-4 ring-white/30">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">🎉 You've been with us for {createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0} days!</p>
                <h2 className="text-xl font-extrabold mb-1">Ready to take your future to the next level?</h2>
                <p className="text-white/80 text-sm max-w-lg">
                  Unlock <strong>1-on-1 coaching</strong>, direct messaging with your personal advisor, and done-with-you application support — everything you need to win scholarships and get into your dream school.
                </p>
              </div>
              <button
                onClick={() => setShowEliteUpgradeModal(true)}
                className="bg-white text-amber-600 hover:bg-amber-50 font-bold px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 whitespace-nowrap shrink-0 text-sm cursor-pointer"
              >
                Upgrade to Elite
              </button>
            </div>
          </div>
        );
      })()}

      <UpgradeFlowModal
        isOpen={showEliteUpgradeModal}
        onClose={() => setShowEliteUpgradeModal(false)}
        targetPlan="elite"
        featureName="1-on-1 Coaching & Support"
      />
      <UpgradeFlowModal
        isOpen={showScholarUpgradeModal}
        onClose={() => setShowScholarUpgradeModal(false)}
        targetPlan="scholar"
        featureName="Advanced Features"
      />

      <Card className="shadow-sm border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">Progress Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
            {data.stats?.filter((s: any) => {
              if (s.label === "Essays Drafted" && !canAccessFeature(plan, 'essays')) return false;
              if (s.label === "Jobs Applied" && !canAccessFeature(plan, 'jobs')) return false;
              return true;
            }).map((s: any, i: number) => {
              const Icon = iconMap[s.label] || Trophy;
              const liveAppliedCount = (trackerItems || []).filter((t: any) =>
                t.reference_type === "scholarship" && (t.status === "In Progress" || t.status === "Submitted" || t.status === "Won" || t.status === "Applied")
              ).length;

              const displayValue = s.label === "Scholarships Matched" && typeof matchedScholarshipsCount === "number" && matchedScholarshipsCount > 0
                ? String(matchedScholarshipsCount)
                : s.label === "Applied Scholarship Applications" && typeof liveAppliedCount === "number" && liveAppliedCount > 0
                  ? String(liveAppliedCount)
                  : s.value;

              return (
                <div
                  key={i}
                  onClick={() => {
                    if (s.label === "Scholarships Matched") setIsSearchModalOpen(true);
                    else if (s.label === "Applied Scholarship Applications") router.push("/tracker?type=scholarship");
                    else if (s.label === "Essays Drafted") router.push("/essays");
                    else if (s.label === "Colleges Saved") router.push("/colleges");
                  }}
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", s.bg)}>
                    <Icon className={cn("w-5 h-5", s.color)} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400">{s.label}</p>
                    <p className="text-2xl font-extrabold text-slate-900 leading-tight">{displayValue}</p>
                    <p className="text-xs text-slate-400">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>



      <div className="flex flex-col md:flex-row flex-wrap gap-6 [&>*]:flex-1 [&>*]:min-w-[320px]">
        <DashboardSection
          title="Scholarships"
          icon={Bookmark}
          colorClass="text-emerald-600"
          borderClass="border-emerald-100"
          bgClass="bg-emerald-50/50"
          sectionData={data.scholarships}
          category="scholarship"
          emptyTip='Start by searching for scholarships. When you find one you are interested in, click "I Will Apply" and select the date you plan to submit your application. Once you save it, your scholarship will automatically appear here and in your tracker so you can stay organized and never miss an important deadline.'
          onRefresh={() => generateDashboard(false)}
        />
        {canAccessFeature(plan, 'essays') && (
          <DashboardSection
            title="Essays"
            icon={FileEdit}
            colorClass="text-violet-600"
            borderClass="border-violet-100"
            bgClass="bg-violet-50/50"
            sectionData={data.essays}
            category="essay"
            onRefresh={() => generateDashboard(false)}
          />
        )}
        <DashboardSection
          title="Colleges"
          icon={GraduationCap}
          colorClass="text-blue-600"
          borderClass="border-blue-100"
          bgClass="bg-blue-50/50"
          sectionData={data.colleges}
          category="college"
          onRefresh={() => generateDashboard(false)}
        />
        {coachTasks.length > 0 && canAccessFeature(plan, 'coaching') && (
          <DashboardSection
            title="Coach Action Items"
            icon={ListTodo}
            colorClass="text-indigo-600"
            borderClass="border-indigo-100"
            bgClass="bg-indigo-50/50"
            sectionData={coachSectionData}
            category="coaching"
            onRefresh={() => generateDashboard(false)}
          />
        )}
      </div>

      {(() => {
        const calculateProgress = (status: string) => {
          const s = status?.toLowerCase() || "";
          if (s === "won" || s === "completed") return 100;
          if (s === "submitted") return 80;
          if (s === "in progress" || s === "draft") return 50;
          return 0;
        };

        // Use live trackerItems from DB (fixes sync bug with sidebar tracker)
        const allTrackerItems = trackerItems || [];
        const filteredTrackerItems = allTrackerItems.filter((item: any) => {
          if (trackerCategoryFilter === "all") return true;
          const cat = (item.reference_type || "scholarship").toLowerCase();
          return cat === trackerCategoryFilter.toLowerCase();
        });

        const ITEMS_PER_PAGE = 5;
        const totalPages = Math.max(1, Math.ceil(filteredTrackerItems.length / ITEMS_PER_PAGE));
        const paginatedItems = filteredTrackerItems.slice(
          (trackerCurrentPage - 1) * ITEMS_PER_PAGE,
          trackerCurrentPage * ITEMS_PER_PAGE
        );

        const isPrevDisabled = trackerCurrentPage <= 1 || filteredTrackerItems.length <= ITEMS_PER_PAGE;
        const isNextDisabled = trackerCurrentPage >= totalPages || filteredTrackerItems.length <= ITEMS_PER_PAGE;

        return (
          <Card className="shadow-sm border-slate-100 overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-violet-600" />
                Tracker
              </CardTitle>
              <div className="flex items-center gap-2">
                <label htmlFor="tracker-category-select" className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                  Filter:
                </label>
                <select
                  id="tracker-category-select"
                  value={trackerCategoryFilter}
                  onChange={(e) => {
                    setTrackerCategoryFilter(e.target.value);
                    setTrackerCurrentPage(1);
                  }}
                  className="text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20 cursor-pointer transition-colors"
                >
                  <option value="all">All Items</option>
                  <option value="scholarship">Scholarships</option>
                  <option value="college">Colleges</option>
                  {canAccessFeature(plan, 'essays') && <option value="essay">Essays</option>}
                  {canAccessFeature(plan, 'jobs') && <option value="job">Jobs</option>}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredTrackerItems.length > 0 ? (
                <div key={`${trackerCategoryFilter}-${trackerCurrentPage}`} className="animate-in fade-in duration-300">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-slate-100">
                        <TableHead className="font-bold text-slate-600">Item Title</TableHead>
                        <TableHead className="font-bold text-slate-600">Status</TableHead>
                        <TableHead className="font-bold text-slate-600">Deadline</TableHead>
                        <TableHead className="font-bold text-slate-600">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((row: any, i: number) => {
                        const rowProgress = calculateProgress(row.status);
                        const itemCategory = (row.reference_type || "scholarship").toLowerCase();
                        return (
                          <TableRow
                            key={row.id || i}
                            onClick={() => {
                              window.location.href = `/tracker?type=${encodeURIComponent(itemCategory)}`;
                            }}
                            className="hover:bg-violet-50/60 transition-colors cursor-pointer group"
                            title="Click to view and update status in Tracker Kanban board"
                          >
                            <TableCell className="font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">
                              <div className="flex items-center gap-2">
                                <span>{row.title}</span>
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                                  {itemCategory}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={cn("inline-flex px-2.5 py-1 rounded-full text-xs font-bold", STATUS_COLORS[row.status] || "bg-slate-100 text-slate-700")}>
                                {row.status}
                              </span>
                            </TableCell>
                            <TableCell className={cn("text-sm font-semibold", row.urgent ? "text-red-500 animate-pulse" : "text-slate-500")}>
                              {row.due_date ? new Date(row.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                            </TableCell>
                            <TableCell>
                              {rowProgress === 100 ? (
                                <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Complete
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 max-w-[120px]">
                                  <Progress value={rowProgress} className="flex-1 h-2 [&>div]:bg-violet-600" />
                                  <span className="text-xs text-slate-600 font-bold w-8">{rowProgress}%</span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-8">
                  No items tracked for this category yet.
                </p>
              )}
            </CardContent>
            <CardFooter className="flex items-center justify-between pt-4 pb-4 px-6 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-500">
                Showing {filteredTrackerItems.length > 0 ? (trackerCurrentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-{Math.min(trackerCurrentPage * ITEMS_PER_PAGE, filteredTrackerItems.length)} of {filteredTrackerItems.length} items
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPrevDisabled}
                  onClick={() => setTrackerCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-8 px-3 text-xs rounded-xl gap-1 font-semibold disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </Button>
                <span className="text-xs font-extrabold text-slate-700 px-1">
                  {trackerCurrentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isNextDisabled}
                  onClick={() => setTrackerCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-8 px-3 text-xs rounded-xl gap-1 font-semibold disabled:opacity-40"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        );
      })()}

      {/* ── AI Suggested Guidance & Resource Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* 1. Suggested Colleges */}
        {data.suggested_colleges && data.suggested_colleges.length > 0 && (
          <Card className="h-full shadow-sm border-slate-100 relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 flex flex-col min-h-[150px] hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">
                <GraduationCap className="w-4 h-4 text-blue-500" />Suggested Colleges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
              {data.suggested_colleges.map((college: any, i: number) => (
                <div key={i} className="flex flex-col gap-1 bg-white/60 p-3 rounded-xl backdrop-blur-sm border border-blue-100/50 hover:bg-white hover:border-blue-200 hover:shadow-xs transition-all cursor-default">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-800">{college.name}</span>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full shrink-0 ml-2">{college.match} Match</span>
                  </div>
                  <span className="text-xs text-slate-600">{college.reason}</span>
                </div>
              ))}
            </CardContent>
            <GraduationCap className="absolute -bottom-4 -right-4 w-24 h-24 text-blue-200 opacity-60" />
          </Card>
        )}

        {/* 2. Essays */}
        {((data.essay_prompts && data.essay_prompts.length > 0) || !canAccessFeature(plan, 'essays')) && (
          <Card className="h-full shadow-sm border-slate-100 relative overflow-hidden bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100 flex flex-col min-h-[150px] hover:shadow-md transition-all">
            {!canAccessFeature(plan, 'essays') && renderLockedOverlay("Essays", "Unlock Schoolari to write stronger essays with less stress.", "scholar")}
            <CardHeader className={cn("pb-2", !canAccessFeature(plan, 'essays') && "blur-sm")}>
              <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">
                <FileEdit className="w-4 h-4 text-violet-500" />Essays
              </CardTitle>
            </CardHeader>
            <CardContent className={cn("space-y-3 relative z-10", !canAccessFeature(plan, 'essays') && "blur-sm")}>
              {(data.essay_prompts || [{ topic: "Topic 1", advice: "Tip" }, { topic: "Topic 2", advice: "Tip" }]).map((prompt: any, i: number) => (
                <div key={i} className="flex flex-col gap-1 bg-white/60 p-3 rounded-xl backdrop-blur-sm border border-violet-100/50 hover:bg-white hover:border-violet-200 hover:shadow-xs transition-all cursor-default">
                  <span className="text-sm font-bold text-slate-800">{prompt.topic}</span>
                  <span className="text-xs text-slate-600 italic">Tip: {prompt.advice}</span>
                </div>
              ))}
            </CardContent>
            <FileEdit className={cn("absolute -bottom-4 -right-4 w-24 h-24 text-violet-200 opacity-60", !canAccessFeature(plan, 'essays') && "blur-sm")} />
          </Card>
        )}

        {/* 3. Resume Builder (Full Width Row) */}
        {((data.resume_tips && data.resume_tips.length > 0) || !canAccessFeature(plan, 'resume')) && (
          <Card className="md:col-span-2 shadow-sm border-slate-100 relative overflow-hidden bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-orange-50/60 border-amber-100 flex flex-col min-h-[150px] hover:shadow-md transition-all">
            {!canAccessFeature(plan, 'resume') && renderLockedOverlay("Resume Builder", "Unlock Schoolari to build a standout resume in minutes.", "scholar")}
            <CardHeader className={cn("pb-2 flex flex-row items-center justify-between", !canAccessFeature(plan, 'resume') && "blur-sm")}>
              <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">
                <FileText className="w-4 h-4 text-amber-500" />
                Resume Builder
              </CardTitle>
              {canAccessFeature(plan, 'resume') && (
                <Link
                  href="/resume"
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-100/80 hover:bg-amber-200/80 px-3 py-1 rounded-xl transition-all flex items-center gap-1.5"
                >
                  Open Resume Builder <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </CardHeader>
            <CardContent className={cn("pt-2 relative z-10", !canAccessFeature(plan, 'resume') && "blur-sm")}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(data.resume_tips || [
                  "Highlight leadership roles and extracurricular impact with concrete achievements.",
                  "Detail technical and creative projects, emphasizing teamwork and problem solving.",
                  "Quantify results with measurable metrics, awards, and milestones."
                ]).map((tip: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-amber-100/70 shadow-2xs hover:bg-white hover:border-amber-200 hover:shadow-xs transition-all cursor-default"
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <FileText className={cn("absolute -bottom-4 -right-4 w-28 h-28 text-amber-200 opacity-40", !canAccessFeature(plan, 'resume') && "blur-sm")} />
          </Card>
        )}

        {/* 4. Earn Income */}
        {((data.income_ideas && data.income_ideas.length > 0) || !canAccessFeature(plan, 'income')) && (
          <Card className="h-full shadow-sm border-emerald-100 bg-emerald-50/20 relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col min-h-[150px] hover:shadow-md transition-all">
            {!canAccessFeature(plan, 'income') && renderLockedOverlay("Earn Income", "Unlock Schoolari to discover real ways to earn money now.", "scholar")}
            <CardHeader className={cn("pb-2", !canAccessFeature(plan, 'income') && "blur-sm")}>
              <CardTitle className="text-base flex items-center gap-2 font-bold text-emerald-800">
                <Banknote className="w-5 h-5 text-emerald-600" />
                Earn Income
              </CardTitle>
            </CardHeader>
            <CardContent className={cn("relative z-10", !canAccessFeature(plan, 'income') && "blur-sm")}>
              {/* AI Ideas */}
              {((data.income_ideas && data.income_ideas.length > 0) || !canAccessFeature(plan, 'income')) && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold text-emerald-600/70 uppercase tracking-wider">AI Suggestions</h4>
                  <div className="space-y-3">
                    {(data.income_ideas || [{ opportunity: "Idea 1", difficulty: "Easy", how_to_start: "Start here" }]).map((idea: any, i: number) => (
                      <div key={i} className="flex flex-col gap-1.5 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-emerald-100/50 hover:bg-white hover:border-emerald-200 hover:shadow-xs transition-all shadow-sm cursor-default">
                        <span className="text-sm font-bold text-emerald-900">{idea.opportunity}</span>
                        <span className="text-xs text-slate-600 font-medium">Difficulty: {idea.difficulty}</span>
                        <span className="text-xs text-slate-600 leading-snug mt-1">{idea.how_to_start}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <Banknote className={cn("absolute -bottom-4 -right-4 w-24 h-24 text-emerald-200 opacity-60", !canAccessFeature(plan, 'income') && "blur-sm")} />
          </Card>
        )}

        {/* 5. College Coach (Unlocked for Elite, Locked Overlay for Non-Elite) */}
        <Card className="h-full shadow-sm border-indigo-100 relative overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50 flex flex-col min-h-[150px] hover:shadow-md transition-all">
          {!canAccessFeature(plan, 'coaching') && renderLockedOverlay("College Coach", "Unlock your personal Schoolari Coach to guide you every step of the way.", "elite")}
          
          <CardHeader className={cn("pb-2 flex flex-row items-center justify-between", !canAccessFeature(plan, 'coaching') && "blur-sm")}>
            <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              College Coach
            </CardTitle>
            {canAccessFeature(plan, 'coaching') && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Elite Active
              </span>
            )}
          </CardHeader>

          <CardContent className={cn("space-y-3 relative z-10 flex-1 flex flex-col justify-between", !canAccessFeature(plan, 'coaching') && "blur-sm")}>
            {!canAccessFeature(plan, 'coaching') ? (
              <div className="space-y-2">
                <div className="h-4 bg-indigo-100 rounded-full w-4/5" />
                <div className="h-4 bg-indigo-100 rounded-full w-3/5" />
                <div className="h-4 bg-indigo-100 rounded-full w-2/3" />
              </div>
            ) : (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="bg-white/70 backdrop-blur-sm p-3.5 rounded-xl border border-indigo-100/70 space-y-1.5 hover:bg-white hover:border-indigo-200 hover:shadow-xs transition-all cursor-default">
                    <p className="text-xs font-bold text-indigo-950">1-on-1 Admissions Coaching</p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Connect with your dedicated coach for personalized application reviews, mock interviews, and strategy planning.
                    </p>
                  </div>

                  {coachTasks.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Pending Coach Action Items ({coachTasks.length})</p>
                      {coachTasks.slice(0, 2).map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-white/60 p-2 rounded-lg border border-indigo-100/50 hover:bg-white hover:border-indigo-200 hover:shadow-xs transition-all cursor-default">
                          <span className="font-semibold text-slate-800 truncate max-w-[200px]">{t.title}</span>
                          <span className="text-[10px] text-indigo-600 font-bold">Action Item</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-100 font-medium hover:bg-white hover:border-indigo-200 hover:shadow-xs transition-all cursor-default">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>You're all caught up with your coaching action items!</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Link
                    href="/coaching"
                    className="w-full text-center text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    Go to Coaching <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </CardContent>

          <GraduationCap className={cn("absolute -bottom-4 -right-4 w-24 h-24 text-indigo-200 opacity-60", !canAccessFeature(plan, 'coaching') && "blur-sm")} />
        </Card>
      </div>

      {/* ── Scholarship Search Modal ── */}
      {isSearchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm custom-scrollbar animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setIsSearchModalOpen(false); }}
        >
          <div className="bg-slate-50 w-full max-w-5xl min-h-[50vh] max-h-[95vh] flex flex-col shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200 mb-[10vh]">
            <div className="p-6 md:p-8 bg-white border-b border-slate-200 relative shrink-0">
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-extrabold text-slate-900">Find Scholarships</h2>
              <p className="text-sm text-slate-500 mt-1 mb-6 max-w-lg">
                Search thousands of scholarship opportunities based on your interests.
              </p>

              <div className="relative max-w-3xl">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search scholarships (e.g., STEM, California, Sports)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-12 pr-12 rounded-xl border-1 border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 text-base font-medium transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 p-6 md:p-8 bg-slate-50 overflow-y-auto">
              {isSearching ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map(i => <ScholarshipSearchSkeleton key={i} />)}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {searchResults.map(scholarship => {
                    const status = trackerItems?.find((t: any) => t.reference_type === "scholarship" && t.reference_id === scholarship.id)?.status ?? null;
                    return (
                      <ScholarshipCard key={scholarship.id} scholarship={scholarship} userActionStatus={status} />
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No scholarships found</h3>
                  <p className="text-slate-500 max-w-sm">
                    {searchQuery ? "Try adjusting your search terms or keywords." : "Start typing to find matching scholarships."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
