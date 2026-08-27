"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Megaphone,
  Layout,
  CalendarDays,
  Lightbulb,
  X,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getActiveContentBanners } from "@/app/actions/admin-content";

interface BannerItem {
  id: string;
  type: "banner" | "announcement" | "event" | "tip" | string;
  title: string;
  body: string;
  cta_label?: string | null;
  cta_url?: string | null;
  scheduled_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
}

const TYPE_CONFIG: Record<
  string,
  {
    icon: any;
    badge: string;
    containerClass: string;
    badgeClass: string;
    btnClass: string;
    textClass: string;
  }
> = {
  banner: {
    icon: Layout,
    badge: "Official Notice",
    containerClass:
      "bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 text-white shadow-md shadow-violet-500/10 border border-violet-400/20",
    badgeClass: "bg-white/20 text-white border-white/30",
    btnClass: "bg-white text-violet-700 hover:bg-violet-50 shadow-xs",
    textClass: "text-violet-100",
  },
  announcement: {
    icon: Megaphone,
    badge: "Announcement",
    containerClass:
      "bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md border border-slate-700/40",
    badgeClass: "bg-indigo-500/30 text-indigo-200 border-indigo-400/30",
    btnClass: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-xs",
    textClass: "text-slate-300",
  },
  event: {
    icon: CalendarDays,
    badge: "Upcoming Event",
    containerClass:
      "bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 text-white shadow-md border border-rose-400/20",
    badgeClass: "bg-white/20 text-white border-white/30",
    btnClass: "bg-white text-rose-700 hover:bg-rose-50 shadow-xs",
    textClass: "text-rose-100",
  },
  tip: {
    icon: Lightbulb,
    badge: "Today's Tip",
    containerClass:
      "bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white shadow-md border border-amber-400/20",
    badgeClass: "bg-white/20 text-white border-white/30",
    btnClass: "bg-white text-amber-800 hover:bg-amber-50 shadow-xs",
    textClass: "text-amber-100",
  },
};

export function ContentBanners({ initialBanners = [] }: { initialBanners?: BannerItem[] }) {
  const [banners, setBanners] = useState<BannerItem[]>(initialBanners);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load dismissed banner IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("schoolari_dismissed_banners");
      if (stored) {
        setDismissedIds(new Set(JSON.parse(stored)));
      }
    } catch {}
    setIsLoaded(true);
  }, []);

  // Fetch initial banners if not provided
  useEffect(() => {
    if (initialBanners.length === 0) {
      getActiveContentBanners()
        .then((items) => {
          if (items) setBanners(items as BannerItem[]);
        })
        .catch(() => {});
    }
  }, [initialBanners.length]);

  // Real-time live sync for dashboard_content table
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-content-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dashboard_content" },
        () => {
          getActiveContentBanners()
            .then((items) => {
              if (items) setBanners(items as BannerItem[]);
            })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem("schoolari_dismissed_banners", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Only show banners that haven't been dismissed
  const visibleBanners = banners.filter((b) => isLoaded && !dismissedIds.has(b.id));

  if (visibleBanners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-300 print:hidden">
      {visibleBanners.map((banner) => {
        const config = TYPE_CONFIG[banner.type] || TYPE_CONFIG.banner;
        const Icon = config.icon;
        const isExternal =
          banner.cta_url?.startsWith("http://") || banner.cta_url?.startsWith("https://");

        return (
          <div
            key={banner.id}
            className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 ${config.containerClass} transition-all`}
          >
            {/* Ambient background decoration */}
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 flex-1 pr-6 sm:pr-0">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${config.badgeClass}`}
                    >
                      {config.badge}
                    </span>
                    <h4 className="text-base font-bold text-white leading-snug">
                      {banner.title}
                    </h4>
                  </div>
                  {banner.body && (
                    <p className={`text-xs sm:text-sm font-medium leading-relaxed ${config.textClass}`}>
                      {banner.body}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                {banner.cta_label && banner.cta_url && (
                  isExternal ? (
                    <a
                      href={banner.cta_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-transform active:scale-95 ${config.btnClass}`}
                    >
                      {banner.cta_label}
                      <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                    </a>
                  ) : (
                    <Link
                      href={banner.cta_url}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-transform active:scale-95 ${config.btnClass}`}
                    >
                      {banner.cta_label}
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </Link>
                  )
                )}

                <button
                  type="button"
                  onClick={() => handleDismiss(banner.id)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white/80 hover:text-white transition-all"
                  aria-label="Dismiss banner"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
