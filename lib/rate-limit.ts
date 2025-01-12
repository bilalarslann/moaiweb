import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
});

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function rateLimit(
  request: Request,
  limit: number = Number(process.env.RATE_LIMIT_REQUESTS) || 100,
  window: number = Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000
): Promise<RateLimitResult> {
  try {
    // Get IP address from request
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const key = `rate-limit:${ip}`;
    const now = Date.now();
    const windowStart = now - window;

    // Clean old requests
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count recent requests
    const recentRequests = await redis.zcount(key, windowStart, now);

    // Check if limit is exceeded
    if (recentRequests >= limit) {
      const oldestRequest = await redis.zrange(key, 0, 0, { withScores: true });
      const reset = oldestRequest[0]?.score ? Number(oldestRequest[0].score) + window : now + window;
      
      return {
        success: false,
        limit,
        remaining: 0,
        reset: Math.ceil(reset / 1000), // Convert to seconds
      };
    }

    // Add current request
    await redis.zadd(key, { score: now, member: now.toString() });
    // Set expiration
    await redis.expire(key, Math.ceil(window / 1000));

    return {
      success: true,
      limit,
      remaining: limit - recentRequests - 1,
      reset: Math.ceil((now + window) / 1000),
    };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // If rate limiting fails, allow the request
    return {
      success: true,
      limit,
      remaining: 1,
      reset: Math.ceil((Date.now() + window) / 1000),
    };
  }
} 