import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const SENDER_EMAIL = process.env.ADMIN_EMAIL || "students@schoolari.com";

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

function makeRawEmail(to: string, subject: string, htmlBody: string): string {
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

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: raw,
      },
    });

    console.log("Invite email sent successfully via Gmail API:", result.data.id);
    return result;
  } catch (error) {
    console.error("Failed to send invite email:", error);
    throw error;
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
