"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, Users, GraduationCap, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users / Members", icon: Users },
  { href: "/admin/scholarships", label: "Scholarships", icon: GraduationCap },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  const [selectedHref, setSelectedHref] = useState(pathname);

  useEffect(() => {
    setSelectedHref(pathname);
  }, [pathname]);

  return (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = selectedHref === item.href;

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
