import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import twilio from "twilio";
import { formatPhoneE164 } from "@/lib/phone";
import { 
  sendAlertEmail, 
  sendTrialDay5ReminderEmail, 
  sendTrialDay7ConvertedEmail 
} from "@/lib/email";
import { processDueScheduledMessages } from "@/app/actions/admin-messages";

/**
 * GET /api/cron/reminders
 * 
 * Background Cron Job endpoint to process:
 * 1. Upcoming scholarship & task deadline reminders (SMS + Email)
 * 2. 5-day pre-interview preparation checklists (SMS + Email)
 * 3. 7-day video inactivity alerts
 * 4. Day 5 & Day 7 trial lifecycle notifications (SMS + Email)
 * 5. Due scheduled broadcast & direct admin messages
 */
export async function GET(req: Request) {
  try {
    // 1. Verify cron secret (if set in env)
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createAdminClient();

    // Initialize Twilio client for reminders
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

    let sentCount = 0;
    let failCount = 0;

    // 1. Fetch upcoming deadlines (due in the next 3 days, strictly in the future) that haven't been reminded
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
        if (client && twilioPhone) {
          const rawPhones = [pAny?.student_phone, pAny?.parent_phone, pAny?.phone].filter(Boolean) as string[];
          const uniquePhones = Array.from(new Set(rawPhones.map((p) => formatPhoneE164(p)).filter(Boolean) as string[]));
          for (const phone of uniquePhones) {
            try {
              await client.messages.create({ body: msgText, from: twilioPhone, to: phone });
              sentCount++;
            } catch (e) { failCount++; }
          }
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

    // 4B. 5-Day Pre-Interview Prep Reminders (SMS + Email)
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5.5);

    const { data: interviewReminders, error: interviewError } = await supabase
      .from("reminders")
      .select("*, profiles(*)")
      .eq("entity_type", "job")
      .is("reminded_at", null)
      .gte("due_date", now.toISOString())
      .lte("due_date", fiveDaysFromNow.toISOString());

    if (!interviewError && interviewReminders && interviewReminders.length > 0) {
      for (const rem of interviewReminders) {
        const profile = rem.profiles;
        if (!profile) {
          await supabase.from("reminders").update({ reminded_at: now.toISOString() }).eq("id", rem.id);
          continue;
        }

        const dueDate = new Date(rem.due_date);
        const deadlineStr = dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const timeStr = dueDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const jobTitle = rem.title.replace(/^Interview:\s*/i, "");

        const msgText = `Schoolari Interview Prep: Your interview for ${jobTitle} is coming up on ${deadlineStr} at ${timeStr}! 💼 Research the company, review your resume, and prepare talking points at members.schoolari.app/jobs. Good luck! \n\nReply STOP to unsubscribe.`;

        const msgHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
            <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 28px 24px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">🎯 5-Day Interview Prep Checklist</h1>
              <p style="color: #ede9fe; margin: 8px 0 0 0; font-size: 14px;">Your interview for <strong>${jobTitle}</strong> is on <strong>${deadlineStr} at ${timeStr}</strong></p>
            </div>
            <div style="background: #ffffff; padding: 28px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
              <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">Hi ${(profile as any)?.student_first_name || "there"},</p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">You are 5 days away from your scheduled interview. Here is your targeted preparation checklist to help you make a winning impression:</p>
              
              <div style="margin: 20px 0; background: #f8fafc; border-left: 4px solid #7c3aed; padding: 16px; border-radius: 8px;">
                <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #1e1b4b;">1. 🏢 Research the Employer & Team</h3>
                <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">Review the company's recent news, mission statement, products, and core culture values.</p>
              </div>

              <div style="margin: 20px 0; background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px;">
                <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #172554;">2. ⭐ Master the STAR Method</h3>
                <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">Prepare 3–4 stories from school, clubs, or projects highlighting <strong>Situation, Task, Action, and Result</strong>.</p>
              </div>

              <div style="margin: 20px 0; background: #f8fafc; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px;">
                <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #064e3b;">3. ❓ Prepare 3 Smart Questions</h3>
                <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">Have thoughtful questions ready about day-to-day responsibilities, team growth, and success metrics.</p>
              </div>

              <div style="text-align: center; margin: 30px 0 10px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://members.schoolari.app'}/jobs" style="background: #7c3aed; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none; display: inline-block;">
                  Open Jobs & Interview Tracker →
                </a>
              </div>
            </div>
          </div>
        `;

        // Dispatch SMS
        const pAny = profile as any;
        if (client && twilioPhone) {
          const rawPhones = [pAny?.student_phone, pAny?.parent_phone, pAny?.phone].filter(Boolean) as string[];
          const uniquePhones = Array.from(new Set(rawPhones.map((p) => formatPhoneE164(p)).filter(Boolean) as string[]));
          for (const phone of uniquePhones) {
            try {
              await client.messages.create({ body: msgText, from: twilioPhone, to: phone });
              sentCount++;
            } catch (e) { failCount++; }
          }
        }

        // Dispatch Email
        const rawEmails = [pAny?.student_email, pAny?.parent_email, pAny?.email].filter(Boolean) as string[];
        const uniqueEmails = Array.from(new Set(rawEmails.map((e) => e.trim().toLowerCase())));
        for (const email of uniqueEmails) {
          try {
            await sendAlertEmail(email, `Interview Prep: Your interview for ${jobTitle} is in 5 days!`, msgHtml);
          } catch (e) {
            console.error(`Failed to send interview prep email to ${email}:`, e);
          }
        }

        // Mark as reminded
        await supabase.from("reminders").update({ reminded_at: now.toISOString() }).eq("id", rem.id);
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
            if (client && twilioPhone) {
              const rawPhones = [pAny?.student_phone, pAny?.parent_phone, pAny?.phone].filter(Boolean) as string[];
              const uniquePhones = Array.from(new Set(rawPhones.map((p) => formatPhoneE164(p)).filter(Boolean) as string[]));
              for (const phone of uniquePhones) {
                try {
                  await client.messages.create({ body: msgText, from: twilioPhone, to: phone });
                  sentCount++;
                } catch (e) { failCount++; }
              }
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
            if (client && twilioPhone) {
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
            }
            if (smsSuccess || uniquePhones.length === 0 || !client) {
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
            if (client && twilioPhone) {
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
            }
            if (smsSuccess || uniquePhones.length === 0 || !client) {
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

    // 7. Process Due Scheduled Messages (1-on-1 and Broadcast)
    let scheduledProcessed = 0;
    try {
      const schedRes = await processDueScheduledMessages();
      if (schedRes.success) {
        scheduledProcessed = schedRes.processed || 0;
      }
    } catch (schedErr) {
      console.error("[cron/reminders] Error processing scheduled messages:", schedErr);
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failCount,
      scheduled_processed: scheduledProcessed
    });

  } catch (err: any) {
    console.error("[cron/reminders]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
