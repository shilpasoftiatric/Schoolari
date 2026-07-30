"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCoachingMessages() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("coaching_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function markMessageAsRead(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("coaching_messages")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/coaching");
  return { success: true };
}

export async function sendStudentMessage(content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // A student sending a message to their coach/admin
  // type='guidance' (to pass check constraint), prefix title with [STUDENT]
  // is_read=false (so admin sees it)
  const { error } = await supabase
    .from("coaching_messages")
    .insert({
      user_id: user.id,
      title: "[STUDENT] Message from Student",
      content,
      type: "guidance",
      is_read: false
    });

  if (error) throw new Error(error.message);

  revalidatePath("/messages");
  return { success: true };
}
