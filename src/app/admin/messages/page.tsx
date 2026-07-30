import { createAdminClient } from "@/lib/supabase/server";
import { MessagesAdmin } from "./MessagesAdmin";
import { Mail } from "lucide-react";

export default async function AdminMessagesPage() {
  const adminClient = await createAdminClient();

  // Get all students and parents for the recipient picker
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, student_first_name, student_last_name, student_email, first_name, account_type")
    .order("student_last_name", { ascending: true });

  // Fetch auth users to get emails for admins/parents
  const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers();

  const users = profiles?.map(profile => {
    const authUser = authUsers.find(u => u.id === profile.id);
    return {
      ...profile,
      email: authUser?.email || ""
    };
  });

  // Get recent messages sent (last 100)
  const { data: recentMessages } = await adminClient
    .from("coaching_messages")
    .select("id, title, content, type, is_read, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(100);

  // Count stats
  const [{ count: totalSent }, { count: unreadCount }] = await Promise.all([
    adminClient.from("coaching_messages").select("*", { count: "exact", head: true }),
    adminClient.from("coaching_messages").select("*", { count: "exact", head: true }).eq("is_read", false),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Mail className="w-6 h-6 text-violet-600" />
          Messages & Notifications
        </h1>
        <p className="text-slate-500 mt-1">
          Send announcements, guidance, reminders, and broadcasts to students and parents.
        </p>
      </div>

      <MessagesAdmin
        users={users || []}
        recentMessages={recentMessages || []}
        stats={{ total: totalSent || 0, unread: unreadCount || 0 }}
      />
    </div>
  );
}
