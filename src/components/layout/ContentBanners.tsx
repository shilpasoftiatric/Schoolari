"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Megaphone,
  Layout,
  CalendarDays,
  Lightbulb,
  Quote,
  Star,
  X,
  ExternalLink,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getActiveContentBanners } from "@/app/actions/admin-content";

interface BannerItem {
  id: string;
  type: "banner" | "announcement" | "event" | "tip" | "quote" | "featured_scholarship" | string;
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
  quote: {
    icon: Quote,
    badge: "Daily Inspiration",
    containerClass:
      "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-700 text-white shadow-md shadow-purple-500/10 border border-purple-400/20",
    badgeClass: "bg-white/20 text-white border-white/30",
    btnClass: "bg-white text-purple-700 hover:bg-purple-50 shadow-xs",
    textClass: "text-purple-100",
  },
  featured_scholarship: {
    icon: Star,
    badge: "Featured Scholarship",
    containerClass:
      "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-md shadow-emerald-500/10 border border-emerald-400/20",
    badgeClass: "bg-white/20 text-white border-white/30 font-bold",
    btnClass: "bg-white text-emerald-800 hover:bg-emerald-50 shadow-xs font-bold",
    textClass: "text-emerald-100",
  },
};

export function ContentBanners({ initialBanners = [] }: { initialBanners?: BannerItem[] }) {
  const [banners, setBanners] = useState<BannerItem[]>(initialBanners);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const [slideIndex, setSlideIndex] = useState(1);
  const [withTransition, setWithTransition] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Load dismissed banner IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("schoolari_dismissed_banners");
      if (stored) {
        setDismissedIds(new Set(JSON.parse(stored)));
      }
    } catch { }
    setIsLoaded(true);
  }, []);

  // Fetch initial banners if not provided
  useEffect(() => {
    if (initialBanners.length === 0) {
      getActiveContentBanners()
        .then((items) => {
          if (items) setBanners(items as BannerItem[]);
        })
        .catch(() => { });
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
            .catch(() => { });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter visible banners
  const visibleBanners = banners.filter((b) => isLoaded && !dismissedIds.has(b.id));
  const hasMultiple = visibleBanners.length > 1;

  // Cloned array for seamless infinite looping (last item prepended, first item appended)
  const extendedSlides = hasMultiple
    ? [visibleBanners[visibleBanners.length - 1], ...visibleBanners, visibleBanners[0]]
    : visibleBanners;

  // Re-enable transition on the next animation frame after an instant position reset
  useEffect(() => {
    if (!withTransition) {
      const frame = requestAnimationFrame(() => {
        setWithTransition(true);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [withTransition]);

  // Ensure slideIndex stays within valid bounds when items change
  useEffect(() => {
    if (hasMultiple) {
      if (slideIndex > visibleBanners.length) {
        setSlideIndex(visibleBanners.length);
      } else if (slideIndex < 1) {
        setSlideIndex(1);
      }
    } else {
      setSlideIndex(0);
    }
  }, [visibleBanners.length, hasMultiple]);

  // Screen Wake-up / Tab Visibility Handler:
  // When laptop wakes from sleep or tab is refocused, reset position if out-of-bounds
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        setSlideIndex((prev) => {
          if (hasMultiple && (prev < 1 || prev > visibleBanners.length)) {
            setWithTransition(false);
            return 1;
          }
          return prev;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [hasMultiple, visibleBanners.length]);

  // Auto-slide effect: triggers forward slide every 3 seconds seamlessly
  useEffect(() => {
    if (!hasMultiple || isPaused) return;

    const interval = setInterval(() => {
      // Do not advance while document is hidden / laptop is asleep
      if (typeof document !== "undefined" && document.hidden) return;

      setWithTransition(true);
      setSlideIndex((prev) => {
        // Guard against runaway increments if background transitions were throttled
        if (prev >= extendedSlides.length - 1) {
          return 2;
        }
        return prev + 1;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [hasMultiple, isPaused, extendedSlides.length]);

  // Handle seamless infinite loop jump when transition finishes
  const handleTransitionEnd = () => {
    if (!hasMultiple) return;
    if (slideIndex >= extendedSlides.length - 1) {
      // Reached the cloned first slide at the end -> jump instantly to the real first slide (index 1)
      setWithTransition(false);
      setSlideIndex(1);
    } else if (slideIndex <= 0) {
      // Reached the cloned last slide at the beginning -> jump instantly to the real last slide
      setWithTransition(false);
      setSlideIndex(visibleBanners.length);
    }
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem("schoolari_dismissed_banners", JSON.stringify(Array.from(next)));
      } catch { }
      return next;
    });
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWithTransition(true);
    setSlideIndex((prev) => prev - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWithTransition(true);
    setSlideIndex((prev) => prev + 1);
  };

  const handleDotClick = (idx: number) => {
    setWithTransition(true);
    setSlideIndex(idx + 1);
  };

  if (visibleBanners.length === 0) {
    return null;
  }

  // Safely clamp display index to guarantee track is NEVER translated into empty blank space
  const currentDisplayIndex = hasMultiple
    ? Math.max(0, Math.min(slideIndex, extendedSlides.length - 1))
    : 0;

  // Calculate current active dot indicator index safely using modulo
  const activeDotIndex = hasMultiple && visibleBanners.length > 0
    ? (currentDisplayIndex - 1 + visibleBanners.length) % visibleBanners.length
    : 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl mb-6 group print:hidden select-none"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setIsPaused(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setIsPaused(false);
      }}
      onClick={() => {
        // Toggle pause/resume on touch tap or click
        setIsPaused((prev) => !prev);
      }}
    >
      {/* Sliding Track */}
      <div
        onTransitionEnd={handleTransitionEnd}
        className={`flex items-stretch ${withTransition ? "transition-transform duration-500 ease-in-out" : "transition-none"} will-change-transform`}
        style={{ transform: `translateX(-${currentDisplayIndex * 100}%)` }}
      >
        {extendedSlides.map((banner, idx) => {
          const config = TYPE_CONFIG[banner.type] || TYPE_CONFIG.banner;
          const Icon = config.icon;
          const isExternal =
            banner.cta_url?.startsWith("http://") || banner.cta_url?.startsWith("https://");

          return (
            <div
              key={`${banner.id}-${idx}`}
              className={`min-w-full w-full relative overflow-hidden rounded-2xl p-4 sm:p-5 ${hasMultiple ? "pb-10 sm:pb-9" : ""} ${config.containerClass} transition-all flex flex-col justify-center`}
            >
              {/* Ambient background decoration */}
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              {/* Desktop & Tablet Layout (sm and up) */}
              <div className="relative z-10 hidden sm:flex sm:items-center justify-between gap-5">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md border shrink-0 ${config.badgeClass}`}
                      >
                        {config.badge}
                      </span>
                      <h4 className="text-base font-bold text-white leading-snug">
                        {banner.title}
                      </h4>
                    </div>
                    {banner.body && (
                      <p className={`text-sm font-medium leading-relaxed ${config.textClass}`}>
                        {banner.body}
                      </p>
                    )}
                  </div>
                </div>

                {/* Desktop Action Buttons */}
                <div
                  className="flex items-center gap-3 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {banner.cta_label && banner.cta_url && (
                    isExternal ? (
                      <a
                        href={banner.cta_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-transform active:scale-95 shadow-xs ${config.btnClass}`}
                      >
                        {banner.cta_label}
                        <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                      </a>
                    ) : (
                      <Link
                        href={banner.cta_url}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-transform active:scale-95 shadow-xs ${config.btnClass}`}
                      >
                        {banner.cta_label}
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                      </Link>
                    )
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(banner.id);
                    }}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer shrink-0"
                    aria-label="Dismiss banner"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mobile Layout (< sm) */}
              <div className="relative z-10 flex flex-col sm:hidden gap-2.5">
                {/* Top row: Icon + Badge + Title + Dismiss */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-xs">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border inline-block mb-1 ${config.badgeClass}`}
                      >
                        {config.badge}
                      </span>
                      <h4 className="text-sm font-bold text-white leading-snug">
                        {banner.title}
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(banner.id);
                    }}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer shrink-0"
                    aria-label="Dismiss banner"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Middle: Full Body text */}
                {banner.body && (
                  <p className={`text-xs font-medium leading-relaxed ${config.textClass}`}>
                    {banner.body}
                  </p>
                )}

                {/* Bottom Mobile Action CTA */}
                {banner.cta_label && banner.cta_url && (
                  <div
                    className="pt-0.5 self-start"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isExternal ? (
                      <a
                        href={banner.cta_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95 shadow-xs ${config.btnClass}`}
                      >
                        {banner.cta_label}
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    ) : (
                      <Link
                        href={banner.cta_url}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95 shadow-xs ${config.btnClass}`}
                      >
                        {banner.cta_label}
                        <ArrowRight className="w-3 h-3 ml-0.5" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unified Carousel Navigation Controls Pill (Bottom Center) */}
      {hasMultiple && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 hover:bg-black/35 backdrop-blur-md border border-white/15 shadow-sm transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous slide"
            className="w-5 h-5 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1.5 px-1">
            {visibleBanners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleDotClick(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${idx === activeDotIndex
                  ? "w-4 h-1.5 bg-white shadow-xs"
                  : "w-1.5 h-1.5 bg-white/40 hover:bg-white/80"
                  }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next slide"
            className="w-5 h-5 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

