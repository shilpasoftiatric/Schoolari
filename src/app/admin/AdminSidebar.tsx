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
  const roleColor = ROLE_COLORS[role] || "bg-slate-100 text-slate-700";

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

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white shrink-0 transition-all duration-300 ease-in-out print:hidden",
          // Mobile responsive drawer slide
          isMobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full lg:translate-x-0",
          // Desktop minimize/maximize width
          isSidebarCollapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        {/* Header / Logo Area */}
        <div
          className={cn(
            "flex items-center border-b border-slate-100 transition-colors h-16 shrink-0",
            isSidebarCollapsed ? "lg:justify-center px-3" : "justify-between px-5 hover:bg-slate-50/50"
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
              "flex items-center gap-3",
              isSidebarCollapsed && "hover:opacity-80 transition-opacity"
            )}
            title={isSidebarCollapsed ? "AdminPanel (Click to expand)" : undefined}
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            {(!isSidebarCollapsed || isMobileOpen) && (
              <span className="text-xl font-extrabold text-slate-900 tracking-tight truncate">
                Admin<span className="text-slate-400 font-normal">Panel</span>
              </span>
            )}
          </Link>

          {/* Desktop Toggle Minimize Button (Only shown when expanded) */}
          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(true)}
              className="hidden lg:flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg p-1.5 transition-colors"
              title="Minimize sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-2">
          <AdminNav
            role={role}
            isCollapsed={isSidebarCollapsed && !isMobileOpen}
            onNavigate={() => setIsMobileOpen(false)}
          />
        </div>

        {/* Role Badge & User Profile Footer */}
        <div
          className={cn(
            "p-3 border-t border-slate-100 shrink-0 transition-all bg-slate-50/50",
            isSidebarCollapsed && !isMobileOpen ? "flex justify-center" : "px-4 py-3"
          )}
        >
          {isSidebarCollapsed && !isMobileOpen ? (
            <div
              title={`${userName || userEmail} • ${roleLabel}`}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shadow-xs cursor-default",
                roleColor
              )}
            >
              {roleLabel.charAt(0)}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-800 font-bold truncate">
                  {userName || userEmail}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {userEmail}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0",
                  roleColor
                )}
              >
                {roleLabel}
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
