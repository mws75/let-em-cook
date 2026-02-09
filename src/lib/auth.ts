import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { User as ClerkUser } from "@clerk/nextjs/server";
import { executeQuery, withTransaction } from "./database/connection";
import { ResultSetHeader, RowDataPacket } from "mysql2";
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

export async function getAuthenticatedUserId(): Promise<number> {
  const user = await currentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  // Fast path: ID already in metadata
  const dbUserId = user.publicMetadata?.dbUserId as number | undefined;
  if (dbUserId) {
    return dbUserId;
  }

  // Slow path (first time): Create/find user and store ID in metadata
  return await createUserAndSyncMetadata(user);
}

/**
 * Get full user record with plan and Stripe info
 * Use this when you need more than just the userId
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const userId = await getAuthenticatedUserId();
  return await getUserById(userId);
}

/**
 * Get user by database ID
 */
export async function getUserById(userId: number): Promise<User | null> {
  const users = await executeQuery<UserRow[]>(
    `SELECT user_id, user_name, email, profile_pic_url, plan_tier,
            is_deleted, role, stripe_customer_id, stripe_subscription_id
     FROM ltc_users WHERE user_id = ? LIMIT 1`,
    [userId],
  );

  if (users.length === 0) {
    return null;
  }

  const user = users[0];
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
}

/**
 * Creates user if needed and syncs dbUserId to Clerk metadata
 * Called on first authenticated request when metadata is empty
 */
async function createUserAndSyncMetadata(
  clerkUser: ClerkUser,
): Promise<number> {
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const userName =
    clerkUser.username || clerkUser.firstName || email?.split("@")[0] || "User";
  const profilePicUrl = clerkUser.imageUrl || null;

  if (!email) {
    throw new Error("User email not found");
  }

  // Use INSERT IGNORE to handle race conditions - if user already exists, it's a no-op
  await executeQuery<ResultSetHeader>(
    `INSERT IGNORE INTO ltc_users (user_name, email, plan_tier, profile_pic_url)
     VALUES (?, ?, ?, ?)`,
    [userName, email, "free", profilePicUrl],
  );

  // Update profile pic if user already exists (in case they changed it in Clerk)
  if (profilePicUrl) {
    await executeQuery<ResultSetHeader>(
      `UPDATE ltc_users SET profile_pic_url = ? WHERE email = ? AND (profile_pic_url IS NULL OR profile_pic_url != ?)`,
      [profilePicUrl, email, profilePicUrl],
    );
  }

  // Now fetch the user_id (whether just created or already existed)
  const users = await executeQuery<RowDataPacket[]>(
    "SELECT user_id FROM ltc_users WHERE email = ? LIMIT 1",
    [email],
  );

  if (users.length === 0) {
    throw new Error("Failed to create or find user");
  }

  const userId = users[0].user_id;

  // Store in Clerk metadata for future requests (no DB query needed next time)
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkUser.id, {
    publicMetadata: { dbUserId: userId },
  });

  return userId;
}
