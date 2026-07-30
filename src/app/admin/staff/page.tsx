import { requirePermission } from "@/app/actions/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { StaffAdmin } from "./StaffAdmin";

export const dynamic = "force-dynamic";

export default async function StaffAdminPage() {
  await requirePermission("manage_staff");
  
  const adminClient = await createAdminClient();

  // Fetch all staff members (anyone with a staff role)
  // Super Admin, Administrator, College Coach, Content Manager, Customer Support
  const { data: staffMembers } = await adminClient
    .from("profiles")
    .select("*")
    .in("role", ["super_admin", "administrator", "college_coach", "content_manager", "customer_support"])
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Staff Management</h1>
          <p className="text-slate-500 mt-1">Create and manage admin team accounts and roles</p>
        </div>
      </div>
      
      <StaffAdmin initialStaff={staffMembers || []} />
    </div>
  );
}
