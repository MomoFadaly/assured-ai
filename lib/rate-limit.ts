/**
 * Rate limiter for paid API endpoints.
 *
 * Why in-memory: Vercel serverless instances are ephemeral, so this isn't
 * cross-instance. It's a defense-in-depth layer that stops the trivial
 * `while true; curl ...` abuse from one client. For production rigor, swap
 * in @upstash/ratelimit with Upstash Redis (free tier covers 10K commands/day).
 *
 * Why TWO windows: a short burst window (5/minute) catches automated abuse;
 * a daily window (50/day) caps human-but-curious users without locking them
 * out for an hour after a 30-second spike.
 *
 * Why an IP key: simplest fingerprint that doesn't require auth. The fingerprint
 * isn't perfect (NATs, VPNs) but rate limiting is cost-protection, not
 * identity enforcement.
 */

interface Bucket {
  /** Timestamps of requests, oldest first. */
  burst: number[];
  daily: number[];
}

const BURST_WINDOW_MS = 60_000; // 1 minute
const BURST_MAX = 5;
const DAILY_WINDOW_MS = 24 * 60 * 60_000;
const DAILY_MAX = 50;

const buckets = new Map<string, Bucket>();

// Garbage collect once per minute to keep memory bounded
let lastGc = Date.now();
function gc() {
  const now = Date.now();
  if (now - lastGc < 60_000) return;
  lastGc = now;
  buckets.forEach((b, key) => {
    b.burst = b.burst.filter((t) => now - t < BURST_WINDOW_MS);
    b.daily = b.daily.filter((t) => now - t < DAILY_WINDOW_MS);
    if (b.burst.length === 0 && b.daily.length === 0) buckets.delete(key);
  });
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next request would succeed (0 if allowed now). */
  retryAfter: number;
  /** Which window tripped — useful for log messages and Retry-After header. */
  reason: 'ok' | 'burst' | 'daily';
  /** Current count in the burst window (for headers). */
  burstRemaining: number;
  dailyRemaining: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  gc();
  const now = Date.now();
  const bucket = buckets.get(key) ?? { burst: [], daily: [] };

  // Filter out old entries
  bucket.burst = bucket.burst.filter((t) => now - t < BURST_WINDOW_MS);
  bucket.daily = bucket.daily.filter((t) => now - t < DAILY_WINDOW_MS);

  if (bucket.daily.length >= DAILY_MAX) {
    const oldest = bucket.daily[0]!;
    const retryAfter = Math.ceil((DAILY_WINDOW_MS - (now - oldest)) / 1000);
    return { allowed: false, retryAfter, reason: 'daily', burstRemaining: 0, dailyRemaining: 0 };
  }

  if (bucket.burst.length >= BURST_MAX) {
    const oldest = bucket.burst[0]!;
    const retryAfter = Math.ceil((BURST_WINDOW_MS - (now - oldest)) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: 'burst',
      burstRemaining: 0,
      dailyRemaining: DAILY_MAX - bucket.daily.length,
    };
  }

  bucket.burst.push(now);
  bucket.daily.push(now);
  buckets.set(key, bucket);

  return {
    allowed: true,
    retryAfter: 0,
    reason: 'ok',
    burstRemaining: BURST_MAX - bucket.burst.length,
    dailyRemaining: DAILY_MAX - bucket.daily.length,
  };
}

/**
 * Extract a client identifier from request headers. Prefers Vercel-provided
 * `x-forwarded-for`, falls back to `x-real-ip`. Returns "anonymous" if neither
 * is present (e.g., local dev), which means localhost is effectively shared
 * across all dev sessions — that's fine for local.
 */
export function clientKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const xrip = req.headers.get('x-real-ip');
  if (xrip) return xrip.trim();
  return 'anonymous';
}
