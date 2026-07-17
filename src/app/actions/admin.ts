"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";

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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user && user.id === userId && newRole === "user") {
    await supabase.auth.signOut();
    return { shouldRedirect: true };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

// Maps award_frequency display values to DB enum values
const AWARD_FREQUENCY_MAP: Record<string, string> = {
  "Not Specified": "",
  "One Time": "one_time",
  "Renewable": "renewable",
  // pass-through for already-correct values
  "": "",
  "one_time": "one_time",
  "renewable": "renewable",
};

function sanitizeScholarshipPayload(data: any) {
  const sanitized: any = { ...data };

  // Fix column name mismatch: form sends citizenship_requirement, DB column is citizenship_req
  if ("citizenship_requirement" in sanitized) {
    sanitized.citizenship_req = sanitized.citizenship_requirement;
    delete sanitized.citizenship_requirement;
  }

  // Fix award_frequency enum values
  if (sanitized.award_frequency !== undefined) {
    sanitized.award_frequency = AWARD_FREQUENCY_MAP[sanitized.award_frequency] ?? "";
  }

  // Fix type: number_of_awards is a text column, form sends Number
  if (sanitized.number_of_awards !== null && sanitized.number_of_awards !== undefined) {
    sanitized.number_of_awards = String(sanitized.number_of_awards);
  }

  // Remove fields not in the DB schema
  delete sanitized.specialEligibility;
  delete sanitized.special_eligibility;

  return sanitized;
}

export async function createScholarship(data: any) {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  const sanitized = sanitizeScholarshipPayload(data);

  const { error } = await adminClient
    .from("scholarships")
    .insert([sanitized]);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/scholarships");
}

export async function updateScholarship(id: string, data: any) {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  const sanitized = sanitizeScholarshipPayload(data);

  const { error } = await adminClient
    .from("scholarships")
    .update(sanitized)
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

export async function updateSiteSettings(data: { site_name: string; support_email: string; support_phone: string }) {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("site_settings")
    .update(data)
    // we assume there's only 1 row, so we can update without ID if we fetch the first one, or we can just update all rows (since there's only 1)
    .neq("id", "00000000-0000-0000-0000-000000000000"); // hack to update all rows without needing the specific ID

  if (error) throw new Error(error.message);


  updateTag("site-settings");
  revalidatePath("/", "layout");
}
