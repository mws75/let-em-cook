import { executeQuery } from "./connection";
import { ResultSetHeader, RowDataPacket } from "mysql2";

// ============================================================================
// API Rate-Limit Usage Log (ltc_api_usage)
// ============================================================================
// Append-only log of calls to the OpenAI-backed endpoints, used to enforce a
// per-user, per-endpoint sliding-window rate limit. See src/lib/rateLimit.ts.

interface CountRow extends RowDataPacket {
  count: number;
}

/**
 * Counts a user's calls to an endpoint within the last `windowSeconds`.
 * Used for sliding-window rate limiting.
 */
export async function getApiUsageCount(
  userId: number,
  endpoint: string,
  windowSeconds: number,
): Promise<number> {
  const result = await executeQuery<CountRow[]>(
    `SELECT COUNT(*) as count
     FROM ltc_api_usage
     WHERE user_id = ?
       AND endpoint = ?
       AND created_on > DATE_SUB(NOW(), INTERVAL ? SECOND)`,
    [userId, endpoint, windowSeconds],
  );
  return result[0]?.count ?? 0;
}

/**
 * Records a single call to an endpoint by a user.
 */
export async function recordApiUsage(
  userId: number,
  endpoint: string,
): Promise<void> {
  await executeQuery<ResultSetHeader>(
    `INSERT INTO ltc_api_usage (user_id, endpoint) VALUES (?, ?)`,
    [userId, endpoint],
  );
}
