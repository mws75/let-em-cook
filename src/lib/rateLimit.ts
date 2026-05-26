import { getApiUsageCount, recordApiUsage } from "@/lib/database/rateLimit";

/**
 * Thrown when a user exceeds the rate limit for an endpoint.
 * Route handlers should catch this and return HTTP 429.
 */
export class RateLimitError extends Error {
  constructor(
    public readonly limit: number,
    public readonly windowSeconds: number,
  ) {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
  }
}

// Sliding window applied to the OpenAI-backed endpoints. Generous enough for
// real recipe-creation use, but caps how much OpenAI cost a single user can
// drive. Tune here.
const AI_WINDOW_SECONDS = 60; // 1 minute
const AI_REQUESTS_PER_WINDOW = 60;

/**
 * Enforces a per-user, per-endpoint sliding-window rate limit for the
 * OpenAI-backed endpoints. Throws {@link RateLimitError} when the user is over
 * the limit; otherwise records the call and returns.
 *
 * Call this AFTER authenticating the user and BEFORE making the OpenAI request.
 */
export async function enforceAiRateLimit(
  userId: number,
  endpoint: string,
): Promise<void> {
  const count = await getApiUsageCount(userId, endpoint, AI_WINDOW_SECONDS);
  if (count >= AI_REQUESTS_PER_WINDOW) {
    throw new RateLimitError(AI_REQUESTS_PER_WINDOW, AI_WINDOW_SECONDS);
  }
  await recordApiUsage(userId, endpoint);
}
