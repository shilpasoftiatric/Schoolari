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
