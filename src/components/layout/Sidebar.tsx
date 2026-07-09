"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  FolderOpen,
  FileEdit,
  Briefcase,
  GraduationCap,
  DollarSign,
  Settings,
  Trophy,
  User,
  Landmark,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const NAV_GROUPS = [
  {
    label: "MAIN",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      //  { label: "Scholarships", icon: Search, href: "/scholarships" },
      // {label: "Tracker", icon: Trophy, href: "/tracker" },
    ],
  },
  // {
  //   label: "ACADEMIC",
  //   items: [
  //     { label: "Documents", icon: FolderOpen, href: "/documents" },
  //     { label: "Essays", icon: FileEdit, href: "/essays" },
  //     { label: "Colleges", icon: Landmark, href: "/colleges" },
  //   ],
  // },
  {
    label: "GROWTH",
    items: [
      { label: "Career", icon: Briefcase, href: "/career" },
      // { label: "Income", icon: DollarSign, href: "/income" },
      // { label: "Coaching", icon: Trophy, href: "/coaching" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "Profile", icon: User, href: "/profile" },
      // { label: "Settings", icon: Settings, href: "/settings" },
    ],
  },
];

import { useState, useEffect } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [selectedHref, setSelectedHref] = useState(pathname);

  useEffect(() => {
    setSelectedHref(pathname);
  }, [pathname]);

  return (
    <div className="flex flex-col h-full w-64 border-r border-slate-200 bg-slate-150 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-200">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-100">
          <GraduationCap className="w-5 h-5 text-violet-600" />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-slate-900">
          School<span className="text-violet-600">ari</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">

        {/* Ask Schoolari AI Card */}
        <Link
          href="/ai"
          onClick={() => setSelectedHref("/ai")}
          className={cn(
            "flex items-center justify-between p-3 rounded-[24px] bg-slate-200 border border-slate-100 hover:bg-slate-100 transition-colors group",
            selectedHref === "/ai" && "bg-slate-100 border-violet-200"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-violet-700 leading-tight">Ask Schoolari AI</p>
              <p className="text-xs font-medium text-slate-400 mt-0.5 leading-tight">Get personalized help</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
        </Link>

        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <h3 className="px-3 text-xs font-bold tracking-wider text-slate-400 mb-2">
              {group.label}
            </h3>
            {group.items.map((item) => {
              const isActive = selectedHref === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSelectedHref(item.href)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group",
                    isActive
                      ? "bg-violet-50 text-violet-700 font-bold"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-4.5 h-4.5 shrink-0 transition-colors",
                      isActive ? "text-violet-600" : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Motivational Card */}
      <div className="mx-3 mb-4 p-4 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg shadow-purple-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20">
            <Trophy className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">You're doing great!</p>
            <p className="text-xs text-purple-200 leading-tight">Keep up the momentum.</p>
          </div>
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-purple-200">Profile completion</span>
          <span className="text-sm font-bold">82%</span>
        </div>
        <Progress value={82} className="h-1.5 bg-white/20 [&>div]:bg-emerald-400" />
      </div>
    </div>
  );
}
