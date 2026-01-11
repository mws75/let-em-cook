import { executeQuery, withTransaction } from "./connection";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { currentUser } from "@clerk/nextjs/server";

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
    throw error; // Re-throw the original error instead of generic message
  }
}
