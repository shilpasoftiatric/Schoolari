import { createAdminClient } from "@/lib/supabase/server";
import { IncomeAdminClient } from "./IncomeAdminClient";
import { PlaySquare } from "lucide-react";

export default async function AdminIncomePage() {
  const adminClient = await createAdminClient();

  const [categoriesRes, videosRes] = await Promise.all([
    adminClient
      .from("earn_categories")
      .select("*")
      .order("sort_order", { ascending: true }),
    adminClient
      .from("earn_videos")
      .select("*, earn_video_action_items(*), earn_categories(name)")
      .order("sort_order", { ascending: true }),
  ]);

  if (categoriesRes.error) {
    return (
      <div className="p-8 text-red-500 bg-red-50 rounded-xl">
        Failed to load data: {categoriesRes.error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <PlaySquare className="w-6 h-6 text-emerald-600" />
          Earn While You Learn
        </h1>
        <p className="text-slate-500 mt-1">
          Manage video categories and videos. Students watch these to earn action items on their dashboard.
        </p>
      </div>

      <IncomeAdminClient
        initialCategories={categoriesRes.data || []}
        initialVideos={videosRes.data || []}
      />
    </div>
  );
}
