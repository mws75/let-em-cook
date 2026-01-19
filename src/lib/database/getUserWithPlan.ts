import { executeQuery } from "./connection";
import { RowDataPacket } from "mysql2";
import { currentUser } from "@clerk/nextjs/server";
import { User } from "@/types/types";

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
      [email]
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
