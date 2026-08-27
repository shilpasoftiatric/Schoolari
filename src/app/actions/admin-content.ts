"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdmin, requirePermission } from "@/app/actions/admin";
import { revalidatePath } from "next/cache";

const CONTENT_TYPES = [
  "tip",
  "quote",
  "announcement",
  "event",
  "featured_scholarship",
  "banner",
] as const;

export type ContentType = typeof CONTENT_TYPES[number];

export async function createContent(data: {
  type: ContentType;
  title: string;
  body: string;
  cta_label?: string | null;
  cta_url?: string | null;
  scheduled_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
}) {
  await requirePermission("manage_content");
  const adminClient = await createAdminClient();

  const payload = {
    type: data.type,
    title: data.title?.trim() || "",
    body: data.body?.trim() || "",
    cta_label: data.cta_label?.trim() || null,
    cta_url: data.cta_url?.trim() || null,
    scheduled_at: data.scheduled_at && data.scheduled_at.trim() ? new Date(data.scheduled_at).toISOString() : null,
    expires_at: data.expires_at && data.expires_at.trim() ? new Date(data.expires_at).toISOString() : null,
    is_active: data.is_active ?? true,
  };

  const { error } = await adminClient.from("dashboard_content" as any).insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/admin/content");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateContent(id: string, data: Partial<{
  title: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  is_active: boolean;
  scheduled_at: string | null;
  expires_at: string | null;
}>) {
  await requirePermission("manage_content");
  const adminClient = await createAdminClient();

  const payload: any = {};
  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.body !== undefined) payload.body = data.body.trim();
  if (data.cta_label !== undefined) payload.cta_label = data.cta_label?.trim() || null;
  if (data.cta_url !== undefined) payload.cta_url = data.cta_url?.trim() || null;
  if (data.is_active !== undefined) payload.is_active = data.is_active;
  if (data.scheduled_at !== undefined) {
    payload.scheduled_at = data.scheduled_at && data.scheduled_at.trim() ? new Date(data.scheduled_at).toISOString() : null;
  }
  if (data.expires_at !== undefined) {
    payload.expires_at = data.expires_at && data.expires_at.trim() ? new Date(data.expires_at).toISOString() : null;
  }

  const { error } = await adminClient
    .from("dashboard_content" as any)
    .update(payload)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/content");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteContent(id: string) {
  await requirePermission("manage_content");
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("dashboard_content")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/content");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleContentActive(id: string, is_active: boolean) {
  return updateContent(id, { is_active });
}

export async function getActiveContentBanners(): Promise<any[]> {
  const adminClient = await createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await adminClient
    .from("dashboard_content" as any)
    .select("*")
    .eq("is_active", true)
    .in("type", ["banner", "announcement", "event", "tip"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getActiveContentBanners] Error:", error);
    return [];
  }

  const valid = ((data as any[]) || []).filter((item: any) => {
    if (item.scheduled_at && new Date(item.scheduled_at).getTime() > Date.now()) return false;
    if (item.expires_at && new Date(item.expires_at).getTime() < Date.now()) return false;
    return true;
  });

  return valid;
}
