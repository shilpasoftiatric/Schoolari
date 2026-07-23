// Uses native fetch instead of the twilio SDK to avoid Axios timeout issues on Vercel serverless.

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_REGISTERED_NUMBER;

async function twilioFetch(to: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: twilioFrom!, Body: body }).toString(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Twilio error ${res.status}: ${err.message}`);
  }
}

export const sendSMS = async (to: string, body: string) => {
  if (!accountSid || !authToken || !twilioFrom) {
    console.warn("Twilio credentials missing. Skipping SMS to", to);
    return { success: false, error: "Twilio credentials missing" };
  }
  try {
    await twilioFetch(to, body);
    console.log("SMS sent successfully to", to);
    return { success: true };
  } catch (error) {
    console.error("Error sending SMS:", error);
    return { success: false, error: (error as Error).message };
  }
};

export const sendWelcomeSMS = async (to: string, role: "student" | "parent", isPrimary: boolean) => {
  const roleName = role === "student" ? "Student" : "Parent/Guardian";
  const message = isPrimary
    ? `Welcome to Schoolari! Your ${roleName} account has been created. Reply STOP to unsubscribe.`
    : `Welcome to Schoolari! An account has been created for you as a ${roleName}. Please check your email to set your password. Reply STOP to unsubscribe.`;
  return await sendSMS(to, message);
};

export const sendReminderSMS = async (to: string, taskTitle: string, dueDate: string) => {
  const message = `Schoolari Reminder: "${taskTitle}" is due on ${dueDate}. Log in to view details. Reply STOP to unsubscribe.`;
  return await sendSMS(to, message);
};
