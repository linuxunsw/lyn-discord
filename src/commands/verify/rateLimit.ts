import { RateLimiterMemory } from "rate-limiter-flexible";

/* 1 email per minute */
const emailLimiter = new RateLimiterMemory({
  points: 1,
  duration: 60,
});

/* 3 emails max in 15 minutes */
const sendLimiter = new RateLimiterMemory({
  points: 3,
  duration: 15 * 60,
});

/**
 * Consumes a rate limit point for the user.
 * Returns true if rate limited, false otherwise.
 */
export async function consumeRateLimit(snowflake: string): Promise<boolean> {
  try {
    await emailLimiter.consume(snowflake);
    await sendLimiter.consume(snowflake);
    return false;
  } catch {
    return true;
  }
}
