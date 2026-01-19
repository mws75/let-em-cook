import { executeQuery } from "./connection";
import { ResultSetHeader, RowDataPacket } from "mysql2";

/**
 * Updates a user's Stripe subscription information by email
 * Used after successful checkout
 */
export async function updateUserSubscription(
  email: string,
  customerId: string,
  subscriptionId: string,
  planTier: string
): Promise<void> {
  try {
    console.log("=== updateUserSubscription called ===");
    console.log("Email:", email, "Plan:", planTier);

    await executeQuery<ResultSetHeader>(
      `UPDATE ltc_users
       SET stripe_customer_id = ?, stripe_subscription_id = ?, plan_tier = ?
       WHERE email = ?`,
      [customerId, subscriptionId, planTier, email]
    );

    console.log("User subscription updated successfully");
  } catch (error) {
    console.error("Error in updateUserSubscription:", error);
    throw error;
  }
}

/**
 * Updates a user's plan tier by Stripe customer ID
 * Used by webhooks when subscription status changes
 */
export async function updateUserPlanTier(
  stripeCustomerId: string,
  planTier: string
): Promise<void> {
  try {
    console.log("=== updateUserPlanTier called ===");
    console.log("Stripe Customer:", stripeCustomerId, "Plan:", planTier);

    await executeQuery<ResultSetHeader>(
      `UPDATE ltc_users
       SET plan_tier = ?
       WHERE stripe_customer_id = ?`,
      [planTier, stripeCustomerId]
    );

    console.log("User plan tier updated successfully");
  } catch (error) {
    console.error("Error in updateUserPlanTier:", error);
    throw error;
  }
}

/**
 * Gets user email by Stripe customer ID
 * Used by webhooks to identify users
 */
export async function getUserByStripeCustomerId(
  stripeCustomerId: string
): Promise<{ email: string; user_id: number } | null> {
  try {
    interface UserRow extends RowDataPacket {
      email: string;
      user_id: number;
    }

    const users = await executeQuery<UserRow[]>(
      "SELECT email, user_id FROM ltc_users WHERE stripe_customer_id = ? LIMIT 1",
      [stripeCustomerId]
    );

    if (users.length === 0) {
      return null;
    }

    return {
      email: users[0].email,
      user_id: users[0].user_id,
    };
  } catch (error) {
    console.error("Error in getUserByStripeCustomerId:", error);
    throw error;
  }
}
