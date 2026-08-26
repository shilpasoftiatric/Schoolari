import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { sendTrialEndingSMS } from "@/lib/twilio";
import { getSupabaseAdmin, mirrorStripeSubscription } from "@/lib/stripe-mirror";
import { getPlanFromPriceId } from "@/lib/subscription";
import { 
  sendTrialDay5ReminderEmail, 
  sendTrialDay7ConvertedEmail, 
  sendTrialCancelledEmail 
} from "@/lib/email";

let stripe: Stripe | null = null;
let supabaseAdmin: any = null;

function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia" as any,
    });
  }
  return stripe;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("Webhook Error: No stripe-signature header");
    return NextResponse.json({ error: "No stripe signature" }, { status: 400 });
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!webhookSecret) {
    console.error("Webhook Error: Missing STRIPE_WEBHOOK_SECRET environment variable");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log(`\n✅ [Stripe Webhook] Received event: ${event.type} (ID: ${event.id})`);
  } catch (err: any) {
    console.error(`❌ [Stripe Webhook] Signature verification failed:`, err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // This is the user.id we passed from our checkout route
        const userId = session.client_reference_id;
        if (!userId) {
          throw new Error("No client_reference_id found in session");
        }

        // Retrieve subscription details
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        const stripeClient = getStripe();
        const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        const stripeFields: any = {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          subscription_status: subscription.status, // e.g. "trialing" or "active"
        };

        if (subscription.status === "trialing") {
          stripeFields.trial_start_date = new Date().toISOString();
        }

        // Update the payer's own profile
        const adminClient = getSupabaseAdmin();
        const { data: profile, error } = await adminClient
          .from("profiles")
          .upsert({ id: userId, ...stripeFields }, { onConflict: "id" })
          .select()
          .single();

        if (error) {
          console.error("Failed to update user profile with subscription:", error);
          throw error;
        }

        // Mirror to student/parent profile depending on who paid
        await mirrorStripeSubscription(userId, stripeFields);

        // If Elite subscription, ensure welcome message is auto-delivered
        try {
          const plan = getPlanFromPriceId(priceId);
          if (plan === "elite") {
            const { ensureEliteWelcomeMessage } = await import("@/app/actions/coaching");
            await ensureEliteWelcomeMessage(userId);
          }
        } catch (eliteMsgErr) {
          console.warn("Elite welcome message auto-trigger warning:", eliteMsgErr);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const prevAttributes = event.data.previous_attributes as any;

        const stripeFields: Record<string, string | null> = {
          subscription_status: subscription.status,
          stripe_price_id: subscription.items.data[0].price.id,
        };

        // Detect cancellation during trial:
        // - soft cancel (cancel_at_period_end) while still trialing
        // - hard cancel (deleted) where previous status was trialing OR canceled_at is before trial_end
        const isCancelledDuringTrial =
          (event.type === "customer.subscription.updated" && subscription.cancel_at_period_end && subscription.status === "trialing") ||
          (event.type === "customer.subscription.deleted" &&
            (prevAttributes?.status === "trialing" ||
             (subscription.trial_end && subscription.canceled_at && subscription.canceled_at <= subscription.trial_end)));

        // Detect trial converting to active (trialing → active)
        const isTrialConverted =
          event.type === "customer.subscription.updated" &&
          subscription.status === "active" &&
          prevAttributes?.status === "trialing";

        // On hard cancellation, also clear the subscription and customer IDs
        if (event.type === "customer.subscription.deleted") {
          stripeFields.stripe_subscription_id = null;
          stripeFields.stripe_customer_id = null;
        }

        // Find all profiles by subscription ID and update them
        const adminClient = getSupabaseAdmin();
        const { data: payerProfiles, error } = await adminClient
          .from("profiles")
          .update(stripeFields)
          .eq("stripe_subscription_id", subscription.id)
          .select();

        if (error) {
          console.error("Failed to update subscription status:", error);
          throw error;
        }

        // Mirror to linked family members and send lifecycle emails
        if (payerProfiles) {
          for (const payer of payerProfiles) {
            await mirrorStripeSubscription(payer.id, stripeFields);

            const email = payer.student_email || payer.parent_email;
            const first = payer.first_name || payer.student_first_name || payer.parent_first_name || "Student";
            const pAny = payer as any;

            // 1. Send Trial Cancellation Email via Google Workspace
            if (isCancelledDuringTrial && email && !pAny?.trial_cancelled_email_sent) {
              console.log(`[Trial Lifecycle] Sending cancellation email to ${email} (userId: ${payer.id})`);
              await sendTrialCancelledEmail(email, first).catch(console.error);
              await adminClient.from("profiles").update({ trial_cancelled_email_sent: true }).eq("id", payer.id);
            }

            // 2. Send Day 7 Conversion Email via Google Workspace (if not sent yet)
            if (isTrialConverted && email && !pAny?.trial_day7_email_sent) {
              console.log(`[Trial Lifecycle] Trial converted to active. Sending Day 7 email to ${email}`);
              await sendTrialDay7ConvertedEmail(email, first).catch(console.error);
              await adminClient.from("profiles").update({ trial_day7_email_sent: true }).eq("id", payer.id);
            }
          }
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Fetch user profile to get contact info
        const adminClient = getSupabaseAdmin();
        const { data: profile } = await adminClient
          .from("profiles")
          .select("id, student_phone, parent_phone, student_first_name, parent_first_name, student_email, parent_email, trial_day5_email_sent, trial_day5_sms_sent")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          const phoneNumber = profile.student_phone || profile.parent_phone;
          const name = profile.student_first_name || profile.parent_first_name || "there";
          const email = profile.student_email || profile.parent_email;
          const pAny = profile as any;

          const currentPeriodEnd = (subscription as any).current_period_end ?? (subscription as any).current_period?.end;
          const renewalDate = new Date(currentPeriodEnd * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          });
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://members.schoolari.com";
          const manageLink = `${appUrl}/pricing`;

          // Send SMS reminder
          if (phoneNumber && !profile.trial_day5_sms_sent) {
            await sendTrialEndingSMS(phoneNumber, name, renewalDate, manageLink);
            await adminClient.from("profiles").update({ trial_day5_sms_sent: true }).eq("id", profile.id);
            console.log(`Sent trial ending SMS to ${phoneNumber} for customer ${customerId}`);
          }

          // Send Day 5 Email reminder via Google Workspace
          if (email && !pAny?.trial_day5_email_sent) {
            await sendTrialDay5ReminderEmail(email, name);
            await adminClient.from("profiles").update({ trial_day5_email_sent: true }).eq("id", profile.id);
            console.log(`Sent trial ending reminder email to ${email} for customer ${customerId}`);
          }
        }
        break;
      }

      // Handle successful invoice payment (Day-7 trial conversion backup)
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = ((invoice as any).subscription || (invoice as any).subscription_details?.subscription) as string;

        if (!subscriptionId) break;

        const stripeClient = getStripe();
        const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);

        console.log(`[Invoice] payment_succeeded for sub ${subscriptionId}, status: ${subscription.status}, billing_reason: ${invoice.billing_reason}`);

        if (invoice.billing_reason !== "subscription_cycle" && invoice.billing_reason !== "subscription_create") break;
        if (subscription.status !== "active") break;

        const adminClient = getSupabaseAdmin();
        const { data: payerProfiles } = await adminClient
          .from("profiles")
          .update({ subscription_status: "active" })
          .eq("stripe_subscription_id", subscriptionId)
          .select();

        if (payerProfiles) {
          for (const payer of payerProfiles) {
            await mirrorStripeSubscription(payer.id, { subscription_status: "active" });

            const email = payer.student_email || payer.parent_email;
            const first = payer.first_name || payer.student_first_name || payer.parent_first_name || "Student";
            const pAny = payer as any;

            if (email && !pAny?.trial_day7_email_sent) {
              console.log(`[Trial Lifecycle] invoice.payment_succeeded — sending Day 7 email to ${email}`);
              await sendTrialDay7ConvertedEmail(email, first).catch(console.error);
              await adminClient.from("profiles").update({ trial_day7_email_sent: true }).eq("id", payer.id);
            }
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
