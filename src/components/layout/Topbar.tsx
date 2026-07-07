import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Bell, Search, Sparkles, Command, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import MobileNav from "./MobileNav";

export default async function Topbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch profile for first name
  const { data: profile } = user
    ? await supabase.from("profiles").select("first_name").eq("id", user.id).single()
    : { data: null };

  const displayName = profile?.first_name || user?.email?.split("@")[0] || "Student";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-border shrink-0">
      
      <div className="flex items-center gap-4">
        {/* Mobile Navigation Toggle */}
        <MobileNav />

        {/* Search (Hidden on Mobile) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl w-72 text-sm text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors">
          <Search className="w-4 h-4 shrink-0" />
          <span className="flex-1">Search anything...</span>
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-200 rounded text-xs font-semibold text-slate-500">
            <Command className="w-3 h-3" />K
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
          <div className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">3</span>
          </div>
          <span className="hidden sm:block font-medium">Notifications</span>
        </button>

        {/* User + Sign Out */}
        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{displayName}</p>
            <p className="text-xs text-slate-500 leading-tight">{user?.email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
