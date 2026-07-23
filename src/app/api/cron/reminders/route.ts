import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import twilio from "twilio";
import { formatPhoneE164 } from "@/lib/phone";
import { sendAlertEmail } from "@/lib/email";

/**
 * GET /api/cron/reminders
 * 
 * Vercel Cron Job endpoint to send SMS reminders to users who have not completed onboarding.
 * Triggered periodically (e.g. daily) based on vercel.json configuration.
 */
export async function GET(req: Request) {
  try {
    // 1. Verify cron secret (if set in env)
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createAdminClient();

    // 2. Fetch profiles that haven't finished onboarding but have a student phone
    // Note: To prevent spamming every day, ideally we'd add a 'last_reminded_at' column to profiles.
    // For this MVP, we just find all incomplete profiles.
    const { data: incompleteProfiles, error } = await supabase
      .from("profiles")
      .select("id, student_first_name, student_phone, created_at")
      .eq("onboarding_complete", false)
      .not("student_phone", "is", null);

    if (error) {
      throw new Error(`Failed to fetch profiles: ${error.message}`);
    }

    if (!incompleteProfiles || incompleteProfiles.length === 0) {
      return NextResponse.json({ success: true, message: "No reminders to send." });
    }

    // 3. Send SMS via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error("Twilio credentials are not configured properly.");
    }

    const client = twilio(accountSid, authToken);
    let sentCount = 0;
    let failCount = 0;

    for (const profile of incompleteProfiles) {
      try {
        const phone = formatPhoneE164(profile.student_phone);
        if (!phone) continue;

        // Skip if created within the last 24 hours to give them time to finish
        const createdDate = new Date(profile.created_at);
        const hoursSinceCreation = (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation < 24) continue;

        await client.messages.create({
          body: `Hi ${profile.student_first_name || "Student"}, a quick reminder from Schoolari! Please log in to complete your onboarding profile so we can start finding your scholarships. Reply STOP to unsubscribe.`,
          from: twilioPhone,
          to: phone,
        });

        sentCount++;
      } catch (smsError) {
        console.error(`Failed to send reminder to ${profile.id}:`, smsError);
        failCount++;
      }
    }

    // 4. Fetch upcoming deadlines (due in the next 3 days) that haven't been reminded
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: upcomingReminders, error: remindersError } = await supabase
      .from("reminders")
      .select("*, profiles(*)")
      .is("reminded_at", null)
      .lte("due_date", threeDaysFromNow.toISOString());

    if (!remindersError && upcomingReminders) {
      for (const reminder of upcomingReminders) {
        const profile = reminder.profiles;
        if (!profile) continue;

        const deadlineStr = new Date(reminder.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const title = reminder.title;
        const msgText = `Schoolari Reminder: Your deadline for "${title}" is coming up on ${deadlineStr}. Don't forget to submit! \n\nReply STOP to unsubscribe.`;
        const msgHtml = `<p>Hi there,</p><p>This is a quick reminder that your deadline for <strong>${title}</strong> is approaching on <strong>${deadlineStr}</strong>.</p><p>Good luck!</p>`;

        // Try SMS
        const phones = [profile.student_phone, profile.parent_phone, profile.phone].filter(Boolean);
        const uniquePhones = Array.from(new Set(phones));
        for (const phone of uniquePhones) {
          const e164 = formatPhoneE164(phone as string);
          if (e164) {
            try {
              await client.messages.create({ body: msgText, from: twilioPhone, to: e164 });
              sentCount++;
            } catch (e) { failCount++; }
          }
        }

        // Try Email
        const emails = [profile.student_email, profile.parent_email, profile.email].filter(Boolean);
        const uniqueEmails = Array.from(new Set(emails));
        for (const email of uniqueEmails) {
          await sendAlertEmail(email as string, `Reminder: Deadline approaching for ${title}`, msgHtml);
        }

        // Mark as reminded
        await supabase.from("reminders").update({ reminded_at: new Date().toISOString() }).eq("id", reminder.id);
      }
    }

    // 5. Earn While You Learn 7-Day Inactivity Reminder
    const { data: videoProgress, error: videoError } = await supabase
      .from("student_video_progress")
      .select("user_id, last_watched_at")
      .order("last_watched_at", { ascending: false });

    if (!videoError && videoProgress) {
      // Group by user to find their most recent watch time
      const userLastWatched = new Map<string, string>();
      for (const p of videoProgress) {
        if (!userLastWatched.has(p.user_id)) {
          userLastWatched.set(p.user_id, p.last_watched_at);
        }
      }

      // Check for exactly 7 days of inactivity (between 7 and 8 days)
      const now = new Date().getTime();
      for (const [userId, lastWatched] of userLastWatched.entries()) {
        const daysSince = (now - new Date(lastWatched).getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSince >= 7 && daysSince < 8) {
          // Fetch profile to get contact info
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
          if (profile) {
            const msgText = `Schoolari: It's been a week since your last Earn While You Learn video! Check out the next video in your path and unlock more income opportunities. Reply STOP to unsubscribe.`;
            const msgHtml = `<p>Hi ${profile.student_first_name || 'there'},</p><p>It's been a week since your last <strong>Earn While You Learn</strong> video! Check out the next video in your path and unlock more income opportunities.</p><p>Log in to your Dashboard to continue.</p>`;

            // Try SMS
            const phones = [profile.student_phone, profile.parent_phone, profile.phone].filter(Boolean);
            const uniquePhones = Array.from(new Set(phones));
            for (const phone of uniquePhones) {
              const e164 = formatPhoneE164(phone as string);
              if (e164) {
                try {
                  await client.messages.create({ body: msgText, from: twilioPhone, to: e164 });
                  sentCount++;
                } catch (e) { failCount++; }
              }
            }

            // Try Email
            const emails = [profile.student_email, profile.parent_email, profile.email].filter(Boolean);
            const uniqueEmails = Array.from(new Set(emails));
            for (const email of uniqueEmails) {
              await sendAlertEmail(email as string, `Ready for your next video?`, msgHtml);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failCount
    });

  } catch (err: any) {
    console.error("[cron/reminders]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
