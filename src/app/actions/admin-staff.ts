"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/app/actions/admin";
import { revalidatePath } from "next/cache";
import { type StaffRole } from "@/lib/rbac";

export async function createStaffAccount(
  email: string,
  firstName: string,
  role: StaffRole,
  password?: string,
  phone?: string
) {
  await requirePermission("manage_staff");
  const adminClient = await createAdminClient();

  const finalPassword = password || "Staff@12345";
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password: finalPassword,
    email_confirm: true,
    user_metadata: {
      first_name: firstName.trim(),
      full_name: firstName.trim(),
      role: role,
      account_type: "staff",
    },
  });

  if (authError) throw new Error(authError.message);
  const userId = authData?.user?.id;

  if (userId) {
    const nameParts = firstName.trim().split(" ");
    const fName = nameParts[0] || "";
    const lName = nameParts.slice(1).join(" ") || "";

    const { error: profileError } = await adminClient
      .from("profiles" as any)
      .upsert({
        id: userId,
        student_first_name: fName,
        student_last_name: lName,
        student_email: email.trim().toLowerCase(),
        student_phone: phone?.trim() || null,
        role: role,
        account_type: "staff",
        is_active: true,
      });

    if (profileError) {
      // rollback auth creation if profile update fails
      await adminClient.auth.admin.deleteUser(userId);
      throw new Error(profileError.message);
    }
  }

  revalidatePath("/admin/staff");
  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateStaffMember(
  userId: string,
  data: {
    firstName: string;
    email: string;
    role: StaffRole;
    phone?: string;
    password?: string;
    isActive?: boolean;
  }
) {
  await requirePermission("manage_staff");
  const adminClient = await createAdminClient();

  // 1. Prepare Auth update payload
  const authUpdatePayload: any = {
    email: data.email.trim().toLowerCase(),
    user_metadata: {
      first_name: data.firstName.trim(),
      full_name: data.firstName.trim(),
      role: data.role,
      account_type: "staff",
    },
  };

  if (data.password && data.password.trim().length > 0) {
    authUpdatePayload.password = data.password.trim();
  }

  if (data.isActive !== undefined) {
    authUpdatePayload.ban_duration = data.isActive ? "none" : "87600h";
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(
    userId,
    authUpdatePayload
  );

  if (authError) throw new Error(authError.message);

  // 2. Update profiles table
  const nameParts = data.firstName.trim().split(" ");
  const fName = nameParts[0] || "";
  const lName = nameParts.slice(1).join(" ") || "";

  const profileUpdatePayload: any = {
    student_first_name: fName,
    student_last_name: lName,
    role: data.role,
    account_type: "staff",
  };

  if (data.phone !== undefined) {
    profileUpdatePayload.student_phone = data.phone.trim() || null;
  }

  if (data.isActive !== undefined) {
    profileUpdatePayload.is_active = data.isActive;
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update(profileUpdatePayload)
    .eq("id", userId);

  if (profileError) throw new Error(profileError.message);

  revalidatePath("/admin/staff");
  revalidatePath("/admin/users");
  return { success: true };
}

export async function disableStaffAccount(userId: string, disable: boolean) {
  await requirePermission("manage_staff");
  
  // Guard: prevent user from disabling themselves
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.id === userId && disable) {
    throw new Error("You cannot disable your own active account.");
  }

  const adminClient = await createAdminClient();

  // Ban/unban user in Supabase auth
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: disable ? "87600h" : "none", // 10 years or none
  });

  if (authError) throw new Error(authError.message);

  // Sync is_active flag in profiles
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ is_active: !disable })
    .eq("id", userId);

  if (profileError) {
    console.warn("Could not update is_active in profile:", profileError.message);
  }

  revalidatePath("/admin/staff");
  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteStaffMember(userId: string) {
  await requirePermission("manage_staff");

  // Guard: prevent self-deletion
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.id === userId) {
    throw new Error("You cannot delete your own account.");
  }

  const adminClient = await createAdminClient();

  // Delete from auth
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
  if (authError) throw new Error(authError.message);

  // Delete from profiles
  await adminClient.from("profiles").delete().eq("id", userId);

  revalidatePath("/admin/staff");
  revalidatePath("/admin/users");
  return { success: true };
}

