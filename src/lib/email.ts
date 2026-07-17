export const sendInviteEmail = async (to: string, inviteeName: string, inviterName: string, inviteLink: string, role: "student" | "parent") => {
  // Replace with your email provider logic (e.g. Resend, SendGrid)
  console.log("\n\n=========================================");
  console.log("🚨 MOCK EMAIL SENT 🚨");
  console.log(`To: ${to}`);
  console.log(`Subject: You've been invited to Schoolari!`);
  console.log(`Body: Hi ${inviteeName}, ${inviterName} has created a Schoolari ${role} account for you.`);
  console.log(`👉 CLICK HERE TO SET PASSWORD: ${inviteLink}`);
  console.log("=========================================\n\n");
};

export const sendAlertEmail = async (to: string, subject: string, text: string) => {
  // Replace with your email provider logic (e.g. Resend, SendGrid)
  console.log("-----------------------------------------");
  console.log("Mock Alert Email Sent");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${text}`);
  console.log("-----------------------------------------");
};
