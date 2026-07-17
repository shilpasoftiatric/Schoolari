import { NextResponse } from "next/server";
import { formatPhoneE164 } from "@/lib/phone";

/**
 * POST /api/notify/welcome
 *
 * Sends welcome notifications to parent and student after Card 1 of onboarding.
 * - Twilio SMS: Sends to both parties with opt-in language
 * - Constant Contact: Adds to "Schoolari Parents" and "Schoolari Students" lists
 * - Account Invitation: Creates a linked account invitation record
 *
 * Both integrations are gracefully disabled if API keys are absent.
 * The endpoint always returns 200 OK so it never blocks the onboarding flow.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { sendInviteEmail } from "@/lib/email";

const hasTwilio = () =>
  !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);

const hasConstantContact = () =>
  !!(process.env.CONSTANT_CONTACT_API_KEY && process.env.CONSTANT_CONTACT_ACCESS_TOKEN);

async function sendTwilioSMS(to: string, message: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const body = new URLSearchParams({
    To: to,
    From: process.env.TWILIO_PHONE_NUMBER!,
    Body: message,
  });
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Twilio error: ${err.message}`);
  }
}

import { syncContact } from "@/lib/constant-contact";


export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      student_first_name, student_last_name, student_email, student_phone,
      parent_first_name, parent_last_name, parent_email, parent_phone,
      account_type, // "student" or "parent"
    } = body;

    const results: Record<string, string> = {};

    // ── 1. Twilio SMS ────────────────────────────────────────────────────────
    if (hasTwilio()) {
      const studentMsg =
        `Welcome to Schoolari, ${student_first_name}! 🎓 Your account is active. ` +
        `Sign in at members.schoolari.com to complete your profile. ` +
        `Reply STOP to unsubscribe from text messages.`;
      const parentMsg =
        `Hi ${parent_first_name}, welcome to Schoolari! Your student ${student_first_name} is now enrolled. ` +
        `Log in at members.schoolari.com to track their scholarship journey. ` +
        `Reply STOP to unsubscribe from text messages.`;

      try {
        const studentPhoneE164 = formatPhoneE164(student_phone);
        if (studentPhoneE164) await sendTwilioSMS(studentPhoneE164, studentMsg);
        results.student_sms = "sent";
      } catch (err: any) {
        results.student_sms = `failed: ${err.message}`;
      }

      try {
        const parentPhoneE164 = formatPhoneE164(parent_phone);
        if (parentPhoneE164) await sendTwilioSMS(parentPhoneE164, parentMsg);
        results.parent_sms = "sent";
      } catch (err: any) {
        results.parent_sms = `failed: ${err.message}`;
      }
    } else {
      results.twilio = "skipped - no credentials";
    }

    // ── 2. Constant Contact ──────────────────────────────────────────────────
    if (hasConstantContact()) {
      const parentsListId = process.env.CONSTANT_CONTACT_PARENTS_LIST_ID || "";
      const studentsListId = process.env.CONSTANT_CONTACT_STUDENTS_LIST_ID || "";

      try {
        if (parent_email && parentsListId) {
          await syncContact(parent_email, parent_first_name, parent_last_name, parentsListId);
        }
        results.cc_parent = "added";
      } catch (err: any) {
        results.cc_parent = `failed: ${err.message}`;
      }

      try {
        if (student_email && studentsListId) {
          await syncContact(student_email, student_first_name, student_last_name, studentsListId);
        }
        results.cc_student = "added";
      } catch (err: any) {
        results.cc_student = `failed: ${err.message}`;
      }
    } else {
      results.constant_contact = "skipped - no credentials";
    }

    // ── 3. Account Invitation ────────────────────────────────────────────────
    const adminClient = await createAdminClient();
    const inviteeRole = account_type === "parent" ? "student" : "parent";
    const inviteeEmail = account_type === "parent" ? student_email : parent_email;
    const inviteeFirstName = account_type === "parent" ? student_first_name : parent_first_name;
    const inviterFirstName = account_type === "parent" ? parent_first_name : student_first_name;

    if (inviteeEmail) {
      try {
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.generateLink({
          type: "invite",
          email: inviteeEmail,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/update-password`,
            data: {
              linked_student_id: user.id,
              account_type: inviteeRole,
            }
          }
        });

        if (inviteError) throw inviteError;

        if (inviteData?.properties?.action_link) {
          const emailRes = await sendInviteEmail(
            inviteeEmail,
            inviteeFirstName || "there",
            inviterFirstName || "A family member",
            inviteData.properties.action_link,
            inviteeRole as "student" | "parent"
          );
          if (!emailRes.success) throw new Error(emailRes.error);
          results.invitation = "sent via email";
        }
      } catch (err: any) {
        results.invitation = `failed: ${err.message}`;
        console.error("Invite Error:", err);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("[notify/welcome]", error);
    // Always return 200 so onboarding never blocks
    return NextResponse.json({ success: false, error: error.message });
  }
}
