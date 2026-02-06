import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  updateUserSubscription,
  updateUserPlanTier,
} from "@/lib/database/users";

export async function POST(request: NextRequest) {
  try {
    console.log("=== Stripe webhook received ===");

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("No Stripe signature found");
      return NextResponse.json(
        { error: "No signature" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    const stripe = getStripe();

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log("Webhook event type:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout completed for session:", session.id);

        if (session.mode === "subscription" && session.subscription) {
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          await updateUserSubscription(
            customerId,
            subscriptionId,
            "pro"
          );
          console.log("User upgraded to pro, customer:", customerId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        console.log("Subscription updated for customer:", customerId);

        // Check subscription status
        if (subscription.status === "active") {
          await updateUserPlanTier(customerId, "pro");
          console.log("User plan set to pro");
        } else if (
          subscription.status === "canceled" ||
          subscription.status === "unpaid" ||
          subscription.status === "past_due"
        ) {
          await updateUserPlanTier(customerId, "free");
          console.log("User plan set to free due to status:", subscription.status);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        console.log("Subscription deleted for customer:", customerId);

        await updateUserPlanTier(customerId, "free");
        console.log("User downgraded to free tier");
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
