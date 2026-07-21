"use server";

import twilio from "twilio";
import { verifyAdmin } from "@/app/actions/admin";
import { formatPhoneE164 } from "@/lib/phone";

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
  } catch (error: any) {
    console.error("[sendAdminSms] Error:", error);
    return { error: error.message || "Failed to send SMS" };
  }
}
