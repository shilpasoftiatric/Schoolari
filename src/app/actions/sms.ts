"use server";

import twilio from "twilio";
import { verifyAdmin } from "@/app/actions/admin";
import { formatPhoneE164 } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/server";

export async function sendAdminSms(toPhone: string, message: string) {
  try {
    await verifyAdmin();

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      return { error: "Twilio credentials are not configured properly on the server." };
    }

    const e164Phone = formatPhoneE164(toPhone);
    if (!e164Phone) {
      return { error: "Invalid phone number provided." };
    }

    const client = twilio(accountSid, authToken);

    const finalMessage = message.includes("Reply STOP")
      ? message
      : `${message}\n\nReply STOP to unsubscribe.`;

    const twilioRes = await client.messages.create({
      body: finalMessage,
      from: twilioPhone,
      to: e164Phone,
    });

    return { success: true, messageId: twilioRes.sid };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to send SMS";
    console.error("[sendAdminSms] Error:", error);
    return { error: errorMsg };
  }
}

export async function sendReferralSms(
  referralId: string,
  referralPhone: string,
  referralFirstName: string,
  senderFirstName: string
) {
  const accountSid = process.env.SCHOOLARI_TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.SCHOOLARI_TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.SCHOOLARI_TWILIO_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || (!fromPhone && !messagingServiceSid)) {
    console.warn("[sendReferralSms] Twilio credentials are not configured yet. Skipping SMS dispatch.");
    return { success: false, reason: "NOT_CONFIGURED" };
  }

  const resolvedReferralName = referralFirstName?.trim() || "a friend";
  const resolvedSenderName = senderFirstName?.trim() || "a friend";

  const messageBody = `Hi ${resolvedReferralName} — ${resolvedSenderName} thought you'd love Schoolari, an AI platform helping high school students find scholarships and prepare for college. Check it out at schoolari.com\n\nReply STOP to unsubscribe.`;

  const supabaseAdmin = await createAdminClient();

  try {
    const e164Phone = formatPhoneE164(referralPhone);
    if (!e164Phone) throw new Error("Invalid phone number");

    const client = twilio(accountSid, authToken);
    const twilioMsg = await client.messages.create({
      body: messageBody,
      messagingServiceSid: messagingServiceSid || undefined,
      from: !messagingServiceSid ? fromPhone : undefined,
      to: e164Phone,
    });

    console.log(
      `[sendReferralSms] Twilio accepted SMS (SID: ${twilioMsg.sid}, status: ${twilioMsg.status}) for referralId: ${referralId}`
    );

    await supabaseAdmin
      .from("referrals")
      .update({
        sms_status: "Yes",
        sms_sent_at: new Date().toISOString(),
      })
      .eq("id", referralId);

    return { success: true, messageId: twilioMsg.sid };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send SMS";
    console.error("[sendReferralSms] Failed:", errorMsg);
    await supabaseAdmin
      .from("referrals")
      .update({
        sms_status: "Failed",
      })
      .eq("id", referralId);

    return { success: false, error: errorMsg };
  }
}

