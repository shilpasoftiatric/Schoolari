"use client";

import { useState, useEffect } from "react";
import {
  Flame, ArrowRight, Sparkles, Search, Bookmark, Send, FileEdit,
  FolderOpen, Calendar, MoreHorizontal, CheckCircle2, Circle, Flag, GraduationCap,
  Users, Laptop, Video, Wallet, Trophy, BarChart3, Loader2, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";

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
  Bookmark, Send, FileEdit, FolderOpen, Users, Laptop, Video, Wallet, Sparkles, Trophy,
  "Scholarships Matched": Bookmark,
  "Applied Scholarship Applications": CheckCircle2,
  "Essays Drafted": FileEdit,
  "Colleges Saved": GraduationCap
};

function DashboardSection({ title, icon: Icon, colorClass, borderClass, bgClass, sectionData }: { title: string, icon: any, colorClass: string, borderClass: string, bgClass: string, sectionData: any }) {
  const completedTasks = sectionData?.tasks?.filter((t: any) => t.done).length || 0;
  const totalTasks = sectionData?.tasks?.length || 0;

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
        {/* Today's Priority */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Today's Priority (Max 3)</h4>
          <div className="space-y-2">
            {sectionData?.tasks && sectionData.tasks.length > 0 ? (
              sectionData.tasks.slice(0, 3).map((t: any, i: number) => (
                <div key={i} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  {t.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                  )}
                  <span className={cn("text-sm font-semibold", t.done ? "line-through text-slate-400" : "text-slate-700")}>
                    {t.title}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic pl-2">No priority tasks today.</p>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Upcoming Deadlines</h4>
          <div className="space-y-2">
            {sectionData?.deadlines && sectionData.deadlines.length > 0 ? (
              sectionData.deadlines.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="text-sm font-semibold text-slate-700 truncate max-w-[140px]">{d.name}</span>
                  <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ml-2", d.urgent ? "bg-red-50 text-red-600 border border-red-100 animate-pulse" : "bg-slate-100 text-slate-600")}>
                    {d.date}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic pl-2">No upcoming deadlines.</p>
            )}
          </div>
        </div>

        {/* This Week's Goals */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">This Week's Goals (Max 5)</h4>
          <div className="space-y-2">
            {sectionData?.goals && sectionData.goals.length > 0 ? (
              sectionData.goals.slice(0, 5).map((g: string, i: number) => (
                <div key={i} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <Flag className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-sm font-semibold text-slate-700">{g}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic pl-2">No goals set for this week.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardClient({ initialData, firstName }: { initialData: any, firstName: string }) {
  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!data) {
      generateDashboard();
    }
  }, []);

  const generateDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/generate-dashboard', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate AI data");
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl">
        <p>Error loading dashboard: {error}</p>
        <Button onClick={generateDashboard} className="mt-4">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            Good evening, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{firstName}</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm italic">"Every scholarship application is a step closer to your dream."</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-amber-200 bg-amber-50 text-amber-600 font-semibold text-sm shrink-0">
          <Flame className="w-4 h-4" />
          Day 1 Streak
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={generateDashboard} className="gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white shadow-md rounded-xl">
          <Sparkles className="w-4 h-4" /> Refresh AI Dashboard
        </Button>
        <Button variant="outline" className="gap-2 rounded-xl border-slate-200">
          <Search className="w-4 h-4 text-slate-400" /> Find Scholarships
        </Button>
      </div>

      {/* ── Row 1: Progress Overview (Always Visible) ── */}
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

      {/* ── Row 2: Three Content Sections Grid (Scholarships, Essays, Colleges) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardSection 
          title="Scholarships" 
          icon={Bookmark} 
          colorClass="text-emerald-600" 
          borderClass="border-emerald-100" 
          bgClass="bg-emerald-50/50" 
          sectionData={data.scholarships} 
        />
        <DashboardSection 
          title="Essays" 
          icon={FileEdit} 
          colorClass="text-violet-600" 
          borderClass="border-violet-100" 
          bgClass="bg-violet-50/50" 
          sectionData={data.essays} 
        />
        <DashboardSection 
          title="Colleges" 
          icon={GraduationCap} 
          colorClass="text-blue-600" 
          borderClass="border-blue-100" 
          bgClass="bg-blue-50/50" 
          sectionData={data.colleges} 
        />
      </div>

      {/* ── Row 3: Matched Scholarships (Scholarship Tracker - Always Visible) ── */}
      <Card className="shadow-sm border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-slate-800">Scholarship Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          {data.tracker && data.tracker.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Scholarship</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tracker.map((row: any, i: number) => (
                  <TableRow key={i} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-slate-800">{row.name}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex px-2.5 py-1 rounded-full text-xs font-semibold", STATUS_COLORS[row.status] || "bg-slate-100 text-slate-700")}>
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell className={cn("text-sm font-semibold", row.urgent ? "text-red-500 animate-pulse" : "text-slate-500")}>
                      {row.deadline}
                    </TableCell>
                    <TableCell>
                      {row.progress === 100 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <div className="flex items-center gap-2 max-w-[120px]">
                          <Progress value={row.progress || 0} className="flex-1 h-1.5 [&>div]:bg-violet-600" />
                          <span className="text-xs text-slate-500 font-semibold w-8">{row.progress || 0}%</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-500 italic text-center py-4">No matched scholarships tracked yet.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Row 4: Ways to Earn (AI Income Ideas - Always Visible) ── */}
      {data.income_ideas && data.income_ideas.length > 0 && (
        <Card className="shadow-sm border-slate-100 relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">
              <Wallet className="w-4 h-4 text-emerald-500" /> Ways to Earn
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {data.income_ideas.map((idea: any, i: number) => (
              <div key={i} className="flex flex-col gap-1.5 bg-white/70 p-4 rounded-2xl backdrop-blur-sm border border-emerald-100/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-sm font-bold text-slate-800">{idea.title || idea.label}</span>
                </div>
                <span className="text-xs text-slate-600 leading-relaxed">{idea.description || "Actionable startup side hustle customized to your skillset."}</span>
              </div>
            ))}
          </CardContent>
          <Wallet className="absolute -bottom-4 -right-4 w-24 h-24 text-emerald-200 opacity-60" />
        </Card>
      )}

      {/* ── Row 5: AI Suggested Resources (Colleges, Essay Prompts, Resume Tips) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Suggested Colleges */}
        {data.suggested_colleges && data.suggested_colleges.length > 0 && (
          <Card className="shadow-sm border-slate-100 relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
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
          <Card className="shadow-sm border-slate-100 relative overflow-hidden bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100">
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

        {/* Resume Tips */}
        {data.resume_tips && data.resume_tips.length > 0 && (
          <Card className="shadow-sm border-slate-100 relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
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
      </div>
    </div>
  );
}
