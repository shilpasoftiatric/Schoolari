"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Detect if AWS credentials are configured
const hasAWSCredentials = () =>
  !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION &&
    process.env.AWS_S3_BUCKET_NAME
  );

async function uploadToS3(buffer: Buffer, filePath: string, contentType: string): Promise<string> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  const key = `vault/${filePath}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function uploadDocumentAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  if (file.size > 10 * 1024 * 1024) throw new Error("File too large. Maximum is 10MB.");

  type DocumentType = "resume" | "transcript" | "report_card" | "recommendation_letter" | "essay" | "certificate" | "award" | "other";
  const requestedType = formData.get("type") as string;
  let type: DocumentType = (requestedType as DocumentType) || "other";
  if (!requestedType) {
    const nameLower = file.name.toLowerCase();
    if (nameLower.includes("transcript")) type = "transcript";
    else if (nameLower.includes("resume")) type = "resume";
    else if (nameLower.includes("certificate")) type = "certificate";
    else if (nameLower.includes("award")) type = "award";
    else if (nameLower.includes("report")) type = "report_card";
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let publicUrl: string;
  let storageProvider: "s3" | "supabase";

  if (hasAWSCredentials()) {
    // ✅ Upload to AWS S3
    publicUrl = await uploadToS3(buffer, filePath, file.type);
    storageProvider = "s3";
  } else {
    // 🔄 Fallback: Supabase vault bucket
    const adminClient = await createAdminClient();
    const { data: buckets } = await adminClient.storage.listBuckets();
    if (!buckets?.find((b) => b.name === "vault")) {
      await adminClient.storage.createBucket("vault", { public: true });
    }
    const { error: uploadError } = await adminClient.storage
      .from("vault")
      .upload(filePath, buffer, { contentType: file.type, upsert: true });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
    const { data: { publicUrl: supaUrl } } = adminClient.storage.from("vault").getPublicUrl(filePath);
    publicUrl = supaUrl;
    storageProvider = "supabase";
  }

  const adminClient = await createAdminClient();
  const { data: insertedData, error: dbError } = await adminClient.from("documents").insert([
    { user_id: user.id, name: file.name, type, file_url: publicUrl, size_bytes: file.size },
  ]).select().single();

  if (dbError) {
    throw new Error(`Database insert failed: ${dbError.message}`);
  }

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return { success: true, storage: storageProvider, document: insertedData };
}

export async function deleteDocument(id: string, fileUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const adminClient = await createAdminClient();

  if (hasAWSCredentials() && fileUrl.includes(".amazonaws.com/")) {
    // Delete from S3
    try {
      const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const s3 = new S3Client({
        region: process.env.AWS_REGION!,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      const url = new URL(fileUrl);
      const key = url.pathname.slice(1);
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME!, Key: key }));
    } catch (err) {
      console.error("Warning: Failed to delete file from S3", err);
    }
  } else {
    // Delete from Supabase vault
    const vaultIndex = fileUrl.indexOf("/vault/");
    if (vaultIndex !== -1) {
      const filePath = fileUrl.substring(vaultIndex + 7);
      const { error: storageError } = await adminClient.storage.from("vault").remove([filePath]);
      if (storageError) {
        console.error("Warning: Failed to delete physical file from storage", storageError);
      }
    }
  }

  const { error: dbError } = await adminClient
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (dbError) throw new Error(dbError.message);

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function renameDocumentAction(id: string, newName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Document name cannot be empty");

  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from("documents")
    .update({ name: trimmed })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to rename document: ${error.message}`);

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return { success: true, name: trimmed };
}

export async function replaceDocumentAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const docId = formData.get("id") as string;
  const existingFileUrl = formData.get("existingFileUrl") as string;
  const file = formData.get("file") as File;

  if (!docId) throw new Error("Missing document ID");
  if (!file || file.size === 0) throw new Error("No replacement file provided");
  if (file.size > 10 * 1024 * 1024) throw new Error("File too large. Maximum is 10MB.");

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let publicUrl: string;
  let storageProvider: "s3" | "supabase";

  const adminClient = await createAdminClient();

  if (hasAWSCredentials()) {
    publicUrl = await uploadToS3(buffer, filePath, file.type);
    storageProvider = "s3";
  } else {
    const { data: buckets } = await adminClient.storage.listBuckets();
    if (!buckets?.find((b) => b.name === "vault")) {
      await adminClient.storage.createBucket("vault", { public: true });
    }
    const { error: uploadError } = await adminClient.storage
      .from("vault")
      .upload(filePath, buffer, { contentType: file.type, upsert: true });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
    const { data: { publicUrl: supaUrl } } = adminClient.storage.from("vault").getPublicUrl(filePath);
    publicUrl = supaUrl;
    storageProvider = "supabase";
  }

  // Remove old file from storage if existing
  if (existingFileUrl) {
    try {
      if (hasAWSCredentials() && existingFileUrl.includes(".amazonaws.com/")) {
        const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
        const s3 = new S3Client({
          region: process.env.AWS_REGION!,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          },
        });
        const url = new URL(existingFileUrl);
        const key = url.pathname.slice(1);
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME!, Key: key }));
      } else {
        const vaultIndex = existingFileUrl.indexOf("/vault/");
        if (vaultIndex !== -1) {
          const oldPath = existingFileUrl.substring(vaultIndex + 7);
          await adminClient.storage.from("vault").remove([oldPath]);
        }
      }
    } catch (cleanErr) {
      console.warn("Could not remove old replacement file from storage:", cleanErr);
    }
  }

  // Update document record in database
  const { data: updatedDoc, error: dbError } = await adminClient
    .from("documents")
    .update({
      file_url: publicUrl,
      size_bytes: file.size,
    })
    .eq("id", docId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (dbError) throw new Error(`Database update failed: ${dbError.message}`);

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return { success: true, storage: storageProvider, document: updatedDoc };
}
