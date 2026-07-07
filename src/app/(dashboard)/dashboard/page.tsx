import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  WavingHand,
  Flame,
  ArrowRight,
  Sparkles,
  Search,
  Bookmark,
  Send,
  FileEdit,
  FolderOpen,
  Calendar,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  Flag,
  GraduationCap,
  Users,
  Laptop,
  Video,
  Wallet,
  Trophy,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Dashboard | Schoolari" };

// ── Mock data ──────────────────────────────────────────────
const TASKS = [
  { id: 1, title: "Complete your profile", done: true },
  { id: 2, title: "Review 3 scholarship matches", done: false },
  { id: 3, title: "Upload transcript", done: false },
];

const GOALS = [
  "Apply for 2 new scholarships this week",
  "Finish the 'Why Me' essay draft",
  "Log in 5 days in a row",
];

const STATS = [
  { label: "Saved", sub: "Scholarships", value: "34", icon: Bookmark, color: "text-emerald-500", bg: "bg-emerald-50" },
  { label: "Applied", sub: "Applications", value: "12", icon: Send, color: "text-blue-500", bg: "bg-blue-50" },
  { label: "Essays", sub: "Completed", value: "8", icon: FileEdit, color: "text-violet-500", bg: "bg-violet-50" },
  { label: "Docs", sub: "Uploaded", value: "14", icon: FolderOpen, color: "text-amber-500", bg: "bg-amber-50" },
];

const DEADLINES = [
  { title: "Upload Transcript", time: "Tomorrow", color: "text-violet-600" },
  { title: "Essay Due", time: "5 Days", color: "text-amber-500" },
  { title: "College Application", time: "12 Days", color: "text-blue-500" },
];

const TRACKER = [
  { name: "Coca-Cola Scholarship", status: "In Progress", deadline: "2 Days", progress: 70, urgent: true },
  { name: "Dell Scholarship", status: "Submitted", deadline: "Waiting", progress: 100, urgent: false },
  { name: "STEM Scholarship", status: "Draft", deadline: "8 Days", progress: 30, urgent: false },
];

const STATUS_COLORS: Record<string, string> = {
  "In Progress": "bg-blue-100 text-blue-700",
  "Submitted": "bg-emerald-100 text-emerald-700",
  "Draft": "bg-amber-100 text-amber-700",
  "Won": "bg-purple-100 text-purple-700",
  "Lost": "bg-red-100 text-red-700",
};

const INCOME_IDEAS = [
  { label: "Tutoring", icon: Users, color: "text-emerald-500" },
  { label: "Freelancing", icon: Laptop, color: "text-slate-500" },
  { label: "Content Creator", icon: Video, color: "text-blue-500" },
];

const WEEK_BARS = [
  { day: "M", pct: 60 }, { day: "T", pct: 80 }, { day: "W", pct: 40 },
  { day: "T", pct: 95 }, { day: "F", pct: 70 }, { day: "S", pct: 30 },
];

const completedTasks = TASKS.filter((t) => t.done).length;

// ── Dashboard Page ─────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("first_name").eq("id", user.id).single()
    : { data: null };

  const firstName = profile?.first_name || user?.email?.split("@")[0] || "Student";
  return (
    <div className="space-y-6 pb-28">
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
          14 Day Streak
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Button className="gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white shadow-md rounded-xl">
          Continue Today's Tasks <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" className="gap-2 rounded-xl border-slate-200">
          <Sparkles className="w-4 h-4 text-violet-500" /> Ask AI
        </Button>
        <Button variant="outline" className="gap-2 rounded-xl border-slate-200">
          <Search className="w-4 h-4 text-slate-400" /> Find Scholarships
        </Button>
      </div>

      {/* ── Row 1: Priority + Deadlines ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Card */}
        <Card className="lg:col-span-2 shadow-sm border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-violet-500" />Today's Priority
            </CardTitle>
            <MoreHorizontal className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white font-black text-[10px] text-center leading-tight shrink-0">
                Coca-Cola
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">Coca-Cola Scholarship</p>
                <p className="text-sm text-red-500 font-semibold mt-0.5">Deadline: 2 Days</p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Progress</span><span className="font-semibold">70%</span>
                  </div>
                  <Progress value={70} className="h-2 [&>div]:bg-violet-600" />
                </div>
              </div>
            </div>
            <Button variant="ghost" className="w-full gap-2 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-xl font-semibold">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Deadline Alerts */}
        <Card className="shadow-sm border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-500" />Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {DEADLINES.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg bg-slate-50`}>
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{d.title}</span>
                </div>
                <span className={`text-sm font-bold ${d.color}`}>{d.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Progress Overview ── */}
      <Card className="shadow-sm border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Progress Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">{s.label}</p>
                  <p className="text-2xl font-extrabold text-slate-900 leading-tight">{s.value}</p>
                  <p className="text-xs text-slate-400">{s.sub}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" stroke="#F1F5F9" strokeWidth="6" fill="none" />
                  <circle cx="28" cy="28" r="22" stroke="#10B981" strokeWidth="6" fill="none"
                    strokeDasharray={`${2 * Math.PI * 22 * 0.92} ${2 * Math.PI * 22 * 0.08}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-extrabold text-slate-800">92%</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Profile</p>
                <p className="text-2xl font-extrabold text-slate-900 leading-tight">92%</p>
                <p className="text-xs text-slate-400">Complete</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Row 3: Tasks + Goals ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks */}
        <Card className="shadow-sm border-slate-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today's Tasks</CardTitle>
              <span className="text-sm font-semibold text-violet-600">{completedTasks}/{TASKS.length}</span>
            </div>
            <Progress value={(completedTasks / TASKS.length) * 100} className="mt-2 h-1.5 [&>div]:bg-violet-600" />
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            {TASKS.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-1.5">
                {t.done
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  : <Circle className="w-5 h-5 text-slate-300 shrink-0" />}
                <span className={`text-sm ${t.done ? "line-through text-slate-400" : "text-slate-700"}`}>
                  {t.title}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="shadow-sm border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">This Week's Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {GOALS.map((g, i) => (
              <div key={i} className="flex items-start gap-3">
                <Flag className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-sm text-slate-700">{g}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Scholarship Tracker ── */}
      <Card className="shadow-sm border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scholarship Tracker</CardTitle>
        </CardHeader>
        <CardContent>
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
              {TRACKER.map((row, i) => (
                <TableRow key={i} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-800">{row.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[row.status]}`}>
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell className={`text-sm font-semibold ${row.urgent ? "text-red-500" : "text-slate-500"}`}>
                    {row.deadline}
                  </TableCell>
                  <TableCell>
                    {row.progress === 100 ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <div className="flex items-center gap-2 max-w-[120px]">
                        <Progress value={row.progress} className="flex-1 h-1.5 [&>div]:bg-violet-600" />
                        <span className="text-xs text-slate-500 font-semibold w-8">{row.progress}%</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-center mt-4">
            <Button variant="ghost" size="sm" className="gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-50">
              View All Scholarships <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Row 5: College Planning + Income + Weekly Goals ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* College Planning */}
        <Card className="shadow-sm border-slate-100 relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-500" />College Planning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10">
            <div className="flex gap-3 text-sm">
              <span className="text-slate-400 w-32">Saved Colleges:</span>
              <span className="font-bold text-slate-900">4</span>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-slate-400 w-32">Next Deadline:</span>
              <span className="font-bold text-amber-500">12 Days</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1.5">Admission Status</p>
              <div className="flex items-center gap-2">
                <Progress value={60} className="flex-1 h-1.5 [&>div]:bg-blue-500" />
                <span className="text-xs text-slate-500 font-semibold">60%</span>
              </div>
            </div>
          </CardContent>
          <GraduationCap className="absolute -bottom-4 -right-4 w-24 h-24 text-blue-100 opacity-60 rotate-12" />
        </Card>

        {/* Ways to Earn (Income Center) */}
        <Card className="shadow-sm border-slate-100 relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-500" />Ways To Earn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10">
            {INCOME_IDEAS.map((idea, i) => (
              <div key={i} className="flex items-center gap-3">
                <idea.icon className={`w-4 h-4 ${idea.color} shrink-0`} />
                <span className="text-sm font-medium text-slate-700">{idea.label}</span>
              </div>
            ))}
          </CardContent>
          <Wallet className="absolute -bottom-4 -right-4 w-24 h-24 text-emerald-200 opacity-60" />
        </Card>

        {/* Weekly Goals */}
        <Card className="shadow-sm border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-500" />Weekly Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {/* Circular ring */}
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" stroke="#F1F5F9" strokeWidth="7" fill="none" />
                  <circle cx="32" cy="32" r="26" stroke="#8B5CF6" strokeWidth="7" fill="none"
                    strokeDasharray={`${2 * Math.PI * 26 * 0.82} ${2 * Math.PI * 26 * 0.18}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-extrabold text-slate-900">82%</span>
                  <span className="text-[9px] text-slate-400 leading-tight">Done</span>
                </div>
              </div>
              {/* Bar chart */}
              <div className="flex-1 flex items-end justify-between gap-1 h-10">
                {WEEK_BARS.map((bar, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className="w-full rounded-t bg-violet-400 opacity-80"
                      style={{ height: `${bar.pct}%`, minHeight: 4 }}
                    />
                    <span className="text-[9px] text-slate-400 font-bold">{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Floating AI Bar ── */}
      <div className="fixed bottom-5 left-[280px] right-5 flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xl z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-violet-700">Schoolari AI</p>
            <p className="text-xs text-slate-500">"Need help with your essay?"</p>
          </div>
        </div>
        <Button size="sm" className="gap-2 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-xl shadow-md">
          <Sparkles className="w-3.5 h-3.5" /> Ask AI
        </Button>
      </div>
    </div>
  );
}
