// Simple in-memory token bucket rate limiter for AI requests
// Tracks requests per socketId

interface RateLimitTracker {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitTracker>();
const MAX_REQUESTS = 3;
const WINDOW_MS = 60 * 1000; // 60 seconds

export function checkRateLimit(socketId: string): boolean {
  const now = Date.now();
  const tracker = rateLimits.get(socketId);

  if (!tracker) {
    rateLimits.set(socketId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (now > tracker.resetAt) {
    // Window expired, reset
    tracker.count = 1;
    tracker.resetAt = now + WINDOW_MS;
    return true;
  }

  if (tracker.count >= MAX_REQUESTS) {
    // Rate limit exceeded
    return false;
  }

  // Increment counter
  tracker.count += 1;
  return true;
}

// Clean up expired rate limits periodically to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, tracker] of rateLimits.entries()) {
    if (now > tracker.resetAt) {
      rateLimits.delete(key);
    }
  }
}, WINDOW_MS);
