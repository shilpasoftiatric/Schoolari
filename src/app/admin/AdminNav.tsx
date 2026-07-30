"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, Users, GraduationCap, Settings, PlaySquare, Mail, Megaphone, HeartHandshake, UserCog, CreditCard, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import { hasPermission, NAV_PERMISSIONS, type StaffRole } from "@/lib/rbac";

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

export function AdminNav({ role }: { role: StaffRole }) {
  const pathname = usePathname();
  const [selectedHref, setSelectedHref] = useState(pathname);

  useEffect(() => {
    setSelectedHref(pathname);
  }, [pathname]);

  // Filter nav items based on what this role is allowed to see
  const visibleItems = ALL_NAV_ITEMS.filter((item) => {
    const requiredPermission = NAV_PERMISSIONS[item.href];
    if (!requiredPermission) return true; // No permission needed → always show
    return hasPermission(role, requiredPermission);
  });

  return (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = selectedHref === item.href || selectedHref.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSelectedHref(item.href)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
              isActive
                ? "text-slate-900 bg-slate-100"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Icon className={cn("w-4.5 h-4.5", isActive ? "text-slate-600" : "text-slate-400")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
