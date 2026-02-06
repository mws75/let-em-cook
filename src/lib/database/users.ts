import { executeQuery, withTransaction } from "./connection";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { currentUser } from "@clerk/nextjs/server";
import { User } from "@/types/types";

// ============================================================================
// Row Types
// ============================================================================

interface UserRow extends RowDataPacket {
  user_id: number;
  user_name: string;
  email: string;
  profile_pic_url: string | null;
  plan_tier: string;
  is_deleted: number;
  role: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

interface CountRow extends RowDataPacket {
  count: number;
}

// ============================================================================
// Auth + User Creation
// ============================================================================

/**
 * Gets or creates a user in the database based on Clerk authentication
 * Maps Clerk userId to database user_id
 * @returns database user_id (number)
 */
export async function getOrCreateUser(): Promise<number> {
  try {
    console.log("=== getOrCreateUser called ===");
    const clerkUser = await currentUser();

    if (!clerkUser) {
      console.error("❌ No Clerk user found");
      throw new Error("No authenticated user found");
    }

    console.log("✅ Clerk user found:", clerkUser.id);

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const userName =
      clerkUser.username ||
      clerkUser.firstName ||
      email?.split("@")[0] ||
      "User";

    console.log("User info:", { email, userName });

    if (!email) {
      console.error("❌ No email found for user");
      throw new Error("User email not found");
    }

    // Try to find existing user by email
    console.log("Checking if user exists in database...");
    const existingUsers = await executeQuery<RowDataPacket[]>(
      "SELECT user_id FROM ltc_users WHERE email = ? LIMIT 1",
      [email],
    );

    if (existingUsers.length > 0) {
      console.log("✅ Found existing user with ID:", existingUsers[0].user_id);
      return existingUsers[0].user_id;
    }

    // User doesn't exist, create new user
    console.log("Creating new user in database...");
    return await withTransaction(async (connection) => {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO ltc_users (user_name, email, plan_tier)
         VALUES (?, ?, ?)`,
        [userName, email, "free"],
      );

      const userId = result.insertId;

      if (!userId) {
        throw new Error("Failed to create user: no insertId returned");
      }

      console.log(`✅ Created new user with ID: ${userId} for email: ${email}`);
      return userId;
    });
  } catch (error) {
    console.error("❌ Error in getOrCreateUser:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
}

// ============================================================================
// User Queries
// ============================================================================

/**
 * Gets user with plan and Stripe information from the database
 * @returns User object with plan_tier, stripe_customer_id, stripe_subscription_id
 */
export async function getUserWithPlan(): Promise<User | null> {
  try {
    console.log("=== getUserWithPlan called ===");
    const clerkUser = await currentUser();

    if (!clerkUser) {
      console.error("No Clerk user found");
      return null;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      console.error("No email found for user");
      return null;
    }

    const users = await executeQuery<UserRow[]>(
      `SELECT user_id, user_name, email, profile_pic_url, plan_tier,
              is_deleted, role, stripe_customer_id, stripe_subscription_id
       FROM ltc_users
       WHERE email = ? LIMIT 1`,
      [email],
    );

    if (users.length === 0) {
      console.log("User not found in database");
      return null;
    }

    const user = users[0];
    console.log("Found user with plan:", user.plan_tier);

    return {
      user_id: user.user_id,
      user_name: user.user_name,
      email: user.email,
      profile_pic_url: user.profile_pic_url || "",
      plan_tier: user.plan_tier || "free",
      is_deleted: user.is_deleted,
      role: user.role,
      stripe_customer_id: user.stripe_customer_id,
      stripe_subscription_id: user.stripe_subscription_id,
    };
  } catch (error) {
    console.error("Error in getUserWithPlan:", error);
    throw error;
  }
}

/**
 * Gets user email by Stripe customer ID
 * Used by webhooks to identify users
 */
export async function getUserByStripeCustomerId(
  stripeCustomerId: string,
): Promise<{ email: string; user_id: number } | null> {
  try {
    interface StripeUserRow extends RowDataPacket {
      email: string;
      user_id: number;
    }

    const users = await executeQuery<StripeUserRow[]>(
      "SELECT email, user_id FROM ltc_users WHERE stripe_customer_id = ? LIMIT 1",
      [stripeCustomerId],
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

/**
 * Counts the total number of recipes for a user
 * @param userId - The database user ID
 * @returns The count of recipes owned by the user
 */
export async function countUserRecipes(userId: number): Promise<number> {
  try {
    console.log("=== countUserRecipes called for user:", userId, "===");

    const result = await executeQuery<CountRow[]>(
      "SELECT COUNT(*) as count FROM ltc_recipes WHERE user_id = ?",
      [userId],
    );

    const count = result[0]?.count ?? 0;
    console.log("User has", count, "recipes");

    return count;
  } catch (error) {
    console.error("Error in countUserRecipes:", error);
    throw error;
  }
}

// ============================================================================
// User Updates (Subscription)
// ============================================================================

/**
 * Updates a user's Stripe subscription information by stripe_customer_id
 * Used after successful checkout
 */
export async function updateUserSubscription(
  stripeCustomerId: string,
  subscriptionId: string,
  planTier: string,
): Promise<void> {
  try {
    console.log("=== updateUserSubscription called ===");
    console.log("Stripe Customer:", stripeCustomerId, "Plan:", planTier);

    await executeQuery<ResultSetHeader>(
      `UPDATE ltc_users
       SET stripe_subscription_id = ?, plan_tier = ?
       WHERE stripe_customer_id = ?`,
      [subscriptionId, planTier, stripeCustomerId],
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
  planTier: string,
): Promise<void> {
  try {
    console.log("=== updateUserPlanTier called ===");
    console.log("Stripe Customer:", stripeCustomerId, "Plan:", planTier);

    await executeQuery<ResultSetHeader>(
      `UPDATE ltc_users
       SET plan_tier = ?
       WHERE stripe_customer_id = ?`,
      [planTier, stripeCustomerId],
    );

    console.log("User plan tier updated successfully");
  } catch (error) {
    console.error("Error in updateUserPlanTier:", error);
    throw error;
  }
}
