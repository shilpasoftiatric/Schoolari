"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "./admin";
import { clearJobsCache } from "./career";

// ==========================================
// Custom Jobs
// ==========================================

export async function createCustomJob(data: {
  title: string;
  company: string;
  location: string;
  employment_type: string;
  description: string;
  apply_url: string;
  is_active: boolean;
}) {
  await requirePermission("manage_content");
  const adminClient = await createAdminClient();

  const { data: inserted, error } = await adminClient
    .from("custom_jobs" as any)
    .insert([data])
    .select()
    .single();

  if (error) return { error: error.message };

  await clearJobsCache();
  revalidatePath("/admin/career");
  revalidatePath("/jobs");
  return { success: true, data: inserted };
}

export async function updateCustomJob(id: string, data: any) {
  await requirePermission("manage_content");
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("custom_jobs" as any)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  await clearJobsCache();
  revalidatePath("/admin/career");
  revalidatePath("/jobs");
  return { success: true };
}

export async function deleteCustomJob(id: string) {
  await requirePermission("manage_content");
  const adminClient = await createAdminClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return { success: true };
  }

  const { error } = await adminClient
    .from("custom_jobs" as any)
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  await clearJobsCache();
  revalidatePath("/admin/career");
  revalidatePath("/jobs");
  return { success: true };
}

export async function toggleCustomJobActive(id: string, isActive: boolean) {
  await requirePermission("manage_content");
  const adminClient = await createAdminClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return { success: true };
  }

  const { error } = await adminClient
    .from("custom_jobs" as any)
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  await clearJobsCache();
  revalidatePath("/admin/career");
  revalidatePath("/jobs");
  return { success: true };
}

// ==========================================
// Career Articles
// ==========================================

export async function createCareerArticle(data: {
  title: string;
  summary?: string;
  content: string;
  category: string;
  external_url?: string;
  image_url?: string;
  is_active: boolean;
}) {
  await requirePermission("manage_content");
  const adminClient = await createAdminClient();

  const { data: inserted, error } = await adminClient
    .from("career_articles" as any)
    .insert([data])
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/career");
  revalidatePath("/jobs");
  return { success: true, data: inserted };
}

export async function updateCareerArticle(id: string, data: any) {
  await requirePermission("manage_content");
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("career_articles" as any)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/career");
  revalidatePath("/jobs");
  return { success: true };
}

export async function deleteCareerArticle(id: string) {
  await requirePermission("manage_content");
  const adminClient = await createAdminClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return { success: true };
  }

  const { error } = await adminClient
    .from("career_articles" as any)
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/career");
  revalidatePath("/jobs");
  return { success: true };
}

export async function toggleCareerArticleActive(id: string, isActive: boolean) {
  await requirePermission("manage_content");
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("career_articles" as any)
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/career");
  revalidatePath("/jobs");
  return { success: true };
}
