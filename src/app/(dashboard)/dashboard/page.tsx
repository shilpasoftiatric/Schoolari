import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = { title: "Dashboard | Schoolari" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  const firstName = profile?.first_name || user?.email?.split("@")[0] || "Student";
  const initialData = profile?.ai_dashboard_data || null;

  return (
    <DashboardClient initialData={initialData} firstName={firstName} />
  );
}
