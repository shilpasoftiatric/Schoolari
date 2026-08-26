import { google } from "googleapis";

function getGmailClient() {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground";
  const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error("[Gmail API] Missing Google OAuth credentials in environment! Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN in Vercel settings.");
  }

  const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  if (REFRESH_TOKEN) {
    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  }

  return google.gmail({ version: "v1", auth: oAuth2Client });
}

function makeRawEmail(to: string, subject: string, htmlBody: string): string {
  const SENDER_EMAIL = process.env.ADMIN_EMAIL || "students@schoolari.com";
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
  const messageParts = [
    `From: Schoolari <${SENDER_EMAIL}>`,
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    htmlBody,
  ];
  const message = messageParts.join('\n');

  // The Gmail API requires base64url format
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const sendInviteEmail = async (
  to: string,
  inviteeName: string,
  inviterName: string,
  inviteLink: string,
  role: "student" | "parent"
) => {
  try {
    const subject = "You've been invited to Schoolari!";
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Welcome to Schoolari!</h2>
          <p>Hi <strong>${inviteeName || 'there'}</strong>,</p>
          <p><strong>${inviterName || 'A family member'}</strong> has created a Schoolari <strong>${role}</strong> account for you.</p>
          <p>To get started, please click the button below to set up your password and access your dashboard:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set My Password</a>
          </div>
          <p style="font-size: 0.9em; color: #666;">If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="font-size: 0.85em; color: #2563eb; word-break: break-all;">${inviteLink}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 0.8em; color: #999;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `;

    const raw = makeRawEmail(to, subject, html);

    console.log("==========================================");
    console.log(`INVITE LINK FOR ${to}:`);
    console.log(inviteLink);
    console.log("==========================================");

    const gmail = getGmailClient();
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: raw,
      },
    });

    console.log("Invite email sent successfully via Gmail API:", result.data.id);
    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to send invite email:", error);
    return { success: false as const, error: error?.message ?? "Unknown email error" };
  }
};

export const sendWelcomeEmail = async (
  to: string,
  firstName: string,
  role: "student" | "parent"
) => {
  try {
    const subject = "Welcome to Schoolari!";
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Welcome to Schoolari!</h2>
          <p>Hi <strong>${firstName || 'there'}</strong>,</p>
          <p>Thank you for signing up as a <strong>${role}</strong> on Schoolari. We're thrilled to have you onboard!</p>
          <p>You can now access your dashboard to continue your journey.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://members.schoolari.com"}/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 0.8em; color: #999;">If you need any help, feel free to reach out to our support team.</p>
        </div>
      `;

    const raw = makeRawEmail(to, subject, html);

    const gmail = getGmailClient();
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: raw,
      },
    });

    console.log("Welcome email sent successfully via Gmail API:", result.data.id);
    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to send welcome email:", error);
    return { success: false as const, error: error?.message ?? "Unknown email error" };
  }
};

export const sendAlertEmail = async (to: string, subject: string, text: string) => {
  try {
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h3>${subject}</h3>
          <p>${text.replace(/\n/g, "<br>")}</p>
        </div>
      `;

    const raw = makeRawEmail(to, subject, html);

    const gmail = getGmailClient();
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: raw,
      },
    });

    console.log("Alert email sent successfully via Gmail API:", result.data.id);
    return result;
  } catch (error) {
    console.error("Failed to send alert email:", error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (
  to: string,
  resetLink: string
) => {
  try {
    const subject = "Reset your Schoolari password";
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #6d28d9; margin: 0;">Schoolari</h2>
          </div>
          <h2 style="color: #1e293b; font-size: 20px;">Reset Your Password</h2>
          <p>We received a request to reset your password. Click the button below to choose a new one.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #6d28d9; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 0.9em; color: #64748b;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 0.85em; color: #6d28d9; word-break: break-all;">${resetLink}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 0.8em; color: #94a3b8;">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      `;

    const raw = makeRawEmail(to, subject, html);

    const gmail = getGmailClient();
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: raw,
      },
    });

    console.log("Password reset email sent successfully via Gmail API:", result.data.id);
    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to send password reset email:", error);
    return { success: false as const, error: error?.message ?? "Unknown email error" };
  }
};

/**
 * 1. Trial Welcome Email
 * Sent when user starts their 7-day free trial.
 */
export const sendTrialWelcomeEmail = async (
  to: string,
  firstName: string
) => {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://members.schoolari.com";
    const name = firstName?.trim() || "there";
    const subject = "Welcome to Schoolari! Your free trial starts now";
    const html = `<!DOCTYPE html><html><head> <meta charset="utf-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Welcome to your Schoolari Free Trial</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"> <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;"> <tr> <td align="center"> <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"> <!-- Header --> <tr> <td align="center" style="background-color: #7c3aed; padding: 40px 20px;"> <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Schoolari</h1> <p style="color: #ddd6fe; margin: 10px 0 0 0; font-size: 16px;">Your free trial has officially started!</p> </td> </tr> <!-- Body --> <tr> <td style="padding: 40px 40px 20px 40px;"> <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;"> Hi ${name}, </p> <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;"> Welcome to Schoolari! We are thrilled to have you on board. Your 7-day free trial is now active, giving you full access to all our premium scholarship matching and career tracking tools. </p> <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 30px 0;"> <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">Trial Overview:</h3> <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.6;"> <li><strong>Status:</strong> Active</li> <li><strong>Trial Length:</strong> 7 Days</li> </ul> </div> <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;"> You will not be charged anything today. Your card on file will only be charged at the end of your 7-day trial period. You can cancel or change your plan at any time before then directly from your Profile Dashboard. </p> <table width="100%" border="0" cellspacing="0" cellpadding="0"> <tr> <td align="center"> <a href="${appUrl}/dashboard" style="background-color: #7c3aed; color: #ffffff; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px;">Go to My Dashboard</a> </td> </tr> </table> </td> </tr> <!-- Footer --> <tr> <td align="center" style="padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;"> <p style="color: #94a3b8; font-size: 13px; margin: 0;"> © 2026 Schoolari. All rights reserved.<br> If you have any questions, reply to this email or visit our Help Center. </p> </td> </tr> </table> </td> </tr> </table></body></html>`;

    const raw = makeRawEmail(to, subject, html);
    const gmail = getGmailClient();
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
    console.log("[sendTrialWelcomeEmail] Sent successfully via Gmail API:", result.data.id, "to:", to);
    return { success: true as const };
  } catch (error: any) {
    console.error("[sendTrialWelcomeEmail] Failed to send:", error);
    return { success: false as const, error: error?.message ?? "Unknown email error" };
  }
};

/**
 * 2. Day 5 Trial Ending Reminder Email
 * Sent 2 days before 7-day trial ends.
 */
export const sendTrialDay5ReminderEmail = async (
  to: string,
  firstName: string
) => {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://members.schoolari.com";
    const name = firstName?.trim() || "there";
    const subject = "Your Schoolari free trial ends in 2 days";
    const html = `<!DOCTYPE html><html><head> <meta charset="utf-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Your Schoolari Trial ends in 2 days</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"> <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;"> <tr> <td align="center"> <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"> <!-- Header --> <tr> <td align="center" style="background-color: #f59e0b; padding: 40px 20px;"> <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Schoolari Trial Reminder</h1> </td> </tr> <!-- Body --> <tr> <td style="padding: 40px 40px 20px 40px;"> <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;"> Hi ${name}, </p> <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;"> We hope you're enjoying your free trial! This is a quick reminder that your 7-day trial period will expire in exactly <strong>2 days</strong>. </p> <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;"> When your trial concludes, your subscription will automatically transition to a paid plan and your card on file will be charged for the upcoming billing cycle. </p> <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 20px; margin: 30px 0;"> <p style="margin: 0; color: #b45309; font-size: 15px; line-height: 1.6; text-align: center;"> <strong>Need to make changes?</strong><br> You can upgrade, downgrade, or cancel your subscription at any time before your trial ends to avoid being charged. </p> </div> <table width="100%" border="0" cellspacing="0" cellpadding="0"> <tr> <td align="center"> <a href="${appUrl}/pricing" style="background-color: #334155; color: #ffffff; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px;">Manage Subscription</a> </td> </tr> </table> </td> </tr> <!-- Footer --> <tr> <td align="center" style="padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;"> <p style="color: #94a3b8; font-size: 13px; margin: 0;"> © 2026 Schoolari. All rights reserved. </p> </td> </tr> </table> </td> </tr> </table></body></html>`;

    const raw = makeRawEmail(to, subject, html);
    const gmail = getGmailClient();
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
    console.log("[sendTrialDay5ReminderEmail] Sent successfully via Gmail API:", result.data.id, "to:", to);
    return { success: true as const };
  } catch (error: any) {
    console.error("[sendTrialDay5ReminderEmail] Failed to send:", error);
    return { success: false as const, error: error?.message ?? "Unknown email error" };
  }
};

/**
 * 3. Day 7 Trial Converted Confirmation Email
 * Sent when 7-day trial ends and subscription becomes active.
 */
export const sendTrialDay7ConvertedEmail = async (
  to: string,
  firstName: string
) => {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://members.schoolari.com";
    const name = firstName?.trim() || "Student";
    const subject = `Welcome ${name}! Your subscription is now active`;
    const html = `<!DOCTYPE html><html><head> <meta charset="utf-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Your Schoolari Subscription is Active</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"> <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;"> <tr> <td align="center"> <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"> <!-- Header --> <tr> <td align="center" style="background-color: #10b981; padding: 40px 20px;"> <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Welcome to Premium!</h1> </td> </tr> <!-- Body --> <tr> <td style="padding: 40px 40px 20px 40px;"> <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;"> Hi ${name}, </p> <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;"> Your 7-day free trial has officially concluded, and your card on file has been successfully charged. You are now fully subscribed to our premium platform! </p> <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;"> Thank you for choosing Schoolari. We're excited to continue helping you find the best scholarships and track your career opportunities. </p> <table width="100%" border="0" cellspacing="0" cellpadding="0"> <tr> <td align="center"> <a href="${appUrl}/dashboard" style="background-color: #10b981; color: #ffffff; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px;">Jump Back In</a> </td> </tr> </table> </td> </tr> <!-- Footer --> <tr> <td align="center" style="padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;"> <p style="color: #94a3b8; font-size: 13px; margin: 0;"> © 2026 Schoolari. All rights reserved. </p> </td> </tr> </table> </td> </tr> </table></body></html>`;

    const raw = makeRawEmail(to, subject, html);
    const gmail = getGmailClient();
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
    console.log("[sendTrialDay7ConvertedEmail] Sent successfully via Gmail API:", result.data.id, "to:", to);
    return { success: true as const };
  } catch (error: any) {
    console.error("[sendTrialDay7ConvertedEmail] Failed to send:", error);
    return { success: false as const, error: error?.message ?? "Unknown email error" };
  }
};

/**
 * 4. Trial Cancellation Notice Email
 * Sent when user cancels during their free trial.
 */
export const sendTrialCancelledEmail = async (
  to: string,
  firstName: string
) => {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://members.schoolari.com";
    const name = firstName?.trim() || "there";
    const subject = "Your Schoolari Free Trial has been cancelled";
    const html = `<!DOCTYPE html><html><head> <meta charset="utf-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Your Trial is Cancelled</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"> <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;"> <tr> <td align="center"> <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"> <!-- Header --> <tr> <td align="center" style="background-color: #4f46e5; padding: 30px 20px;"> <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Schoolari</h1> </td> </tr> <!-- Body Content --> <tr> <td style="padding: 40px 40px 20px 40px;"> <p style="font-size: 18px; font-weight: 600; margin: 0 0 20px 0; color: #1e293b;">Hi ${name},</p> <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;"> We're confirming that your Schoolari free trial has been successfully cancelled. </p> <!-- Confirmation Box --> <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 25px 0; text-align: center;"> <p style="color: #166534; font-weight: 700; font-size: 16px; margin: 0;">✓ You will not be charged.</p> </div> <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;"> We’re sorry to see you go! We know that the scholarship and college prep journey can be overwhelming, and we are constantly working to make Schoolari the best tool to help families succeed. </p> <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;"> Your account profile and data have been safely paused. If you ever decide to continue your scholarship journey with us in the future, your account will be waiting for you right where you left off. </p> <table width="100%" border="0" cellspacing="0" cellpadding="0"> <tr> <td align="center" style="padding-top: 10px; padding-bottom: 20px;"> <a href="${appUrl}" style="background-color: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; text-align: center;"><span style="color: #ffffff !important; text-decoration: none;">Log back in anytime</span></a> </td> </tr> </table> </td> </tr> <!-- Footer --> <tr> <td align="center" style="padding: 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;"> <p style="color: #94a3b8; font-size: 13px; margin: 0 0 6px 0;">Have questions or feedback? Just reply to this email!</p> <p style="color: #94a3b8; font-size: 13px; margin: 0;">&copy; 2026 Schoolari. All rights reserved.</p> </td> </tr> </table> </td> </tr> </table></body></html>`;

    const raw = makeRawEmail(to, subject, html);
    const gmail = getGmailClient();
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
    console.log("[sendTrialCancelledEmail] Sent successfully via Gmail API:", result.data.id, "to:", to);
    return { success: true as const };
  } catch (error: any) {
    console.error("[sendTrialCancelledEmail] Failed to send:", error);
    return { success: false as const, error: error?.message ?? "Unknown email error" };
  }
};
