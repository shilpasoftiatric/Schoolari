import { getAdminConversations, getMessageStats } from "@/app/actions/admin-messages";
import { MessagesAdmin } from "./MessagesAdmin";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Coach & Student Messages | Admin Desk",
  description: "2-way direct advisory communication with students and parents.",
};

export default async function AdminMessagesPage() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentUser = {
    id: user?.id || "",
    email: user?.email || "",
    name: "Admissions Coach",
    role: "college_coach",
  };

  if (user) {
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("student_first_name, student_last_name, parent_first_name, role")
      .eq("id", user.id)
      .maybeSingle();

    const fullName =
      (profile &&
        [profile.student_first_name, profile.student_last_name].filter(Boolean).join(" ")) ||
      profile?.parent_first_name ||
      user.user_metadata?.full_name ||
      "Admissions Coach";

    currentUser = {
      id: user.id,
      email: user.email || "",
      name: fullName,
      role: profile?.role || "college_coach",
    };
  }

  const [conversations, stats] = await Promise.all([
    getAdminConversations(),
    getMessageStats(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <MessagesAdmin
        initialConversations={conversations || []}
        stats={stats || { total: 0, unread: 0 }}
        currentUser={currentUser}
      />
    </div>
  );
}
