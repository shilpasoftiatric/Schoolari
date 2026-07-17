"use server";

import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/server";
import { formatPhoneE164 } from "@/lib/phone";

export async function sendAdminSms(toPhone: string, message: string) {
  try {
    const supabase = await createAdminClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Unauthorized. You must be logged in." };
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    if (roleData?.role !== "admin") {
      return { error: "Unauthorized. Admin privileges required." };
    }

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
