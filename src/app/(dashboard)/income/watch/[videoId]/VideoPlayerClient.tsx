"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PlayCircle, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markVideoInProgress, markVideoComplete, saveVideoPlaybackState } from "@/app/actions/income";

type ActionItem = { id: string; title: string; sort_order: number };
type Video = {
  id: string;
  title: string;
  description: string | null;
  video_type: "youtube" | "mp4";
  youtube_url: string | null;
  earn_video_action_items: ActionItem[];
};
type Progress = {
  id: string;
  status: "not_started" | "in_progress" | "completed";
  last_position_seconds: number;
  progress_percentage: number;
} | null;

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

export function VideoPlayerClient({
  video,
  mp4Url,
  initialProgress,
  nextVideoId
}: {
  video: Video;
  mp4Url: string | null;
  initialProgress: Progress;
  nextVideoId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(initialProgress?.status || "not_started");

  const ytPlayerRef = useRef<any>(null);
  const mp4PlayerRef = useRef<HTMLVideoElement>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const lastPositionRef = useRef<number>(initialProgress?.last_position_seconds || 0);
  const completionCardRef = useRef<HTMLDivElement>(null);

  // Mark as in progress when the page loads
  useEffect(() => {
    if (status === "not_started") {
      setStatus("in_progress");
      markVideoInProgress(video.id).catch(console.error);
    }
  }, [video.id, status]);

  // Auto-scroll to completion card when video ends
  useEffect(() => {
    if (status === "completed" && completionCardRef.current) {
      // Small timeout to ensure the DOM has painted the animate-in element before scrolling
      setTimeout(() => {
        completionCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [status]);

  const handleMarkComplete = () => {
    if (status === "completed") return;
    setStatus("completed");
    startTransition(async () => {
      try {
        await markVideoComplete(video.id);
      } catch (error) {
        console.error("Failed to mark complete", error);
      }
    });
  };

  const syncProgress = (currentTime: number, duration: number) => {
    if (!duration || status === "completed") return;

    // Only sync if 5 seconds have passed since last sync to prevent spam
    const now = Date.now();
    if (now - lastSyncTimeRef.current < 5000) return;

    lastSyncTimeRef.current = now;
    lastPositionRef.current = currentTime;

    const percentage = Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100)));

    // Fire and forget
    saveVideoPlaybackState(video.id, Math.round(currentTime), percentage).catch(console.error);
  };

  const actionItems = (video.earn_video_action_items || []).sort((a, b) => a.sort_order - b.sort_order);
  const ytId = extractYouTubeId(video.youtube_url);

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (video.video_type !== "youtube" || !ytId) return;

    const initPlayer = () => {
      if (!(window as any).YT || !(window as any).YT.Player) return;

      const player = new (window as any).YT.Player(`youtube-player-${video.id}`, {
        videoId: ytId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          start: Math.round(lastPositionRef.current)
        },
        events: {
          onReady: (event: any) => {
            ytPlayerRef.current = event.target;
          },
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.ENDED) {
              handleMarkComplete();
            }
          }
        }
      });
    };

    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    } else if ((window as any).YT && (window as any).YT.Player) {
      setTimeout(initPlayer, 100);
    }

    return () => {
      ytPlayerRef.current = null;
    };
  }, [video.id, ytId, video.video_type, status]);

  // YouTube polling interval for progress sync
  useEffect(() => {
    if (video.video_type !== "youtube" || status === "completed") return;

    const interval = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        const currentTime = ytPlayerRef.current.getCurrentTime();
        const duration = ytPlayerRef.current.getDuration();
        if (currentTime > 0 && duration > 0) {
          syncProgress(currentTime, duration);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [video.video_type, status]);

  // MP4 Initial Seek
  useEffect(() => {
    if (video.video_type === "mp4" && mp4PlayerRef.current && lastPositionRef.current > 0) {
      // Small timeout to ensure video metadata is loaded enough to seek
      const handleLoadedMetadata = () => {
        if (mp4PlayerRef.current && lastPositionRef.current > 0) {
          mp4PlayerRef.current.currentTime = lastPositionRef.current;
        }
      };

      const videoEl = mp4PlayerRef.current;
      videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
      return () => videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
    }
  }, [video.video_type]);

  return (
    <div className="space-y-8 pb-12">
      {/* Video Player */}
      <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg border border-slate-200 relative">
        {video.video_type === "youtube" && ytId ? (
          <div id={`youtube-player-${video.id}`} className="w-full h-full" />
        ) : video.video_type === "mp4" && mp4Url ? (
          <video
            ref={mp4PlayerRef}
            src={mp4Url}
            controls
            controlsList="nodownload"
            onTimeUpdate={(e) => syncProgress(e.currentTarget.currentTime, e.currentTarget.duration)}
            onEnded={handleMarkComplete}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">
            Video source not found.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Description & Controls */}
        <div className="lg:col-span-2 space-y-6">
          {video.description && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-2">About this video</h3>
              <p className="text-slate-600 leading-relaxed">{video.description}</p>
            </div>
          )}
        </div>

        {/* Right Col: Action Items & Completion state */}
        <div className="space-y-6">
          {status === "completed" && (
            <div ref={completionCardRef} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center animate-in zoom-in-95 duration-500 shadow-sm">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">Great job!</h3>
              <p className="text-emerald-700 text-sm mt-1 mb-4 font-medium">You've completed this video.</p>

              {nextVideoId ? (
                <Button
                  onClick={() => router.push(`/income/watch/${nextVideoId}`)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 shadow-sm font-bold"
                >
                  Next Video <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => router.push(`/income`)}
                  variant="outline"
                  className="w-full rounded-xl gap-2 font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                >
                  <CheckCircle2 className="w-4 h-4" /> You're all caught up!
                </Button>
              )}
            </div>
          )}

          {actionItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-violet-500" /> Action Items
                </h3>
                <p className="text-xs text-slate-500 mt-1">Your next steps to earn income.</p>
              </div>
              <ul className="divide-y divide-slate-100">
                {actionItems.map((item, idx) => (
                  <li key={item.id} className="p-4 flex gap-3 group">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 leading-snug pt-0.5 group-hover:text-slate-900 transition-colors">
                      {item.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
