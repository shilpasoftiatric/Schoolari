"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Settings,
  PlaySquare,
  Mail,
  Megaphone,
  HeartHandshake,
  UserCog,
  CreditCard,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasPermission, NAV_PERMISSIONS, type StaffRole } from "@/lib/rbac";
import { getStaffUnreadCount } from "@/app/actions/admin-messages";
import { createClient } from "@/lib/supabase/client";

const ALL_NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users / Members", icon: Users },
  { href: "/admin/scholarships", label: "Scholarships", icon: GraduationCap },
  { href: "/admin/coaching", label: "Coaching", icon: HeartHandshake },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/content", label: "Content Manager", icon: Megaphone },
  { href: "/admin/career", label: "Career Center", icon: Briefcase },
  { href: "/admin/income", label: "Earn While You Learn", icon: PlaySquare },
  { href: "/admin/payments", label: "Payments & Members", icon: CreditCard },
  { href: "/admin/staff", label: "Staff Management", icon: UserCog },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminNavProps {
  role: StaffRole;
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

export function AdminNav({ role, isCollapsed = false, onNavigate }: AdminNavProps) {
  const pathname = usePathname();
  const [selectedHref, setSelectedHref] = useState(pathname);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setSelectedHref(pathname);
  }, [pathname]);

  // Fetch unread inquiries count specifically for this staff member
  const refreshUnread = async () => {
    try {
      const count = await getStaffUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    refreshUnread();

    const handleLocalUpdate = () => {
      refreshUnread();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("admin_messages_updated", handleLocalUpdate);
    }

    const supabase = createClient();
    const channel = supabase.channel("admin-nav-channel");

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coaching_messages" },
        () => {
          refreshUnread();
        }
      )
      .subscribe();

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("admin_messages_updated", handleLocalUpdate);
      }
      supabase.removeChannel(channel);
    };
  }, [pathname]);

  // Filter nav items based on what this role is allowed to see
  const visibleItems = ALL_NAV_ITEMS.filter((item) => {
    const requiredPermission = NAV_PERMISSIONS[item.href];
    if (!requiredPermission) return true; // No permission needed → always show
    return hasPermission(role, requiredPermission);
  });

  return (
    <nav className={cn("flex-1 space-y-1 overflow-y-auto", isCollapsed ? "px-2 py-3" : "px-3 py-3")}>
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = selectedHref === item.href || selectedHref.startsWith(item.href + "/");
        const isMessages = item.href === "/admin/messages";

        return (
          <Link
            key={item.href}
            href={item.href}
            title={isCollapsed ? item.label : undefined}
            onClick={() => {
              setSelectedHref(item.href);
              onNavigate?.();
            }}
            className={cn(
              "flex items-center rounded-xl text-sm font-semibold transition-all relative group",
              isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "gap-3 px-3 py-2.5",
              isActive
                ? "text-slate-900 bg-slate-100 font-bold"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700")} />
            {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}

            {/* Notification Badge / Dot for Unread Messages */}
            {isMessages && !isActive && unreadCount > 0 && (
              isCollapsed ? (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-xs" />
                </span>
              ) : (
                <span className="flex items-center gap-1.5 ml-auto">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-2xs shadow-rose-500/50" />
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold leading-none shadow-2xs">
                    {unreadCount}
                  </span>
                </span>
              )
            )}
          </Link>
        );
      })}
    </nav>
  );
}
