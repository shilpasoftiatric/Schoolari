import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schoolari — Complete your profile",
};

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Check onboarding status and role
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    redirect("/admin/dashboard");
  }

  if (profile?.onboarding_complete) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
