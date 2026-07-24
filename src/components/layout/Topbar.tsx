import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Bell, Search, Sparkles, Command, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MobileNav from "./MobileNav";

export default async function Topbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch profile and notifications
  const [profileRes, notificationsRes] = await Promise.all([
    user ? supabase.from("profiles").select("first_name").eq("id", user.id).single() : Promise.resolve({ data: null }),
    user ? supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5) : Promise.resolve({ data: [] })
  ]);

  const profile = profileRes.data;
  const notifications = notificationsRes.data || [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const displayName = profile?.first_name || user?.email?.split("@")[0] || "Student";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-border shrink-0">

      <div className="flex items-center gap-4">
        {/* Mobile Navigation Toggle */}
        <MobileNav />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors focus:outline-none">
            <div className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="hidden sm:block font-medium">Notifications</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="p-4 border-b text-sm font-semibold text-slate-800">Notifications</div>
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">No new notifications</div>
              ) : (
                notifications.map((notif: any) => (
                  <div key={notif.id} className={`p-4 border-b last:border-0 hover:bg-slate-50 transition-colors ${!notif.is_read ? 'bg-violet-50/50' : ''}`}>
                    <div className="flex gap-3">
                      <div className={`mt-0.5 rounded-full p-1.5 w-fit h-fit ${!notif.is_read ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold text-slate-900 leading-none">{notif.title}</p>
                        <p className="text-xs text-slate-500 leading-snug">{notif.message}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t">
              <Button variant="ghost" className="w-full text-xs text-violet-600 font-bold hover:text-violet-700 hover:bg-violet-50 h-8">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Mark all as read
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

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
