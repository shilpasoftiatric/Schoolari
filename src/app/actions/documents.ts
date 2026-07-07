"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function uploadDocumentAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const adminClient = await createAdminClient();

  // 1. Ensure the 'vault' bucket exists (so the user doesn't have to create it manually!)
  const { data: buckets } = await adminClient.storage.listBuckets();
  if (!buckets?.find(b => b.name === "vault")) {
    await adminClient.storage.createBucket("vault", { public: true });
  }

  // 2. Upload file to Storage using the Admin Client (bypasses RLS so no policies needed)
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await adminClient.storage
    .from("vault")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // 3. Get the public URL
  const { data: { publicUrl } } = adminClient.storage
    .from("vault")
    .getPublicUrl(filePath);

  // 4. Auto-detect category
  let type = "other";
  const nameLower = file.name.toLowerCase();
  if (nameLower.includes("transcript")) type = "transcript";
  else if (nameLower.includes("resume")) type = "resume";
  else if (nameLower.includes("certificate")) type = "certificate";
  else if (nameLower.includes("award")) type = "award";
  else if (nameLower.includes("report")) type = "report_card";

  // 5. Save metadata to the database
  const { error: dbError } = await adminClient
    .from("documents")
    .insert([
      {
        user_id: user.id,
        name: file.name,
        type: type,
        file_url: publicUrl,
        size_bytes: file.size,
      }
    ]);

  if (dbError) {
    // Cleanup physical file if db insert fails
    await adminClient.storage.from("vault").remove([filePath]);
    throw new Error(`Database insert failed: ${dbError.message}`);
  }

  revalidatePath("/documents");
  return { success: true };
}

export async function deleteDocument(id: string, fileUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const adminClient = await createAdminClient();

  // 1. Delete physical file from Storage bucket "vault"
  const vaultIndex = fileUrl.indexOf("/vault/");
  if (vaultIndex !== -1) {
    const filePath = fileUrl.substring(vaultIndex + 7);
    
    const { error: storageError } = await adminClient.storage
      .from("vault")
      .remove([filePath]);
      
    if (storageError) {
      console.error("Warning: Failed to delete physical file from storage", storageError);
    }
  }

  // 2. Delete metadata row from database
  const { error: dbError } = await adminClient
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id); 

  if (dbError) {
    throw new Error(dbError.message);
  }

  revalidatePath("/documents");
  return { success: true };
}
