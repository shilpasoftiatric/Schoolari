"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Menu, X } from "lucide-react";
import { AdminNav } from "./AdminNav";
import { ROLE_LABELS, ROLE_COLORS, type StaffRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  role: StaffRole;
  userName?: string;
  userEmail?: string;
}

export function AdminSidebar({ role, userName, userEmail }: AdminSidebarProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const roleLabel = ROLE_LABELS[role] || "Staff";

  // Listen to mobile menu toggle event dispatched from header
  useEffect(() => {
    const handleToggleMobile = () => {
      setIsMobileOpen((prev) => !prev);
    };

    window.addEventListener("toggle_admin_mobile_menu", handleToggleMobile);
    return () => {
      window.removeEventListener("toggle_admin_mobile_menu", handleToggleMobile);
    };
  }, []);

  // Avatar initials from name
  const initials = (userName || userEmail || "A")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={cn(
          // Base — dark navy background
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col shrink-0 transition-all duration-300 ease-in-out print:hidden",
          "bg-[#0f172a] border-r border-white/5",
          // Mobile responsive drawer slide
          isMobileOpen ? "translate-x-0 w-64 shadow-2xl shadow-black/40" : "-translate-x-full lg:translate-x-0",
          // Desktop minimize/maximize width
          isSidebarCollapsed ? "lg:w-[72px]" : "lg:w-64"
        )}
      >
        {/* Header / Logo Area */}
        <div
          className={cn(
            "flex items-center h-16 shrink-0 border-b border-white/5 transition-all",
            isSidebarCollapsed && !isMobileOpen ? "justify-center px-3" : "justify-between px-4"
          )}
        >
          <Link
            href="/admin/dashboard"
            onClick={(e) => {
              if (isSidebarCollapsed) {
                e.preventDefault();
                setIsSidebarCollapsed(false);
              }
            }}
            className={cn(
              "flex items-center gap-3 group",
              isSidebarCollapsed && !isMobileOpen && "hover:opacity-80 transition-opacity"
            )}
            title={isSidebarCollapsed ? "AdminPanel (Click to expand)" : undefined}
          >
            {/* Shield logo icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>

            {/* Brand name — hidden when collapsed */}
            {(!isSidebarCollapsed || isMobileOpen) && (
              <span className="text-[17px] font-extrabold text-white tracking-tight truncate">
                Admin<span className="text-slate-400 font-semibold">Panel</span>
              </span>
            )}
          </Link>

          {/* Desktop collapse button */}
          {(!isSidebarCollapsed || isMobileOpen) && (
            <button
              type="button"
              onClick={() => {
                if (isMobileOpen) {
                  setIsMobileOpen(false);
                } else {
                  setIsSidebarCollapsed(true);
                }
              }}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
              title="Collapse sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-3 no-scrollbar">
          <AdminNav
            role={role}
            isCollapsed={isSidebarCollapsed && !isMobileOpen}
            onNavigate={() => setIsMobileOpen(false)}
          />
        </div>

        {/* User Profile Footer */}
        <div
          className={cn(
            "shrink-0 border-t border-white/5",
            isSidebarCollapsed && !isMobileOpen ? "p-3 flex justify-center" : "p-3"
          )}
        >
          {isSidebarCollapsed && !isMobileOpen ? (
            /* Collapsed: show avatar only */
            <div
              title={`${userName || userEmail} • ${roleLabel}`}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-xs font-black text-white cursor-default"
            >
              {initials}
            </div>
          ) : (
            /* Expanded: full profile card */
            <div className="flex items-center gap-3 px-1">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-md">
                {initials}
              </div>

              {/* Name & email */}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white truncate leading-tight">
                  {userName || userEmail?.split("@")[0]}
                </p>
                <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                  {userEmail}
                </p>
              </div>

              {/* Role badge */}
              <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/20 whitespace-nowrap">
                {roleLabel}
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
