import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

let supabaseAdmin: any = null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials for Admin");
    }
    supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabaseAdmin;
}

/**
 * Mirror Stripe billing fields bi-directionally between the parent and
 * the linked student profile so both profiles stay in sync.
 */
export async function mirrorStripeSubscription(
  payerProfileId: string,
  stripeFields: Record<string, any>
) {
  const adminClient = getSupabaseAdmin();

  const { data: payer } = await adminClient
    .from("profiles")
    .select("account_type, linked_student_id")
    .eq("id", payerProfileId)
    .maybeSingle();

  if (!payer) return;

  if (payer.account_type === "parent") {
    // 1. Parent Paid -> Mirror to Student
    let studentId = payer.linked_student_id;

    // Fallback: find student by parent_email
    if (!studentId) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(payerProfileId);
      if (authUser?.user?.email) {
        const { data: linkedStudent } = await adminClient
          .from("profiles")
          .select("id")
          .eq("parent_email", authUser.user.email)
          .maybeSingle();

        if (linkedStudent) {
          studentId = linkedStudent.id;
          // Heal the parent's linked_student_id
          await adminClient
            .from("profiles")
            .update({ linked_student_id: studentId })
            .eq("id", payerProfileId);
        }
      }
    }

    if (studentId) {
      await adminClient
        .from("profiles")
        .update(stripeFields)
        .eq("id", studentId);
    }
  } else if (payer.account_type === "student") {
    // 2. Student Paid -> Mirror to Parent
    // Find parent by linked_student_id
    const { data: parentByLink } = await adminClient
      .from("profiles")
      .select("id")
      .eq("linked_student_id", payerProfileId)
      .maybeSingle();

    if (parentByLink) {
      await adminClient
        .from("profiles")
        .update(stripeFields)
        .eq("id", parentByLink.id);
    } else {
      // Fallback: find parent by student_email
      const { data: authUser } = await adminClient.auth.admin.getUserById(payerProfileId);
      if (authUser?.user?.email) {
        const { data: parentByEmail } = await adminClient
          .from("profiles")
          .select("id")
          .eq("student_email", authUser.user.email)
          .maybeSingle();

        if (parentByEmail) {
          await adminClient
            .from("profiles")
            .update(stripeFields)
            .eq("id", parentByEmail.id);

          // Heal the parent's linked_student_id
          await adminClient
            .from("profiles")
            .update({ linked_student_id: payerProfileId })
            .eq("id", parentByEmail.id);
        }
      }
    }
  }
}
