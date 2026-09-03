"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { PlayCircle, Clock, CheckCircle2, CircleDashed, Film, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

type Video = {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  video_type: "youtube" | "mp4";
  youtube_url: string | null;
  mp4_storage_path: string | null;
  thumbnail_url: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  watch_time_mins: number | null;
  sort_order: number;
};

type Category = { id: string; name: string; description: string | null; sort_order: number };
type ProgressRecord = {
  video_id: string;
  status: "not_started" | "in_progress" | "completed";
  progress_percentage: number;
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: "Beginner", color: "bg-emerald-100 text-emerald-700" },
  intermediate: { label: "Intermediate", color: "bg-amber-100 text-amber-700" },
  advanced: { label: "Advanced", color: "bg-red-100 text-red-700" },
};

function extractYouTubeId(url: string | null): string | null {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/watch\?v=([^?&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getThumbnail(v: Video): string {
  if (v.thumbnail_url) return v.thumbnail_url;
  if (v.video_type === "youtube" && v.youtube_url) {
    const id = extractYouTubeId(v.youtube_url);
    if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  }
  return "";
}

function CategoryVideoRow({
  category,
  videos,
  progressMap,
  isFirst,
}: {
  category: Category;
  videos: Video[];
  progressMap: Map<string, { status: ProgressRecord["status"]; percentage: number }>;
  isFirst: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();
    window.addEventListener("resize", checkScroll);

    return () => {
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const handleScrollBy = (offset: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: offset, behavior: "smooth" });
    setTimeout(checkScroll, 350);
  };

  const completedCount = videos.filter(
    (v) => progressMap.get(v.id)?.status === "completed"
  ).length;
  const progressPct = Math.round((completedCount / videos.length) * 100);

  return (
    <div className={`${!isFirst ? "pt-8" : ""} space-y-4 relative group/category`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{category.name}</h2>
          {category.description && (
            <p className="text-sm text-slate-500 mt-1">{category.description}</p>
          )}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-600">
            {completedCount} of {videos.length}
          </span>
          <Progress
            value={progressPct}
            className="w-32 h-2 [&_[data-slot=progress-track]]:bg-purple-300 [&_[data-slot=progress-indicator]]:bg-blue-600"
          />
        </div>
      </div>

      {/* Relative Carousel Container with Navigation Buttons positioned at bottom */}
      <div className="relative">
        {/* Left Arrow Button */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScrollBy(-340)}
            aria-label="Scroll left"
            className="hidden sm:flex absolute -left-2 bottom-1 z-30 w-10 h-10 rounded-full bg-white hover:bg-slate-50 text-slate-800 hover:text-violet-700 shadow-md border border-slate-200 items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}

        {/* Right Arrow Button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScrollBy(340)}
            aria-label="Scroll right"
            className="hidden sm:flex absolute -right-2 bottom-1 z-30 w-10 h-10 rounded-full bg-white hover:bg-slate-50 text-slate-800 hover:text-violet-700 shadow-md border border-slate-200 items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}

        {/* Horizontal Scroll Container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex overflow-x-auto pb-6 -mx-4 px-4 md:-mx-8 md:px-8 gap-5 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {videos.map((video) => {
            const progressData = progressMap.get(video.id) || {
              status: "not_started",
              percentage: 0,
            };
            const status = progressData.status;
            const diff = DIFFICULTY_LABELS[video.difficulty];
            const thumb = getThumbnail(video);

            return (
              <Link
                key={video.id}
                href={`/income/watch/${video.id}`}
                className="group relative flex-none w-[280px] sm:w-[320px] flex flex-col gap-3 snap-start select-none"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 shadow-sm group-hover:shadow-md group-hover:border-violet-300 transition-all">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={video.title}
                      draggable={false}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                      {video.video_type === "youtube" ? (
                        <Play className="w-10 h-10 text-slate-300" />
                      ) : (
                        <Film className="w-10 h-10 text-slate-300" />
                      )}
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform">
                      <PlayCircle className="w-6 h-6 text-violet-600" />
                    </div>
                  </div>

                  {/* Difficulty Badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-md shadow-sm backdrop-blur-md bg-white/90 ${diff.color.replace(
                        "bg-",
                        "text-"
                      )}`}
                    >
                      {diff.label}
                    </span>
                  </div>

                  {/* Completed Badge */}
                  {status === "completed" && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-700 fill-emerald-100" />
                      </div>
                    </div>
                  )}

                  {/* Time Badge */}
                  {video.watch_time_mins && (
                    <div className="absolute bottom-3 right-3">
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-black/70 text-white backdrop-blur-sm">
                        <Clock className="w-3 h-3" /> {video.watch_time_mins}m
                      </span>
                    </div>
                  )}

                  {/* Visual Progress Bar (if in progress or completed) */}
                  {(status === "in_progress" || status === "completed") && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30 backdrop-blur-sm z-10 overflow-hidden">
                      <div
                        className={`h-full ${status === "completed"
                          ? "bg-emerald-500"
                          : "bg-violet-600"
                          }`}
                        style={{
                          width: `${status === "completed"
                            ? 100
                            : Math.max(2, progressData.percentage || 0)
                            }%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="space-y-1.5 px-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 leading-tight group-hover:text-violet-700 transition-colors line-clamp-2">
                      {video.title}
                    </h3>
                  </div>

                  {/* Progress Indicator */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {status === "completed" ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    ) : status === "in_progress" ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-full">
                        <PlayCircle className="w-3.5 h-3.5" /> Resume
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        <CircleDashed className="w-3.5 h-3.5" /> Not Started
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function VideoLibrary({
  categories,
  videos,
  progress,
}: {
  categories: Category[];
  videos: Video[];
  progress: ProgressRecord[];
}) {
  const progressMap = useMemo(() => {
    const map = new Map<
      string,
      { status: ProgressRecord["status"]; percentage: number }
    >();
    for (const p of progress) {
      map.set(p.video_id, {
        status: p.status,
        percentage: p.progress_percentage,
      });
    }
    return map;
  }, [progress]);

  if (categories.length === 0 || videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
        <Film className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-900">No videos available yet</h3>
        <p className="text-slate-500 mt-2">Check back later for new content.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 divide-y divide-slate-200">
      {categories.map((category, index) => {
        const catVideos = videos.filter((v) => v.category_id === category.id);
        if (catVideos.length === 0) return null;

        return (
          <CategoryVideoRow
            key={category.id}
            category={category}
            videos={catVideos}
            progressMap={progressMap}
            isFirst={index === 0}
          />
        );
      })}
    </div>
  );
}

