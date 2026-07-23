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
  await verifyAdmin();
  const adminClient = await createAdminClient();

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
    .insert([{ name: data.name.trim(), description: data.description?.trim() || null, sort_order: nextOrder }]);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/income");
}

export async function updateEarnCategory(id: string, data: { name: string; description?: string }) {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("earn_categories")
    .update({ name: data.name.trim(), description: data.description?.trim() || null })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/income");
}

export async function deleteEarnCategory(id: string) {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("earn_categories")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/income");
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
  await verifyAdmin();

  // Validate action items (1 to 3 required) before DB operations
  const validActionItems = payload.action_items.filter((t) => t.trim());
  if (validActionItems.length < 1 || validActionItems.length > 3) {
    throw new Error("Please provide at least 1 and up to 3 action items for this video.");
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
      description: payload.description?.trim() || null,
      video_type: payload.video_type,
      youtube_url: payload.youtube_url?.trim() || null,
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
    if (error.code === '23505') throw new Error("A video with this title already exists. Please choose a different title.");
    if (error.code === '23503') throw new Error("The selected category is invalid or no longer exists.");
    if (error.code === '23502') throw new Error("A required field is missing. Please check your inputs.");
    throw new Error("Failed to save the video to the database. Please try again.");
  }

  // Insert action items
  const actionItems = validActionItems
    .map((t, idx) => ({ video_id: video.id, title: t.trim(), sort_order: idx }));

  if (actionItems.length > 0) {
    const { error: aiErr } = await adminClient.from("earn_video_action_items").insert(actionItems);
    if (aiErr) throw new Error("Video was created, but failed to save action items. Please edit the video to add them.");
  }

  revalidatePath("/admin/income");
  return video;
}

export async function updateEarnVideo(id: string, payload: VideoPayload) {
  await verifyAdmin();

  // Validate action items (1 to 3 required) before DB operations
  const validActionItems = payload.action_items.filter((t) => t.trim());
  if (validActionItems.length < 1 || validActionItems.length > 3) {
    throw new Error("Please provide at least 1 and up to 3 action items for this video.");
  }

  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("earn_videos")
    .update({
      category_id: payload.category_id,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      video_type: payload.video_type,
      youtube_url: payload.youtube_url?.trim() || null,
      mp4_storage_path: payload.mp4_storage_path || null,
      thumbnail_url: payload.thumbnail_url || null,
      difficulty: payload.difficulty,
      watch_time_mins: payload.watch_time_mins || null,
      is_published: payload.is_published,
    })
    .eq("id", id);

  if (error) {
    if (error.code === '23505') throw new Error("A video with this title already exists. Please choose a different title.");
    if (error.code === '23503') throw new Error("The selected category is invalid or no longer exists.");
    if (error.code === '23502') throw new Error("A required field is missing. Please check your inputs.");
    throw new Error("Failed to update the video in the database. Please try again.");
  }

  // Replace action items: delete existing then insert new
  await adminClient.from("earn_video_action_items").delete().eq("video_id", id);

  const actionItems = validActionItems
    .map((t, idx) => ({ video_id: id, title: t.trim(), sort_order: idx }));

  if (actionItems.length > 0) {
    const { error: aiErr } = await adminClient.from("earn_video_action_items").insert(actionItems);
    if (aiErr) throw new Error("Video was updated, but failed to save action items. Please try editing again.");
  }

  revalidatePath("/admin/income");
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
