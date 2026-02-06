import { executeQuery, withTransaction } from "./connection";
import { ResultSetHeader, RowDataPacket } from "mysql2";

// ============================================================================
// Contact / Support Submissions
// ============================================================================

interface RecordCount extends RowDataPacket {
  count: number;
}

/**
 * Gets the count of contact submissions from a user in the last 24 hours
 * Used for rate limiting
 */
export async function getRateCount(userId: number): Promise<number> {
  try {
    console.log("=== get the number of emails from user:", userId);

    const result = await executeQuery<RecordCount[]>(
      `SELECT COUNT(*) as count
      FROM ltc_contact_submissions
      WHERE user_id = ? AND created_on > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `,
      [userId],
    );

    const count = result[0]?.count ?? 0;
    console.log("User has", count, "support request");
    return count;
  } catch (error) {
    console.log("Error in getRateCount: ", error);
    throw error;
  }
}

/**
 * Inserts a new support/contact submission
 */
export async function insertSupportSubmission(
  userId: number,
  userEmail: string,
  userName: string,
  userMessage: string,
): Promise<{ id: number }> {
  if (!userId) {
    throw new Error("missing userId");
  }
  if (!userEmail) {
    throw new Error("missing user Email");
  }
  if (!userName) {
    throw new Error("missing userName");
  }
  if (!userMessage) {
    throw new Error("missing message");
  }

  return await withTransaction(async (connection) => {
    const [submissionResult] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO ltc_contact_submissions (user_id, user_email, user_name, message)
        VALUES (?, ?, ?, ?)
      `,
      [userId, userEmail, userName, userMessage],
    );
    const submissionId = submissionResult.insertId;
    if (!submissionId) {
      throw new Error(
        "Failed to insert Submission Message, no submissionId returned",
      );
    }
    return { id: submissionId };
  });
}
