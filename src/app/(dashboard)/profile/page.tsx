import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudentProfile } from "./StudentProfile";

export const metadata = {
  title: "My Profile",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return (
      <div className="p-8 text-red-500 bg-red-50 rounded-xl">
        Failed to load profile data: {error?.message}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      <StudentProfile profile={profile} email={user.email || ""} />
    </div>
  );
}
