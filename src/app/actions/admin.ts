"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Utility to verify admin role
export async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("Access denied. Admin privileges required.");
  }
}

export async function updateUserRole(userId: string, newRole: "admin" | "user") {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

export async function createScholarship(data: any) {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("scholarships")
    .insert([data]);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/scholarships");
}

export async function updateScholarship(id: string, data: any) {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("scholarships")
    .update(data)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/scholarships");
}

export async function deleteScholarship(id: string) {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("scholarships")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/scholarships");
}

export async function toggleScholarshipStatus(id: string, isActive: boolean) {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("scholarships")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/scholarships");
}

export async function createUserMember(email: string, firstName: string, phone: string, role: "admin" | "user" = "user", password?: string) {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  // Create user in Supabase auth
  const finalPassword = password || "User@12345"; // Default temporary password if not provided
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: finalPassword,
    email_confirm: true,
  });

  if (authError) throw new Error(authError.message);
  const userId = authData?.user?.id;

  if (userId) {
    // The db trigger on_auth_user_created automatically inserts the row.
    // We update the newly created row with custom fields.
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        first_name: firstName,
        phone: phone,
        role: role
      })
      .eq("id", userId);

    if (profileError) {
      // Clean up auth user to prevent dangling records
      await adminClient.auth.admin.deleteUser(userId);
      throw new Error(profileError.message);
    }
  }

  revalidatePath("/admin/users");
  return { success: true };
}
