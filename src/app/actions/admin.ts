"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { canAccessAdmin, hasPermission, isStaffRole, type Permission, type StaffRole } from "@/lib/rbac";
import { sendInviteEmail } from "@/lib/email";

// Get the current caller's staff role (or null if not staff)
export async function getCallerRole(): Promise<StaffRole | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  return isStaffRole(role) ? role : null;
}

// Verify the caller has any staff role (can access admin panel)
export async function verifyAdmin() {
  const role = await getCallerRole();
  if (!role || !canAccessAdmin(role)) {
    throw new Error("Access denied. Staff privileges required.");
  }
  return role;
}

// Verify the caller has a specific permission
export async function requirePermission(permission: Permission) {
  const role = await getCallerRole();
  if (!role || !hasPermission(role, permission)) {
    throw new Error(`Access denied. Missing permission: ${permission}`);
  }
  return role;
}

export async function resetUserAiUsage(userId: string) {
  await requirePermission("manage_users");
  const adminClient = await createAdminClient();
  const { getCurrentMonthString } = await import("@/lib/ai-limits");
  const currentMonth = getCurrentMonthString();

  const { error } = await adminClient
    .from("ai_usage")
    .upsert({
      user_id: userId,
      current_month: currentMonth,
      ask_ai_count: 0,
      essay_count: 0,
      resume_count: 0,
      cover_letter_count: 0,
      essay_docs_count: 0,
      resume_docs_count: 0,
      estimated_cost_usd: 0,
      last_limit_reason: "None",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
  revalidatePath("/admin/ai-limits");
  return { success: true };
}

export async function updateUserRole(userId: string, newRole: string) {
  await requirePermission("manage_users");
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("profiles")
    .update({ role: newRole as any })
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

  // Ensure award_amount_value is computed if award_amount is present
  if (sanitized.award_amount) {
    const numericVal = parseInt(String(sanitized.award_amount).replace(/[^0-9]/g, ""), 10);
    sanitized.award_amount_value = isNaN(numericVal) ? null : numericVal;
  }

  // Ensure state_eligibility_all is boolean
  if (sanitized.state_eligibility_all !== undefined) {
    sanitized.state_eligibility_all = Boolean(sanitized.state_eligibility_all);
  } else if (sanitized.eligible_states) {
    sanitized.state_eligibility_all = String(sanitized.eligible_states).toLowerCase().includes("all");
  }

  // Fix award_frequency enum values
  if (sanitized.award_frequency !== undefined) {
    sanitized.award_frequency = AWARD_FREQUENCY_MAP[sanitized.award_frequency] ?? "";
  }

  // Fix type: number_of_awards is a text column, form sends Number
  if (sanitized.number_of_awards !== null && sanitized.number_of_awards !== undefined) {
    sanitized.number_of_awards = String(sanitized.number_of_awards);
  }

  // Ensure default category
  if (!sanitized.category) {
    sanitized.category = "General";
  }

  // Ensure is_active defaults to true
  if (sanitized.is_active === undefined) {
    sanitized.is_active = true;
  }

  // Remove fields not in the DB schema
  delete sanitized.specialEligibility;
  delete sanitized.special_eligibility;
  delete sanitized.stateEligibilityAll;

  return sanitized;
}

export async function createScholarship(data: any) {
  try {
    await verifyAdmin();
    const adminClient = await createAdminClient();

    const sanitized = sanitizeScholarshipPayload(data);
    sanitized.featured = true; // Admin created scholarships are always marked as featured (Schoolari Recommended)

    const { error } = await adminClient
      .from("scholarships")
      .insert([sanitized]);

    if (error) return { success: false, error: error.message || "Failed to save scholarship." };
    revalidatePath("/admin/scholarships");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred while saving the scholarship." };
  }
}

export async function updateScholarship(id: string, data: any) {
  try {
    await verifyAdmin();
    const adminClient = await createAdminClient();

    const sanitized = sanitizeScholarshipPayload(data);

    const { error } = await adminClient
      .from("scholarships")
      .update(sanitized)
      .eq("id", id);

    if (error) return { success: false, error: error.message || "Failed to update scholarship." };
    revalidatePath("/admin/scholarships");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred while updating the scholarship." };
  }
}

export async function deleteScholarship(id: string) {
  try {
    await verifyAdmin();
    const adminClient = await createAdminClient();

    const { error } = await adminClient
      .from("scholarships")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message || "Failed to delete scholarship." };
    revalidatePath("/admin/scholarships");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function toggleScholarshipStatus(id: string, isActive: boolean) {
  try {
    await verifyAdmin();
    const adminClient = await createAdminClient();

    const { error } = await adminClient
      .from("scholarships")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) return { success: false, error: error.message || "Failed to toggle status." };
    revalidatePath("/admin/scholarships");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function createUserMember(
  email: string,
  firstName: string,
  phone: string,
  accountType: "student" | "parent" = "student",
  lastName?: string
) {
  try {
    await verifyAdmin();
    const adminClient = await createAdminClient();

    // Create user in Supabase auth with an unguessable placeholder password
    const finalPassword = `Init_${crypto.randomUUID()}!Aa9`;
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName || "",
        name: fullName || firstName,
        phone: phone,
        account_type: accountType,
        created_by_admin: true,
      }
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes("already registered") || authError.message?.toLowerCase().includes("already exists")) {
        return { success: false, error: "A user with this email address already exists." };
      }
      return { success: false, error: authError.message || "Failed to create user." };
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create user authentication." };
    }

    // Insert or update profile based on account type
    const isParent = accountType === "parent";
    const profilePayload: Record<string, any> = {
      id: authData.user.id,
      role: "user",
      account_type: accountType,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (isParent) {
      profilePayload.parent_first_name = firstName;
      profilePayload.parent_last_name = lastName || "";
      profilePayload.parent_phone = phone;
      profilePayload.parent_email = email;
    } else {
      profilePayload.student_first_name = firstName;
      profilePayload.student_last_name = lastName || "";
      profilePayload.student_phone = phone;
      profilePayload.student_email = email;
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert(profilePayload);

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: profileError.message || "Failed to create user profile." };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function sendMemberInvite(userId: string) {
  try {
    await verifyAdmin();
    const adminClient = await createAdminClient();

    // Fetch user profile
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return { success: false, error: "Member profile not found." };
    }

    const email = profile.student_email || profile.parent_email || (profile as any).email;
    if (!email) {
      return { success: false, error: "Member has no valid email address." };
    }

    const isParent = profile.account_type === "parent";
    const firstName = isParent
      ? (profile.parent_first_name || profile.first_name || "Member")
      : (profile.student_first_name || profile.first_name || "Member");

    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectTo = `${origin}/members/update-password`;

    // Generate invite or recovery link pointing directly to /members/update-password
    let inviteUrl = `${origin}/members/update-password`;

    const { data: recoveryData, error: recoveryError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo,
      }
    });

    const recProps = (recoveryData as any)?.properties;
    if (!recoveryError && recProps?.action_link) {
      const actionUrl = new URL(recProps.action_link);
      const token = actionUrl.searchParams.get("token");
      const type = actionUrl.searchParams.get("type") || "recovery";
      inviteUrl = `${origin}/members/update-password?token=${token}&type=${type}`;
    } else {
      // Fallback to invite link if recovery generation failed
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
          redirectTo,
        }
      });

      const invProps = (inviteData as any)?.properties;
      if (inviteError && !invProps?.action_link) {
        return { success: false, error: inviteError.message || "Failed to generate invite link." };
      }

      if (invProps?.action_link) {
        const actionUrl = new URL(invProps.action_link);
        const token = actionUrl.searchParams.get("token");
        const type = actionUrl.searchParams.get("type") || "invite";
        inviteUrl = `${origin}/members/update-password?token=${token}&type=${type}`;
      }
    }

    // Send email using custom Gmail API / Schoolari setup
    const emailResult = await sendInviteEmail(
      email,
      firstName,
      "Schoolari Team",
      inviteUrl,
      isParent ? "parent" : "student"
    );

    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.error || "Failed to deliver invite email. Please check email configuration."
      };
    }

    return { success: true, message: `Invite email sent to ${email}` };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred while sending invite." };
  }
}

export async function updateUserBasicInfo(userId: string, data: {
  first_name?: string;
  phone?: string;
  student_first_name: string;
  student_last_name: string;
  student_email: string;
  student_phone: string;
  parent_first_name: string;
  parent_last_name: string;
  parent_email: string;
  parent_phone: string;
}) {
  await requirePermission("manage_users");
  const adminClient = await createAdminClient();

  const { data: targetProfile, error: profileErr } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileErr || !targetProfile) {
    throw new Error("Target profile not found");
  }

  const isParent = targetProfile.account_type === "parent";

  const updatePayload: any = {
    student_first_name: data.student_first_name || "",
    student_last_name: data.student_last_name || "",
    student_email: data.student_email || "",
    student_phone: data.student_phone || "",
    parent_first_name: data.parent_first_name || "",
    parent_last_name: data.parent_last_name || "",
    parent_email: data.parent_email || "",
    parent_phone: data.parent_phone || "",
  };

  const { error } = await adminClient
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId);

  if (error) throw new Error(error.message);

  // Sync Auth metadata for user
  const effectiveFirstName = isParent ? (data.parent_first_name || data.first_name) : (data.student_first_name || data.first_name);
  const effectiveLastName = isParent ? data.parent_last_name : data.student_last_name;
  const effectivePhone = isParent ? (data.parent_phone || data.phone) : (data.student_phone || data.phone);

  await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      first_name: effectiveFirstName,
      last_name: effectiveLastName,
      full_name: `${effectiveFirstName || ""} ${effectiveLastName || ""}`.trim(),
      phone: effectivePhone,
    },
  }).catch(() => {});

  // Sync with linked student or linked parent
  if (isParent) {
    let studentId: string | null = targetProfile.linked_student_id;
    if (!studentId && targetProfile.parent_email) {
      const { data: studentMatch } = await adminClient
        .from("profiles")
        .select("id")
        .ilike("parent_email", targetProfile.parent_email.toLowerCase().trim())
        .neq("account_type", "parent")
        .maybeSingle();
      studentId = studentMatch?.id || null;
    }

    if (studentId) {
      await adminClient
        .from("profiles")
        .update({
          student_first_name: data.student_first_name || "",
          student_last_name: data.student_last_name || "",
          student_email: data.student_email || "",
          student_phone: data.student_phone || "",
          parent_first_name: data.parent_first_name || "",
          parent_last_name: data.parent_last_name || "",
          parent_email: data.parent_email || "",
          parent_phone: data.parent_phone || "",
        })
        .eq("id", studentId);
    }
  } else {
    let { data: linkedParent } = await adminClient
      .from("profiles")
      .select("id")
      .eq("linked_student_id", userId)
      .eq("account_type", "parent")
      .maybeSingle();

    if (!linkedParent && targetProfile.parent_email) {
      const { data: fallbackParent } = await adminClient
        .from("profiles")
        .select("id")
        .ilike("parent_email", targetProfile.parent_email.toLowerCase().trim())
        .eq("account_type", "parent")
        .maybeSingle();
      linkedParent = fallbackParent;
    }

    if (linkedParent?.id) {
      await adminClient
        .from("profiles")
        .update({
          parent_first_name: data.parent_first_name || "",
          parent_last_name: data.parent_last_name || "",
          parent_email: data.parent_email || "",
          parent_phone: data.parent_phone || "",
        })
        .eq("id", linkedParent.id);
    }
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function resetUserPassword(userId: string, newPassword?: string) {
  await requirePermission("manage_users");
  const adminClient = await createAdminClient();
  const password = newPassword || "User@12345";
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);
  return { success: true, password };
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  await requirePermission("manage_users");
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from("profiles").update({ is_active: isActive }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUserAccount(userId: string) {
  await requirePermission("manage_users");
  const adminClient = await createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
  return { success: true };
}

export async function bulkDeleteUsers(userIds: string[]) {
  await requirePermission("manage_users");
  const adminClient = await createAdminClient();

  // Auto-include linked parents for any student IDs in the selection
  const { data: linkedParents } = await adminClient
    .from("profiles")
    .select("id")
    .in("linked_student_id", userIds)
    .eq("account_type", "parent");

  const allIdsToDelete = new Set<string>(userIds);
  (linkedParents || []).forEach((p: { id: string }) => allIdsToDelete.add(p.id));

  const results: { deleted: number; failed: string[] } = { deleted: 0, failed: [] };

  for (const id of allIdsToDelete) {
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (error) {
      results.failed.push(id);
    } else {
      results.deleted++;
    }
  }

  revalidatePath("/admin/users");
  return results;
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

export async function triggerApifyScraper() {
  await verifyAdmin();
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("Missing APIFY_API_TOKEN in environment variables");

  const runUrl = `https://api.apify.com/v2/acts/commanding_hotdog~scholarship-finder-scraper/runs?token=${token}`;
  const res = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ search: "general", maxItems: 50 })
  });

  const data = await res.json();
  if (!data.data || !data.data.id) {
    throw new Error(data.error?.message || "Failed to trigger Apify scraper");
  }

  return { success: true, runId: data.data.id };
}

// ─────────────────────────────────────────────────────────────
// EARN WHILE YOU LEARN — Category Actions
// ─────────────────────────────────────────────────────────────

export async function createEarnCategory(data: { name: string; description?: string }) {
  try {
    await verifyAdmin();
    const adminClient = await createAdminClient();

    const trimmedName = data.name.trim();

    // Check if category with this name already exists (case-insensitive)
    const { data: existing } = await adminClient
      .from("earn_categories")
      .select("id")
      .ilike("name", trimmedName)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `A category named "${trimmedName}" already exists. Please choose a different name.` };
    }

    // Place new category at the end
    const { data: last } = await adminClient
      .from("earn_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (last?.sort_order ?? -1) + 1;

    const { error } = await adminClient
      .from("earn_categories")
      .insert([{ name: trimmedName, description: data.description?.trim() || "", sort_order: nextOrder }]);

    if (error) return { success: false, error: error.message || "Failed to create category." };
    revalidatePath("/admin/income");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function updateEarnCategory(id: string, data: { name: string; description?: string }) {
  try {
    await verifyAdmin();
    const adminClient = await createAdminClient();

    const trimmedName = data.name.trim();

    // Check if another category already has this name (case-insensitive)
    const { data: existing } = await adminClient
      .from("earn_categories")
      .select("id")
      .ilike("name", trimmedName)
      .neq("id", id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `A category named "${trimmedName}" already exists. Please choose a different name.` };
    }

    const { error } = await adminClient
      .from("earn_categories")
      .update({ name: trimmedName, description: data.description?.trim() || "" })
      .eq("id", id);

    if (error) return { success: false, error: error.message || "Failed to update category." };
    revalidatePath("/admin/income");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function deleteEarnCategory(id: string) {
  try {
    await verifyAdmin();
    const adminClient = await createAdminClient();

    const { error } = await adminClient
      .from("earn_categories")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message || "Failed to delete category." };
    revalidatePath("/admin/income");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function reorderEarnCategory(id: string, direction: "up" | "down") {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  // Fetch all categories ordered
  const { data: all, error: fetchErr } = await adminClient
    .from("earn_categories")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  if (fetchErr || !all) throw new Error("Failed to fetch categories");

  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Category not found");

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return; // already at boundary

  const current = all[idx];
  const neighbor = all[swapIdx];

  // Swap sort_order values
  const { error: e1 } = await adminClient
    .from("earn_categories")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", current.id);

  const { error: e2 } = await adminClient
    .from("earn_categories")
    .update({ sort_order: current.sort_order })
    .eq("id", neighbor.id);

  if (e1 || e2) throw new Error("Reorder failed");
  revalidatePath("/admin/income");
}

// ─────────────────────────────────────────────────────────────
// EARN WHILE YOU LEARN — Video Actions
// ─────────────────────────────────────────────────────────────

type VideoPayload = {
  category_id: string;
  title: string;
  description?: string;
  video_type: "youtube" | "mp4";
  youtube_url?: string;
  mp4_storage_path?: string;
  thumbnail_url?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  watch_time_mins?: number | null;
  is_published: boolean;
  action_items: string[]; // max 3 non-empty titles
};

export async function createEarnVideo(payload: VideoPayload) {
  try {
    await verifyAdmin();

    // Validate action items (1 to 3 required) before DB operations
    const validActionItems = payload.action_items.filter((t) => t.trim());
    if (validActionItems.length < 1 || validActionItems.length > 3) {
      return { success: false, error: "Please provide at least 1 and up to 3 action items for this video." };
    }

    const adminClient = await createAdminClient();

    // Next sort_order for this category
    const { data: last } = await adminClient
      .from("earn_videos")
      .select("sort_order")
      .eq("category_id", payload.category_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (last?.sort_order ?? -1) + 1;

    const { data: video, error } = await adminClient
      .from("earn_videos")
      .insert([{
        category_id: payload.category_id,
        title: payload.title.trim(),
        description: payload.description?.trim() || "",
        video_type: payload.video_type,
        youtube_url: payload.youtube_url?.trim() || "",
        mp4_storage_path: payload.mp4_storage_path || null,
        thumbnail_url: payload.thumbnail_url || null,
        difficulty: payload.difficulty,
        watch_time_mins: payload.watch_time_mins || null,
        is_published: payload.is_published,
        sort_order: nextOrder,
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return { success: false, error: "A video with this title already exists. Please choose a different title." };
      if (error.code === '23503') return { success: false, error: "The selected category is invalid or no longer exists." };
      if (error.code === '23502') return { success: false, error: "A required field is missing. Please check your inputs." };
      return { success: false, error: "Failed to save the video to the database. Please try again." };
    }

    // Insert action items
    const actionItems = validActionItems
      .map((t, idx) => ({ video_id: video.id, title: t.trim(), sort_order: idx }));

    if (actionItems.length > 0) {
      const { error: aiErr } = await adminClient.from("earn_video_action_items").insert(actionItems);
      if (aiErr) return { success: false, error: "Video was created, but failed to save action items. Please edit the video to add them." };
    }

    revalidatePath("/admin/income");
    return { success: true, video };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred while saving the video." };
  }
}

export async function updateEarnVideo(id: string, payload: VideoPayload) {
  try {
    await verifyAdmin();

    // Validate action items (1 to 3 required) before DB operations
    const validActionItems = payload.action_items.filter((t) => t.trim());
    if (validActionItems.length < 1 || validActionItems.length > 3) {
      return { success: false, error: "Please provide at least 1 and up to 3 action items for this video." };
    }

    const adminClient = await createAdminClient();

    const { error } = await adminClient
      .from("earn_videos")
      .update({
        category_id: payload.category_id,
        title: payload.title.trim(),
        description: payload.description?.trim() || "",
        video_type: payload.video_type,
        youtube_url: payload.youtube_url?.trim() || "",
        mp4_storage_path: payload.mp4_storage_path || null,
        thumbnail_url: payload.thumbnail_url || null,
        difficulty: payload.difficulty,
        watch_time_mins: payload.watch_time_mins || null,
        is_published: payload.is_published,
      })
      .eq("id", id);

    if (error) {
      if (error.code === '23505') return { success: false, error: "A video with this title already exists. Please choose a different title." };
      if (error.code === '23503') return { success: false, error: "The selected category is invalid or no longer exists." };
      if (error.code === '23502') return { success: false, error: "A required field is missing. Please check your inputs." };
      return { success: false, error: "Failed to update the video in the database. Please try again." };
    }

    // Replace action items: delete existing then insert new
    await adminClient.from("earn_video_action_items").delete().eq("video_id", id);

    const actionItems = validActionItems
      .map((t, idx) => ({ video_id: id, title: t.trim(), sort_order: idx }));

    if (actionItems.length > 0) {
      const { error: aiErr } = await adminClient.from("earn_video_action_items").insert(actionItems);
      if (aiErr) return { success: false, error: "Video was updated, but failed to save action items. Please try editing again." };
    }

    revalidatePath("/admin/income");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred while updating the video." };
  }
}

export async function deleteEarnVideo(id: string) {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  const { error } = await adminClient.from("earn_videos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/income");
}

export async function toggleEarnVideoPublished(id: string, isPublished: boolean) {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("earn_videos")
    .update({ is_published: isPublished })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/income");
}

export async function reorderEarnVideo(id: string, direction: "up" | "down") {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  // Get current video + its category
  const { data: current } = await adminClient
    .from("earn_videos")
    .select("id, category_id, sort_order")
    .eq("id", id)
    .single();

  if (!current) throw new Error("Video not found");

  const { data: siblings } = await adminClient
    .from("earn_videos")
    .select("id, sort_order")
    .eq("category_id", current.category_id)
    .order("sort_order", { ascending: true });

  if (!siblings) throw new Error("Failed to fetch videos");

  const idx = siblings.findIndex((v) => v.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return;

  const neighbor = siblings[swapIdx];
  await adminClient.from("earn_videos").update({ sort_order: neighbor.sort_order }).eq("id", current.id);
  await adminClient.from("earn_videos").update({ sort_order: current.sort_order }).eq("id", neighbor.id);

  revalidatePath("/admin/income");
}

// Upload MP4 to Supabase Storage — uses FormData, same pattern as documents.ts
export async function uploadEarnVideoFile(formData: FormData) {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");
  if (file.size > 500 * 1024 * 1024) throw new Error("File too large. Maximum is 500MB.");

  const ext = file.name.split(".").pop();
  const safeName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
  const storagePath = `videos/${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await adminClient.storage
    .from("earn-videos")
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: { publicUrl } } = adminClient.storage.from("earn-videos").getPublicUrl(storagePath);

  return { storagePath, publicUrl };
}

export async function getUserFreshDetails(userId: string) {
  try {
    await verifyAdmin();
    const adminClient = await createAdminClient();

    const { data: profile, error } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return { success: false, error: error?.message || "User not found" };
    }

    // If user is a student or standard member, check if parent is linked
    const isParent = profile.account_type === "parent";
    if (!isParent) {
      let { data: linkedParent } = await adminClient
        .from("profiles")
        .select("*")
        .eq("linked_student_id", userId)
        .maybeSingle();

      if (!linkedParent && profile.student_email) {
        const { data: fallbackParent } = await adminClient
          .from("profiles")
          .select("*")
          .eq("student_email", profile.student_email)
          .eq("account_type", "parent")
          .maybeSingle();
        linkedParent = fallbackParent;
      }

      if (linkedParent) {
        profile.parent_first_name = profile.parent_first_name || linkedParent.parent_first_name || "";
        profile.parent_last_name = profile.parent_last_name || linkedParent.parent_last_name || "";
        profile.parent_email = profile.parent_email || linkedParent.parent_email || "";
        profile.parent_phone = profile.parent_phone || linkedParent.parent_phone || "";

        if ((linkedParent.subscription_status === "active" || linkedParent.subscription_status === "trialing") && !profile.subscription_status) {
          profile.stripe_customer_id = linkedParent.stripe_customer_id;
          profile.stripe_subscription_id = linkedParent.stripe_subscription_id;
          profile.stripe_price_id = linkedParent.stripe_price_id;
          profile.subscription_status = linkedParent.subscription_status;
        }
      }
    } else {
      let student = null;
      if (profile.linked_student_id) {
        const { data: st } = await adminClient
          .from("profiles")
          .select("*")
          .eq("id", profile.linked_student_id)
          .maybeSingle();
        student = st;
      }

      const { data: authUserObj } = await adminClient.auth.admin.getUserById(userId);
      const userMeta = authUserObj?.user?.user_metadata || {};

      if (!student && userMeta.linked_student_id) {
        const { data: st } = await adminClient
          .from("profiles")
          .select("*")
          .eq("id", userMeta.linked_student_id)
          .maybeSingle();
        student = st;
      }

      if (!student) {
        const parentEmail = (profile.parent_email || authUserObj?.user?.email || "").toLowerCase().trim();
        if (parentEmail) {
          const { data: st } = await adminClient
            .from("profiles")
            .select("*")
            .ilike("parent_email", parentEmail)
            .neq("account_type", "parent")
            .maybeSingle();
          student = st;
        }
      }

      if (student) {
        profile.parent_first_name = profile.parent_first_name || student.parent_first_name || userMeta.parent_first_name || userMeta.first_name || "";
        profile.parent_last_name = profile.parent_last_name || student.parent_last_name || userMeta.parent_last_name || userMeta.last_name || "";
        profile.parent_phone = profile.parent_phone || student.parent_phone || userMeta.parent_phone || userMeta.phone || "";
        profile.parent_email = profile.parent_email || student.parent_email || authUserObj?.user?.email || "";
        profile.first_name = profile.first_name || profile.parent_first_name;
        profile.phone = profile.phone || profile.parent_phone;
        profile.linked_student_id = profile.linked_student_id || student.id;
        (profile as any).linked_student = student;

        if ((student.subscription_status === "active" || student.subscription_status === "trialing") && !profile.subscription_status) {
          profile.stripe_customer_id = student.stripe_customer_id;
          profile.stripe_subscription_id = student.stripe_subscription_id;
          profile.stripe_price_id = student.stripe_price_id;
          profile.subscription_status = student.subscription_status;
        }
      } else {
        profile.parent_first_name = profile.parent_first_name || profile.first_name || userMeta.parent_first_name || userMeta.first_name || "";
        profile.parent_last_name = profile.parent_last_name || userMeta.parent_last_name || userMeta.last_name || "";
        profile.parent_phone = profile.parent_phone || profile.phone || userMeta.parent_phone || userMeta.phone || "";
        profile.parent_email = profile.parent_email || authUserObj?.user?.email || "";
        profile.first_name = profile.first_name || profile.parent_first_name;
        profile.phone = profile.phone || profile.parent_phone;
      }
    }

    const { data: aiUsage } = await adminClient
      .from("ai_usage")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: authUser } = await adminClient.auth.admin.getUserById(userId);

    return {
      success: true,
      user: {
        ...profile,
        email: authUser?.user?.email || profile.student_email || profile.parent_email,
        last_login_date: profile.last_login_date || authUser?.user?.last_sign_in_at || null,
        created_at: profile.created_at || authUser?.user?.created_at || null,
        usage: aiUsage || null,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch user details" };
  }
}
