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
  cta_label?: string;
  cta_url?: string;
  scheduled_at?: string;
  expires_at?: string;
  is_active?: boolean;
}) {
  await requirePermission("manage_content");
  const adminClient = await createAdminClient();

  const { error } = await adminClient.from("dashboard_content").insert({
    ...data,
    is_active: data.is_active ?? true,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/content");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateContent(id: string, data: Partial<{
  title: string;
  body: string;
  cta_label: string;
  cta_url: string;
  is_active: boolean;
  scheduled_at: string;
  expires_at: string;
}>) {
  await requirePermission("manage_content");
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("dashboard_content")
    .update(data)
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
