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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  Users,
  MessageSquare,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const NAV_GROUPS = [
  {
    label: "MAIN",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", disabled: false },
      { label: "Colleges", icon: Landmark, href: "/colleges", disabled: false },
      { label: "Scholarships", icon: Search, href: "/scholarships", disabled: false },
    ],
  },
  {
    label: "ACADEMIC",
    items: [
      { label: "Documents", icon: FolderOpen, href: "/documents", disabled: false },
      { label: "Essays", icon: FileEdit, href: "/essays", disabled: true },
      { label: "Resume Builder", icon: FileText, href: "/resume", disabled: true },
    ],
  },
  {
    label: "CAREER & GROWTH",
    items: [
      { label: "Jobs & Internships", icon: Briefcase, href: "/jobs", disabled: true },
      { label: "Earn Income", icon: DollarSign, href: "/income", disabled: false },
      { label: "College Coach", icon: GraduationCap, href: "/coaching", disabled: true },
    ],
  },
  {
    label: "COMMUNITY",
    items: [
      { label: "Community", icon: Users, href: "/community", disabled: true },
      { label: "Messages", icon: MessageSquare, href: "/messages", disabled: true },
      { label: "Support", icon: HelpCircle, href: "/support", disabled: true },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "Profile", icon: User, href: "/profile", disabled: false },
    ],
  },
];

import { useState, useEffect } from "react";

interface SidebarProps {
  siteName?: string;
  progressData?: {
    percentage: number;
    milestone: string;
    messageTitle: string;
    messageSubtitle: string;
  };
}

export default function Sidebar({ siteName = "Schoolari", progressData }: SidebarProps) {
  const pathname = usePathname();
  const [selectedHref, setSelectedHref] = useState(pathname);
  const [isCardCollapsed, setIsCardCollapsed] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSelectedHref(pathname);
  }, [pathname]);

  return (
    <div className={cn("flex flex-col h-full border-r border-slate-200 bg-slate-150 shrink-0 transition-all duration-300 ease-in-out relative", isSidebarCollapsed ? "w-20" : "w-64")}>
      {/* Header / Logo Area */}
      <div className={cn("flex items-center border-b border-slate-200 hover:bg-slate-50 transition-colors h-[76px]", isSidebarCollapsed ? "justify-center gap-1.5" : "justify-between pl-5 pr-2")}>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 shrink-0 rounded-xl bg-violet-100">
            <GraduationCap className="w-5 h-5 text-violet-600" />
          </div>
          {!isSidebarCollapsed && (
            <span className="text-xl font-extrabold tracking-tight text-slate-900 truncate">
              School<span className="text-violet-600">ari</span>
            </span>
          )}
        </Link>
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={cn("text-slate-500 hover:text-slate-900 rounded-lg transition-colors", isSidebarCollapsed ? "p-1" : "p-2")}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-violet-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-violet-300">

        {/* Ask Schoolari AI Card */}
        <Link
          href="/ai"
          onClick={() => setSelectedHref("/ai")}
          title="Ask Schoolari AI"
          className={cn(
            "flex items-center justify-between rounded-[24px] bg-slate-200 border border-slate-100 hover:bg-slate-100 transition-colors group",
            isSidebarCollapsed ? "px-2 py-0 justify-center" : "p-2",
            selectedHref === "/ai" && "bg-slate-100 border-violet-200"
          )}
        >
          <div className={cn("flex items-center", isSidebarCollapsed ? "justify-center w-full" : "gap-3")}>
            <div className="flex items-center justify-center w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <Sparkles className="w-5 h-5 text-white relative z-10" />
            </div>
            {!isSidebarCollapsed && (
              <div className="relative z-10 space-y-1 overflow-hidden">
                <p className="text-sm font-bold text-violet-700 leading-tight truncate">Ask {siteName} AI</p>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-tight truncate">Get personalized help</p>
              </div>
            )}
          </div>
          {!isSidebarCollapsed && (
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors shrink-0" />
          )}
        </Link>

        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            {!isSidebarCollapsed && (
              <h3 className="px-3 text-xs font-bold tracking-wider text-slate-400 mb-2 truncate">
                {group.label}
              </h3>
            )}
            {group.items.map((item) => {
              const isActive = selectedHref === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.disabled ? "#" : item.href}
                  onClick={(e) => {
                    if (item.disabled) {
                      e.preventDefault();
                      return;
                    }
                    setSelectedHref(item.href);
                  }}
                  className={cn(
                    "flex items-center rounded-xl text-sm font-semibold transition-all group",
                    isSidebarCollapsed ? "justify-center py-2.5 px-0 mx-2" : "gap-3 px-3 py-2.5",
                    item.disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
                    isActive && !item.disabled
                      ? "bg-violet-50 text-violet-700 font-bold"
                      : !item.disabled ? "text-slate-500 hover:bg-slate-50 hover:text-slate-800" : "text-slate-400"
                  )}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <item.icon
                    className={cn(
                      "w-4.5 h-4.5 shrink-0 transition-colors",
                      isActive && !item.disabled ? "text-violet-600" : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  {!isSidebarCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Motivational Card */}
      {!isSidebarCollapsed && progressData && (
        <div className="mx-3 mb-4 p-4 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg shadow-purple-200 relative shrink-0">
          <button
            onClick={() => setIsCardCollapsed(!isCardCollapsed)}
            className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isCardCollapsed ? (
              <ChevronUp className="w-4 h-4 text-purple-200" />
            ) : (
              <ChevronDown className="w-4 h-4 text-purple-200" />
            )}
          </button>

          {isCardCollapsed ? (
            <div
              className="flex items-center gap-3 pr-8 cursor-pointer group"
              onClick={() => setIsCardCollapsed(false)}
              role="button"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/20 shrink-0 group-hover:bg-white/30 transition-colors">
                <Trophy className="w-4 h-4 text-yellow-300" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-purple-100">Progress</span>
                  <span className="text-xs font-bold">{progressData.percentage}%</span>
                </div>
                <Progress
                  value={progressData.percentage}
                  className="h-1.5 [&_[data-slot=progress-track]]:bg-purple-400/30 [&_[data-slot=progress-indicator]]:bg-blue-400"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3 pr-8">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20">
                  <Trophy className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">{progressData.messageTitle}</p>
                  <p className="text-xs text-purple-200 leading-tight">{progressData.messageSubtitle}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-purple-200">{progressData.milestone}</span>
                <span className="text-sm font-bold">{progressData.percentage}%</span>
              </div>

              <Progress
                value={progressData.percentage}
                className="h-1.5 [&_[data-slot=progress-track]]:bg-purple-400/30 [&_[data-slot=progress-indicator]]:bg-blue-400"
              />
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-purple-200">{100 - progressData.percentage}% Remaining</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
