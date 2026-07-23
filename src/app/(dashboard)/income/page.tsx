import { createClient } from "@/lib/supabase/server";
import { VideoLibrary } from "./VideoLibrary";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Earn While You Learn",
};

export default async function IncomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Find the masterId (if linked student)
  const { data: profile } = await supabase.from("profiles").select("linked_student_id").eq("id", user.id).single();
  const masterId = profile?.linked_student_id || user.id;

  const [categoriesRes, videosRes, progressRes] = await Promise.all([
    supabase.from("earn_categories").select("*").order("sort_order", { ascending: true }),
    supabase.from("earn_videos").select("*, earn_categories(name)").eq("is_published", true).order("sort_order", { ascending: true }),
    supabase.from("student_video_progress").select("*").eq("user_id", masterId),
  ]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto h-full flex flex-col p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Earn While You Learn</h1>
        <p className="text-slate-500 mt-2 text-base">Watch videos, learn new skills, and unlock income opportunities.</p>
      </div>
      
      <VideoLibrary 
        categories={categoriesRes.data || []} 
        videos={videosRes.data || []} 
        progress={progressRes.data || []} 
      />
    </div>
  );
}
