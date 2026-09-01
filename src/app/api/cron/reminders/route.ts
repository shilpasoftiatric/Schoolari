import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import twilio from "twilio";
import { formatPhoneE164 } from "@/lib/phone";
import { 
  sendAlertEmail, 
  sendTrialDay5ReminderEmail, 
  sendTrialDay7ConvertedEmail 
} from "@/lib/email";

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

    // 4. Fetch upcoming deadlines (due in the next 3 days, strictly in the future) that haven't been reminded
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Expire any past unreminded reminders so old deadlines never trigger notifications
    await supabase
      .from("reminders")
      .update({ reminded_at: now.toISOString() })
      .is("reminded_at", null)
      .lt("due_date", now.toISOString());

    const { data: upcomingReminders, error: remindersError } = await supabase
      .from("reminders")
      .select("*, profiles(*)")
      .is("reminded_at", null)
      .gte("due_date", now.toISOString())
      .lte("due_date", threeDaysFromNow.toISOString());

    if (!remindersError && upcomingReminders && upcomingReminders.length > 0) {
      // Group reminders by user and entity to avoid sending duplicates if duplicate records exist in the database
      const reminderGroups = new Map<string, typeof upcomingReminders>();
      for (const rem of upcomingReminders) {
        const itemKey = `${rem.user_id}_${rem.entity_type || "task"}_${rem.entity_id || rem.title}`;
        if (!reminderGroups.has(itemKey)) {
          reminderGroups.set(itemKey, []);
        }
        reminderGroups.get(itemKey)!.push(rem);
      }

      for (const [_, group] of reminderGroups.entries()) {
        const reminder = group[0];
        const allIds = group.map((r) => r.id);
        const profile = reminder.profiles;
        if (!profile) {
          await supabase.from("reminders").update({ reminded_at: now.toISOString() }).in("id", allIds);
          continue;
        }

        // Skip if deadline has already passed
        const dueDate = new Date(reminder.due_date);
        if (dueDate.getTime() < now.getTime()) {
          await supabase.from("reminders").update({ reminded_at: now.toISOString() }).in("id", allIds);
          continue;
        }

        const deadlineStr = dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const title = reminder.title;
        const msgText = `Schoolari Reminder: Your deadline for "${title}" is coming up on ${deadlineStr}. Don't forget to submit! \n\nReply STOP to unsubscribe.`;
        const msgHtml = `<p>Hi there,</p><p>This is a quick reminder that your deadline for <strong>${title}</strong> is approaching on <strong>${deadlineStr}</strong>.</p><p>Good luck!</p>`;

        // Try SMS (unique formatted phone numbers)
        const pAny = profile as any;
        const rawPhones = [pAny?.student_phone, pAny?.parent_phone, pAny?.phone].filter(Boolean) as string[];
        const uniquePhones = Array.from(new Set(rawPhones.map((p) => formatPhoneE164(p)).filter(Boolean) as string[]));
        for (const phone of uniquePhones) {
          try {
            await client.messages.create({ body: msgText, from: twilioPhone, to: phone });
            sentCount++;
          } catch (e) { failCount++; }
        }

        // Try Email (unique normalized email addresses)
        const rawEmails = [pAny?.student_email, pAny?.parent_email, pAny?.email].filter(Boolean) as string[];
        const uniqueEmails = Array.from(new Set(rawEmails.map((e) => e.trim().toLowerCase())));
        for (const email of uniqueEmails) {
          try {
            await sendAlertEmail(email, `Reminder: Deadline approaching for ${title}`, msgHtml);
          } catch (e) {
            console.error(`Failed to send reminder email to ${email}:`, e);
          }
        }

        // Mark ALL grouped duplicate reminder rows as reminded so none re-fire
        await supabase.from("reminders").update({ reminded_at: now.toISOString() }).in("id", allIds);
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
      const nowMs = new Date().getTime();
      for (const [userId, lastWatched] of userLastWatched.entries()) {
        const daysSince = (nowMs - new Date(lastWatched).getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSince >= 7 && daysSince < 8) {
          // Fetch profile to get contact info
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
          if (profile) {
            const pAny = profile as any;
            const msgText = `Schoolari: It's been a week since your last Earn While You Learn video! Check out the next video in your path and unlock more income opportunities. Reply STOP to unsubscribe.`;
            const msgHtml = `<p>Hi ${pAny?.student_first_name || 'there'},</p><p>It's been a week since your last <strong>Earn While You Learn</strong> video! Check out the next video in your path and unlock more income opportunities.</p><p>Log in to your Dashboard to continue.</p>`;

            // Try SMS
            const rawPhones = [pAny?.student_phone, pAny?.parent_phone, pAny?.phone].filter(Boolean) as string[];
            const uniquePhones = Array.from(new Set(rawPhones.map((p) => formatPhoneE164(p)).filter(Boolean) as string[]));
            for (const phone of uniquePhones) {
              try {
                await client.messages.create({ body: msgText, from: twilioPhone, to: phone });
                sentCount++;
              } catch (e) { failCount++; }
            }

            // Try Email
            const rawEmails = [pAny?.student_email, pAny?.parent_email, pAny?.email].filter(Boolean) as string[];
            const uniqueEmails = Array.from(new Set(rawEmails.map((e) => e.trim().toLowerCase())));
            for (const email of uniqueEmails) {
              try {
                await sendAlertEmail(email, `Ready for your next video?`, msgHtml);
              } catch (e) {
                console.error(`Failed to send inactivity email to ${email}:`, e);
              }
            }
          }
        }
      }
    }
    // 6. Trial Reminders (Day 5 & Day 7 — SMS + Google Workspace Email)
    const { data: trialProfiles, error: trialError } = await supabase
      .from("profiles")
      .select("id, student_first_name, parent_first_name, student_last_name, parent_last_name, student_email, parent_email, student_phone, parent_phone, subscription_status, trial_start_date, trial_day5_sms_sent, trial_day7_sms_sent, trial_day5_email_sent, trial_day7_email_sent, trial_cancelled_email_sent")
      .not("trial_start_date", "is", null);

    if (!trialError && trialProfiles) {
      const nowMs = new Date().getTime();
      // Track emails and phones already notified in this execution batch to avoid duplicates across linked/shared accounts
      const sentDay5EmailsThisRun = new Set<string>();
      const sentDay5PhonesThisRun = new Set<string>();
      const sentDay7EmailsThisRun = new Set<string>();
      const sentDay7PhonesThisRun = new Set<string>();

      for (const profile of trialProfiles) {
        if (!profile.trial_start_date) continue;
        
        // Compute precise days since trial started
        const daysSinceStart = (nowMs - new Date(profile.trial_start_date).getTime()) / (1000 * 60 * 60 * 24);
        const name = profile.student_first_name || profile.parent_first_name || "Student";
        
        const rawPhones = [profile.student_phone, profile.parent_phone].filter(Boolean) as string[];
        const uniquePhones = Array.from(new Set(rawPhones.map((p) => formatPhoneE164(p)).filter(Boolean) as string[]));

        const pAny = profile as any;
        const rawEmails = [pAny?.student_email, pAny?.parent_email].filter(Boolean) as string[];
        const uniqueEmails = Array.from(new Set(rawEmails.map((e: string) => e.trim().toLowerCase())));
        
        // ── Day 5 Reminder (2 Days Before Trial Ends) ──────────────────────────
        if (daysSinceStart >= 4.5 && daysSinceStart < 6.5 && profile.subscription_status === "trialing" && !pAny?.trial_cancelled_email_sent) {
          // Send Day 5 SMS if not sent yet and not already sent in this batch
          if (!profile.trial_day5_sms_sent) {
            const msgText = `Hi ${name}, a quick reminder from Schoolari that your free trial ends in 2 days. Manage your subscription at ${process.env.NEXT_PUBLIC_APP_URL || "https://members.schoolari.com"}/pricing`;
            let smsSuccess = false;
            for (const phone of uniquePhones) {
              if (sentDay5PhonesThisRun.has(phone)) {
                smsSuccess = true;
                continue;
              }
              try {
                await client.messages.create({ body: msgText, from: twilioPhone, to: phone });
                smsSuccess = true;
                sentDay5PhonesThisRun.add(phone);
                sentCount++;
              } catch (e) { failCount++; }
            }
            if (smsSuccess || uniquePhones.length === 0) {
              await supabase.from("profiles").update({ trial_day5_sms_sent: true }).eq("id", profile.id);
            }
          }

          // Send Day 5 Email if not sent yet and not already sent in this batch
          if (!pAny?.trial_day5_email_sent) {
            let emailSent = false;
            for (const email of uniqueEmails) {
              if (sentDay5EmailsThisRun.has(email)) {
                emailSent = true;
                continue;
              }
              try {
                const res = await sendTrialDay5ReminderEmail(email, name);
                if (res.success) {
                  emailSent = true;
                  sentDay5EmailsThisRun.add(email);
                  sentCount++;
                  console.log(`[cron/reminders] Day 5 reminder email sent to ${email} (userId: ${profile.id})`);
                }
              } catch (e) {
                console.error(`[cron/reminders] Failed Day 5 email to ${email}:`, e);
              }
            }
            if (emailSent || uniqueEmails.length === 0) {
              await supabase.from("profiles").update({ trial_day5_email_sent: true } as any).eq("id", profile.id);
            }
          }
        }
        
        // ── Day 7 Confirmation (Trial Converted to Paid Subscription) ─────────
        if (daysSinceStart >= 6.75 && daysSinceStart < 8.5 && profile.subscription_status === "active") {
          // Send Day 7 SMS if not sent yet and not already sent in this batch
          if (!profile.trial_day7_sms_sent) {
            const msgText = `Hi ${name}, your Schoolari free trial has ended and your card has been successfully charged. Thank you for subscribing!`;
            let smsSuccess = false;
            for (const phone of uniquePhones) {
              if (sentDay7PhonesThisRun.has(phone)) {
                smsSuccess = true;
                continue;
              }
              try {
                await client.messages.create({ body: msgText, from: twilioPhone, to: phone });
                smsSuccess = true;
                sentDay7PhonesThisRun.add(phone);
                sentCount++;
              } catch (e) { failCount++; }
            }
            if (smsSuccess || uniquePhones.length === 0) {
              await supabase.from("profiles").update({ trial_day7_sms_sent: true }).eq("id", profile.id);
            }
          }

          // Send Day 7 Email if not sent yet and not already sent in this batch
          if (!pAny?.trial_day7_email_sent) {
            let emailSent = false;
            for (const email of uniqueEmails) {
              if (sentDay7EmailsThisRun.has(email)) {
                emailSent = true;
                continue;
              }
              try {
                const res = await sendTrialDay7ConvertedEmail(email, name);
                if (res.success) {
                  emailSent = true;
                  sentDay7EmailsThisRun.add(email);
                  sentCount++;
                  console.log(`[cron/reminders] Day 7 active confirmation email sent to ${email} (userId: ${profile.id})`);
                }
              } catch (e) {
                console.error(`[cron/reminders] Failed Day 7 email to ${email}:`, e);
              }
            }
            if (emailSent || uniqueEmails.length === 0) {
              await supabase.from("profiles").update({ trial_day7_email_sent: true } as any).eq("id", profile.id);
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
