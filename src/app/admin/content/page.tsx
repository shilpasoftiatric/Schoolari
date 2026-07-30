import { createAdminClient } from "@/lib/supabase/server";
import { ContentManager } from "./ContentManager";
import { LayoutDashboard } from "lucide-react";

export default async function AdminContentPage() {
  const adminClient = await createAdminClient();

  const { data: items, error } = await adminClient
    .from("dashboard_content")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-red-500 bg-red-50 rounded-xl">
        Failed to load content: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-indigo-600" />
          Dashboard Content Management
        </h1>
        <p className="text-slate-500 mt-1">
          Manage tips, quotes, announcements, events, and banners that appear on the student dashboard.
        </p>
      </div>

      <ContentManager initialItems={items || []} />
    </div>
  );
}
