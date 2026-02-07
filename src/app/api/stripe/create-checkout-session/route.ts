import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAuthenticatedUser } from "@/lib/auth";
import { executeQuery } from "@/lib/database/connection";
import { ResultSetHeader } from "mysql2";

export async function POST() {
  try {
    console.log("=== create-checkout-session API called ===");

    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    if (user.plan_tier === "pro") {
      return NextResponse.json(
        { error: "User already has Pro subscription" },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripe_customer_id;

    const stripe = getStripe();

    if (!customerId) {
      console.log("Creating new Stripe customer for:", user.email);
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.user_id.toString(),
        },
      });
      customerId = customer.id;

      // Save customer ID to database
      await executeQuery<ResultSetHeader>(
        "UPDATE ltc_users SET stripe_customer_id = ? WHERE user_id = ?",
        [customerId, user.user_id]
      );
      console.log("Stripe customer created:", customerId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=cancelled`,
      metadata: {
        user_id: user.user_id.toString(),
        user_email: user.email,
      },
    });

    console.log("Checkout session created:", session.id);

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
