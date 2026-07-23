import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { VideoPlayerClient } from "./VideoPlayerClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Watch Video | Earn While You Learn",
};

export default async function WatchVideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Find the masterId (if linked student)
  const { data: profile } = await supabase.from("profiles").select("linked_student_id").eq("id", user.id).single();
  const masterId = profile?.linked_student_id || user.id;

  // Fetch the video and its action items
  const { data: video } = await supabase
    .from("earn_videos")
    .select("*, earn_video_action_items(*), earn_categories(name)")
    .eq("id", videoId)
    .single();

  if (!video || !video.is_published) {
    redirect("/income");
  }

  // Fetch student progress for this video
  const { data: progress } = await supabase
    .from("student_video_progress")
    .select("*")
    .eq("user_id", masterId)
    .eq("video_id", video.id)
    .single();

  // Find the next video in the same category
  const { data: nextVideos } = await supabase
    .from("earn_videos")
    .select("id")
    .eq("category_id", video.category_id)
    .eq("is_published", true)
    .gt("sort_order", video.sort_order)
    .order("sort_order", { ascending: true })
    .limit(1);

  const nextVideoId = nextVideos && nextVideos.length > 0 ? nextVideos[0].id : null;

  // Get public URL for MP4 if needed
  let mp4PublicUrl = null;
  if (video.video_type === "mp4" && video.mp4_storage_path) {
    const { data } = supabase.storage.from("earn-videos").getPublicUrl(video.mp4_storage_path);
    mp4PublicUrl = data.publicUrl;
  }

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col p-4 md:p-8 space-y-6">
      <div>
        <Link href="/income" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-violet-600 transition-colors mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Library
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{video.title}</h1>
            <p className="text-slate-500 mt-2 font-medium">
              {video.earn_categories?.name} • {video.difficulty.charAt(0).toUpperCase() + video.difficulty.slice(1)}
              {video.watch_time_mins && ` • ${video.watch_time_mins} mins`}
            </p>
          </div>
        </div>
      </div>

      <VideoPlayerClient 
        video={video} 
        mp4Url={mp4PublicUrl}
        initialProgress={progress}
        nextVideoId={nextVideoId}
      />
    </div>
  );
}
