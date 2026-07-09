import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    redirect("/admin/dashboard");
  }

  const isActive = profile?.subscription_status === "active" || profile?.subscription_status === "trialing";
  if (!isActive) {
    redirect("/pricing");
  }

  return <>{children}</>;
}
