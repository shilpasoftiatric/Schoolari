import { requirePermission } from "@/app/actions/admin";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isStaffRole, type StaffRole } from "@/lib/rbac";
import { StaffAdmin } from "./StaffAdmin";

export const dynamic = "force-dynamic";

export default async function StaffAdminPage() {
  await requirePermission("manage_staff");
  
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const adminClient = await createAdminClient();

  // Fetch all profiles and all auth users
  const { data: profiles } = await adminClient.from("profiles").select("*");
  const { data: { users } } = await adminClient.auth.admin.listUsers();

  const profileMap = new Map<string, any>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p));

  const staffRoleKeys = [
    "super_admin",
    "admin",
    "college_coach",
    "content_manager",
    "customer_support",
    "essay_coach",
  ];

  // Collect all user IDs that belong to staff members
  const staffIdSet = new Set<string>();

  (profiles || []).forEach((p) => {
    if (staffRoleKeys.includes(p.role) || p.account_type === "staff") {
      staffIdSet.add(p.id);
    }
  });

  (users || []).forEach((u) => {
    const metaRole = u.user_metadata?.role;
    const metaAccountType = u.user_metadata?.account_type;
    if (staffRoleKeys.includes(metaRole) || metaAccountType === "staff") {
      staffIdSet.add(u.id);
    }
  });

  // Construct complete staff objects merging profile and auth user data
  const staffMembers = Array.from(staffIdSet).map((id) => {
    const profile = profileMap.get(id) || {};
    const authUser = (users || []).find((u) => u.id === id);

    const email = authUser?.email || profile.student_email || profile.parent_email || "";

    let firstName =
      profile.first_name ||
      profile.student_first_name ||
      profile.parent_first_name ||
      authUser?.user_metadata?.first_name ||
      authUser?.user_metadata?.full_name?.split(" ")[0] ||
      authUser?.user_metadata?.name?.split(" ")[0] ||
      (email ? email.split("@")[0] : "Staff Member");

    let lastName =
      profile.student_last_name ||
      profile.parent_last_name ||
      authUser?.user_metadata?.last_name ||
      authUser?.user_metadata?.full_name?.split(" ").slice(1).join(" ") ||
      "";

    let rawRole = profile.role || authUser?.user_metadata?.role || "admin";
    if (rawRole === "essay_coach") rawRole = "college_coach";
    const role: StaffRole = isStaffRole(rawRole) ? rawRole : "admin";

    const isBanned =
      !!authUser?.banned_until && new Date(authUser.banned_until) > new Date();
    const isActive = profile.is_active !== false && !isBanned;

    return {
      id,
      email,
      first_name: firstName,
      last_name: lastName,
      name: lastName ? `${firstName} ${lastName}` : firstName,
      phone:
        profile.phone ||
        profile.student_phone ||
        profile.parent_phone ||
        authUser?.phone ||
        "",
      role,
      account_type: "staff",
      is_active: isActive,
      is_banned: isBanned,
      created_at:
        profile.created_at || authUser?.created_at || new Date().toISOString(),
      last_sign_in_at: authUser?.last_sign_in_at || null,
    };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <StaffAdmin 
        initialStaff={staffMembers} 
        currentUserId={currentUser?.id || ""} 
      />
    </div>
  );
}

