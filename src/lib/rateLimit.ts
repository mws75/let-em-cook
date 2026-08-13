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

// Food-lookup search hits an external nutrition API on cache misses. Debounced
// at 300ms client-side, so this is just a backstop against a runaway loop.
const FOOD_WINDOW_SECONDS = 60;
const FOOD_REQUESTS_PER_WINDOW = 120;

/**
 * Generic per-user, per-endpoint sliding-window rate limit. Throws
 * {@link RateLimitError} when the user is over the limit; otherwise records the
 * call and returns. Call AFTER authenticating and BEFORE the protected work.
 */
export async function enforceRateLimit(
  userId: number,
  endpoint: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const count = await getApiUsageCount(userId, endpoint, windowSeconds);
  if (count >= limit) {
    throw new RateLimitError(limit, windowSeconds);
  }
  await recordApiUsage(userId, endpoint);
}

/** Sliding-window limit for the OpenAI-backed endpoints. */
export async function enforceAiRateLimit(
  userId: number,
  endpoint: string,
): Promise<void> {
  return enforceRateLimit(
    userId,
    endpoint,
    AI_REQUESTS_PER_WINDOW,
    AI_WINDOW_SECONDS,
  );
}

/** Sliding-window limit for the food-lookup endpoints. */
export async function enforceFoodRateLimit(
  userId: number,
  endpoint: string,
): Promise<void> {
  return enforceRateLimit(
    userId,
    endpoint,
    FOOD_REQUESTS_PER_WINDOW,
    FOOD_WINDOW_SECONDS,
  );
}
