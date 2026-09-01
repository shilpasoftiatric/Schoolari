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

  const dueDateTime = new Date(dueDate).getTime();
  const isPast = !isNaN(dueDateTime) && dueDateTime < Date.now();

  // Check if an unreminded reminder already exists for this entity to prevent duplicates
  let existingQuery = supabase
    .from("reminders")
    .select("id, due_date")
    .eq("user_id", masterId)
    .eq("entity_type", entityType)
    .is("reminded_at", null);

  if (entityId) {
    existingQuery = existingQuery.eq("entity_id", entityId);
  } else {
    existingQuery = existingQuery.eq("title", title);
  }

  const { data: existingReminders } = await existingQuery;
  const existingReminder = existingReminders && existingReminders.length > 0 ? existingReminders[0] : null;

  if (existingReminder) {
    // If it already exists, update the due date/title instead of creating a duplicate row
    await supabase
      .from("reminders")
      .update({
        title,
        due_date: new Date(dueDate).toISOString(),
        reminded_at: isPast ? new Date().toISOString() : null
      })
      .eq("id", existingReminder.id);

    // Clean up any extra duplicates if multiple existed
    if (existingReminders && existingReminders.length > 1) {
      const extraIds = existingReminders.slice(1).map((r) => r.id);
      await supabase.from("reminders").delete().in("id", extraIds);
    }

    return { success: true };
  }

  const { error } = await supabase.from("reminders").insert({
    user_id: masterId,
    title,
    due_date: new Date(dueDate).toISOString(),
    entity_type: entityType,
    entity_id: entityId || null,
    reminded_at: isPast ? new Date().toISOString() : null
  });

  if (error) {
    console.error("addReminder error:", error);
    return { success: false, error: error.message };
  }

  // If deadline has already passed, skip sending reminder alerts
  if (isPast) {
    return { success: true };
  }

  // Fetch the master profile to get emails and phones for instant alert
  const { data: profileDetails } = await supabase.from("profiles").select("*").eq("id", masterId).single();
  
  if (profileDetails) {
    const deadlineStr = new Date(dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const msgHtml = `<p>Hi there,</p><p>You just committed to <strong>${title}</strong>!</p><p>The deadline is <strong>${deadlineStr}</strong>. We've added this to your Schoolari tracker and will send you reminders as the deadline approaches.</p><p>Good luck!</p>`;
    const smsText = `Schoolari Alert: You committed to "${title}". Deadline: ${deadlineStr}. We'll remind you when it's close! \n\nReply STOP to unsubscribe.`;

    const details = profileDetails as any;
    const rawEmails = [details.student_email, details.parent_email, details.email].filter(Boolean) as string[];
    const uniqueEmails = Array.from(new Set(rawEmails.map(e => e.trim().toLowerCase())));

    const rawPhones = [details.student_phone, details.parent_phone, details.phone].filter(Boolean) as string[];
    const uniquePhones = Array.from(new Set(rawPhones.map(p => formatPhoneE164(p)).filter(Boolean) as string[]));

    // Send emails (unique)
    for (const email of uniqueEmails) {
      try {
        await sendAlertEmail(email, "Schoolari: Deadline Tracked", msgHtml);
      } catch (err) {
        console.error("Error sending tracked alert email:", err);
      }
    }

    // Send SMS via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    if (accountSid && authToken && twilioPhone) {
      const client = twilio(accountSid, authToken);
      for (const phone of uniquePhones) {
        try {
          await client.messages.create({ body: smsText, from: twilioPhone, to: phone });
        } catch(e) { console.error("Twilio err on addReminder", e); }
      }
    }
  }

  return { success: true };
}
