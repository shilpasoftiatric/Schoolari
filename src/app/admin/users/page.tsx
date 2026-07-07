import { createAdminClient } from "@/lib/supabase/server";
import { UsersTable } from "./UsersTable";
import { ShieldCheck, Search } from "lucide-react";

export default async function AdminUsersPage() {
  const adminClient = await createAdminClient();

  // Fetch all profiles
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch auth users (to get their emails)
  const { data: { users }, error: authError } = await adminClient.auth.admin.listUsers();

  if (profilesError || authError) {
    return (
      <div className="p-8 text-red-500 bg-red-50 rounded-xl">
        Failed to load users: {profilesError?.message || authError?.message}
      </div>
    );
  }

  // Merge profile data with auth email
  const mergedUsers = profiles?.map((profile) => {
    const authUser = users.find((u) => u.id === profile.id);
    return {
      ...profile,
      email: authUser?.email || "Unknown Email",
    };
  }) || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-violet-600" />
          Users / Members
        </h1>
        <p className="text-slate-500 mt-1">
          View all registered members. Promote accounts to administrator when needed.
        </p>
      </div>

      <UsersTable initialUsers={mergedUsers} />
    </div>
  );
}
