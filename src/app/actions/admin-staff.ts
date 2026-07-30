"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/app/actions/admin";
import { revalidatePath } from "next/cache";
import { type StaffRole } from "@/lib/rbac";

export async function createStaffAccount(
  email: string,
  firstName: string,
  role: StaffRole,
  password?: string
) {
  await requirePermission("manage_staff");
  const adminClient = await createAdminClient();

  const finalPassword = password || "Staff@12345";
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: finalPassword,
    email_confirm: true,
  });

  if (authError) throw new Error(authError.message);
  const userId = authData?.user?.id;

  if (userId) {
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        first_name: firstName,
        role: role,
        account_type: "staff"
      })
      .eq("id", userId);

    if (profileError) {
      // rollback auth creation if profile update fails
      await adminClient.auth.admin.deleteUser(userId);
      throw new Error(profileError.message);
    }
  }

  revalidatePath("/admin/staff");
  return { success: true };
}

export async function disableStaffAccount(userId: string, disable: boolean) {
  await requirePermission("manage_staff");
  const adminClient = await createAdminClient();

  // Ban/unban user in Supabase auth
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: disable ? "87600h" : "none" // 10 years or none
  });

  if (authError) throw new Error(authError.message);

  revalidatePath("/admin/staff");
  return { success: true };
}
