"use server";

import { createClient } from "@/lib/supabase/server";
import { formatPhoneE164 } from "@/lib/phone";
import { sendAlertEmail } from "@/lib/email";
import twilio from "twilio";

export async function addReminder(
  userId: string,
  title: string,
  dueDate: string | Date,
  entityType: "scholarship" | "college" | "task",
  entityId?: string
) {
  const supabase = await createClient();

  // Find the masterId (if linked)
  const { data: profile } = await supabase.from("profiles").select("linked_student_id").eq("id", userId).single();
  const masterId = profile?.linked_student_id || userId;

  const { error } = await supabase.from("reminders").insert({
    user_id: masterId,
    title,
    due_date: new Date(dueDate).toISOString(),
    entity_type: entityType,
    entity_id: entityId || null
  });

  if (error) {
    console.error("addReminder error:", error);
    return { success: false, error: error.message };
  }

  // Fetch the master profile to get emails and phones for instant alert
  const { data: profileDetails } = await supabase.from("profiles").select("*").eq("id", masterId).single();
  
  if (profileDetails) {
    const deadlineStr = new Date(dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const msgHtml = `<p>Hi there,</p><p>You just committed to <strong>${title}</strong>!</p><p>The deadline is <strong>${deadlineStr}</strong>. We've added this to your Schoolari tracker and will send you reminders as the deadline approaches.</p><p>Good luck!</p>`;
    const smsText = `Schoolari Alert: You committed to "${title}". Deadline: ${deadlineStr}. We'll remind you when it's close! \n\nReply STOP to unsubscribe.`;

    const details = profileDetails as any;
    const emails = [details.student_email, details.parent_email, details.email].filter(Boolean);
    const phones = [details.student_phone, details.parent_phone, details.phone].filter(Boolean);

    // Send emails (unique)
    const uniqueEmails = Array.from(new Set(emails));
    for (const email of uniqueEmails) {
      await sendAlertEmail(email as string, "Schoolari: Deadline Tracked", msgHtml);
    }

    // Send SMS via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    if (accountSid && authToken && twilioPhone) {
      const client = twilio(accountSid, authToken);
      const uniquePhones = Array.from(new Set(phones));
      for (const phone of uniquePhones) {
        const e164 = formatPhoneE164(phone as string);
        if (e164) {
          try {
            await client.messages.create({ body: smsText, from: twilioPhone, to: e164 });
          } catch(e) { console.error("Twilio err on addReminder", e); }
        }
      }
    }
  }

  return { success: true };
}
