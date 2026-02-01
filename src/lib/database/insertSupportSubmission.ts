import { withTransaction } from "./connection";
import { ResultSetHeader } from "mysql2";

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

  // Now going to Start Transactions
  return await withTransaction(async (connection) => {
    // Step 1: Insert Support Ticket
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
