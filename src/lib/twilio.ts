import twilio from "twilio";

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_REGISTERED_NUMBER;

export const sendSMS = async (to: string, body: string) => {
  if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.warn("Twilio credentials missing. Skipping SMS to", to);
    return { success: false, error: "Twilio credentials missing" };
  }

  try {
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to,
    });
    console.log("SMS sent successfully", message.sid);
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error("Error sending SMS:", error);
    return { success: false, error: (error as Error).message };
  }
};

export const sendWelcomeSMS = async (to: string, role: "student" | "parent", isPrimary: boolean) => {
  const roleName = role === "student" ? "Student" : "Parent/Guardian";
  let message = "";
  
  if (isPrimary) {
    message = `Welcome to Schoolari! Your ${roleName} account has been created. Reply STOP to unsubscribe.`;
  } else {
    message = `Welcome to Schoolari! An account has been created for you as a ${roleName}. Please check your email to set your password. Reply STOP to unsubscribe.`;
  }

  return await sendSMS(to, message);
};

export const sendReminderSMS = async (to: string, taskTitle: string, dueDate: string) => {
  const message = `Schoolari Reminder: "${taskTitle}" is due on ${dueDate}. Log in to view details. Reply STOP to unsubscribe.`;
  return await sendSMS(to, message);
};
