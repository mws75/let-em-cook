import { executeQuery } from "./connection";
import { RowDataPacket } from "mysql2";

interface RecordCount extends RowDataPacket {
  count: number;
}

export async function getRateCount(userId: number): Promise<number> {
  try {
    console.log("=== get the number of emails from user:", userId);

    const result = await executeQuery<RecordCount[]>(
      `SELECT COUNT(*) as count 
      FROM ltc_contact_submissions
      WHERE user_id =? and created_on > DATE_SUB(NOW(), INTERVAL 24 HOUR)
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
