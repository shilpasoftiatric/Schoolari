"use client";

import React from "react";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";

export function AdminHeader() {
  const handleToggleMobile = () => {
    window.dispatchEvent(new CustomEvent("toggle_admin_mobile_menu"));
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 md:px-8 bg-white border-b border-slate-200 shrink-0">
      {/* Mobile Menu Toggle Button */}
      <button
        type="button"
        onClick={handleToggleMobile}
        className="lg:hidden flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        aria-label="Open sidebar menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Spacer for desktop alignment */}
      <div className="hidden lg:block" />

      {/* Logout Action */}
      <form action={signOut}>
        <Button
          type="submit"
          className="gap-2 font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs h-9 px-4 text-xs sm:text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </Button>
      </form>
    </header>
  );
}
