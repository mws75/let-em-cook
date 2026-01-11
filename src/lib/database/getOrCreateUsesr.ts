import { executeQuery, withTransaction } from "./connection";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { currentUser } from "@clerk/nextjs/server";

export async function getOrCreateUser(): Promise<number> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("No authenticated user found");
  }

  const email = clerkUser.emailAddresses[0]?.emailAdress;
  const userName =
    clerkUser.username || clerkUser.firstName || email?.split("@")[0] || "User";

  if (!email) {
    throw new Error("User email not found");
  }

  try {
    const existingUsers = await executeQuery<RowDataPacket[]>(
      "SELECT user_id FROM ltc_users WHERE email = ? LIMIT 1;",
      [email],
    );
    if (existingUsers.length > 0) {
      return existingUsers[0].user_id;
    }

    // User doesn't exist so let's create a new user
    return await withTransaction(async (connection) => {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO ltc_users (user_name, email, plan_tier)
          VALUES 
          (?, ?, ?)
        `,
        [userName, email, "free"],
      );
      const userId = result.insesrtId;
      if (!userId) {
        throw new Error("Failed to create user; no insertId returned");
      }
      console.log(`✅ Created new user with ID: ${userId} for email ${email}`);
      return userId;
    });
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    throw new Error("Failed to get or Create User");
  }
}
