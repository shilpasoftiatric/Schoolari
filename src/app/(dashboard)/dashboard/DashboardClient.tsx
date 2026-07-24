"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Trophy, Bookmark, FileEdit, GraduationCap, ArrowRight, Lightbulb, Bell, Banknote, ListTodo, Flame, Send, FolderOpen, Calendar, MoreHorizontal, CheckCircle2, Circle, Flag, Users, Laptop, Video, Wallet, BarChart3, Loader2, FileText, X, PlusCircle, ChevronRight, ChevronLeft, Target } from "lucide-react";
import { useTransition } from "react";
import { completeTask, moveTaskToTracker, skipTask } from "@/app/actions/tasks";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { ScholarshipCard } from "@/components/ui/ScholarshipCard";
import { searchScholarships } from "@/app/actions/scholarships";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

  const handleComplete = (taskId: string, taskTitle: string) => {
    // Optimistic UI state update
    setCompletedTaskIds((prev) => ({ ...prev, [taskId]: true }));
    startTransition(async () => {
      await completeTask(taskId, taskTitle);
      if (onRefresh) onRefresh();
    });
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
          {totalTasks > 0 && (
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-100 shadow-sm")}>
              {completedTasks}/{totalTasks} Done
            </span>
          )}
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

export function DashboardClient({ initialData, firstName, streak = 1, userGoals = [], globalTasks = [] }: { initialData: any, firstName: string, streak?: number, userGoals?: string[], globalTasks?: any[] }) {
  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");

  const [trackerCategoryFilter, setTrackerCategoryFilter] = useState<string>("all");
  const [trackerCurrentPage, setTrackerCurrentPage] = useState<number>(1);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  useEffect(() => {
    if (!data) {
      generateDashboard();
    }
  }, []);

  const generateDashboard = async (showSkeleton = true) => {
    try {
      if (showSkeleton) setLoading(true);
      const res = await fetch('/api/ai/generate-dashboard', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate AI data");
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (showSkeleton) setLoading(false);
    }
  };

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

  return (
    <div className="space-y-8 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
        <Button onClick={() => generateDashboard(true)} className="gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white shadow-md rounded-xl">
          <Lightbulb className="w-4 h-4" /> Refresh AI Dashboard
        </Button>
        <Button variant="outline" onClick={() => setIsSearchModalOpen(true)} className="gap-2 rounded-xl border-slate-200">
          <Search className="w-4 h-4 text-slate-400" /> Find Scholarships
        </Button>
      </div>

      <Card className="shadow-sm border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">Progress Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {data.stats?.map((s: any, i: number) => {
              const Icon = iconMap[s.label] || Trophy;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", s.bg)}>
                    <Icon className={cn("w-5 h-5", s.color)} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400">{s.label}</p>
                    <p className="text-2xl font-extrabold text-slate-900 leading-tight">{s.value}</p>
                    <p className="text-xs text-slate-400">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>



      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

      {(() => {
        const calculateProgress = (status: string) => {
          const s = status?.toLowerCase() || "";
          if (s === "won" || s === "completed") return 100;
          if (s === "submitted") return 80;
          if (s === "in progress" || s === "draft") return 50;
          return 0;
        };

        const allTrackerItems = data.tracker || [];
        const filteredTrackerItems = allTrackerItems.filter((item: any) => {
          if (trackerCategoryFilter === "all") return true;
          const cat = (item.category || "scholarship").toLowerCase();
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
                  <option value="essay">Essays</option>
                  <option value="college">Colleges</option>
                  <option value="job">Jobs</option>
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
                        const itemCategory = (row.category || "scholarship").toLowerCase();
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
                                <span>{row.name}</span>
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
                              {row.deadline}
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

      {/* ── Row 5: AI Suggested Resources (Colleges, Essay Prompts, Resume Tips) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Suggested Colleges */}
        {data.suggested_colleges && data.suggested_colleges.length > 0 && (
          <Card className="h-full shadow-sm border-slate-100 relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">
                <GraduationCap className="w-4 h-4 text-blue-500" />Suggested Colleges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
              {data.suggested_colleges.map((college: any, i: number) => (
                <div key={i} className="flex flex-col gap-1 bg-white/60 p-3 rounded-xl backdrop-blur-sm border border-blue-100/50">
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

        {/* Essay Prompts */}
        {data.essay_prompts && data.essay_prompts.length > 0 && (
          <Card className="h-full shadow-sm border-slate-100 relative overflow-hidden bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">
                <FileEdit className="w-4 h-4 text-violet-500" />Essay Prompts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
              {data.essay_prompts.map((prompt: any, i: number) => (
                <div key={i} className="flex flex-col gap-1 bg-white/60 p-3 rounded-xl backdrop-blur-sm border border-violet-100/50">
                  <span className="text-sm font-bold text-slate-800">{prompt.topic}</span>
                  <span className="text-xs text-slate-600 italic">Tip: {prompt.advice}</span>
                </div>
              ))}
            </CardContent>
            <FileEdit className="absolute -bottom-4 -right-4 w-24 h-24 text-violet-200 opacity-60" />
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-stretch">
        {/* Resume Tips */}
        {data.resume_tips && data.resume_tips.length > 0 && (
          <Card className="h-fit shadow-sm border-slate-100 relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">
                <FileText className="w-4 h-4 text-amber-500" />Resume Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
              <ul className="list-disc list-outside ml-4 text-sm text-slate-700 space-y-2 bg-white/60 p-4 rounded-xl backdrop-blur-sm border border-amber-100/50">
                {data.resume_tips.map((tip: string, i: number) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </CardContent>
            <FileText className="absolute -bottom-4 -right-4 w-24 h-24 text-amber-200 opacity-60" />
          </Card>
        )}

        {/* ── Row 6: Ways to Earn (Earn While You Learn) ── */}
        {data.income_ideas && data.income_ideas.length > 0 && (
          <Card className="h-full shadow-sm border-emerald-100 bg-emerald-50/20 relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 font-bold text-emerald-800">
                <Banknote className="w-5 h-5 text-emerald-600" />
                Ways to Earn
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
                {/* AI Ideas */}
                {data.income_ideas && data.income_ideas.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold text-emerald-600/70 uppercase tracking-wider">AI Suggestions</h4>
                    <div className="space-y-3">
                      {data.income_ideas.map((idea: any, i: number) => (
                        <div key={i} className="flex flex-col gap-1.5 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-emerald-100/50 hover:bg-emerald-50/80 transition-colors shadow-sm">
                          <span className="text-sm font-bold text-emerald-900">{idea.opportunity}</span>
                          <span className="text-xs text-slate-600 font-medium">Difficulty: {idea.difficulty}</span>
                          <span className="text-xs text-slate-600 leading-snug mt-1">{idea.how_to_start}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
            <Banknote className="absolute -bottom-4 -right-4 w-24 h-24 text-emerald-200 opacity-60" />
          </Card>
        )}
      </div>

      {/* ── Scholarship Search Modal ── */}
      {isSearchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto custom-scrollbar animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setIsSearchModalOpen(false); }}
        >
          <div className="bg-slate-50 w-full max-w-5xl min-h-[50vh] flex flex-col shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200 mb-[10vh]">
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
                  className="w-full h-14 pl-12 pr-12 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 text-base font-medium transition-all"
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
                  {searchResults.map(scholarship => (
                    <ScholarshipCard key={scholarship.id} scholarship={scholarship} userActionStatus={null} />
                  ))}
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
