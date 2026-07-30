import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { canAccessAdmin } from "@/lib/rbac";

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

  const { data: userProfile } = await supabase
    .from("profiles")
    .select("subscription_status, role")
    .eq("id", user.id)
    .single();

  if (canAccessAdmin(userProfile?.role)) {
    redirect("/admin/dashboard");
  }

  return <>{children}</>;
}
