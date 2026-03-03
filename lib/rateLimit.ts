// ============================================================
//  VisayasMed — Rate Limiting Utility
//  IP-based rate limiting using in-memory sliding window
// ============================================================

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Maximum requests per window
    message?: string;      // Custom error message
}

// In-memory store (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Rate limit result
 */
export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    message?: string;
}

/**
 * Check rate limit for a given identifier (usually IP address)
 * Uses sliding window algorithm
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    // If no entry exists or window has expired, create new entry
    if (!entry || entry.resetTime < now) {
        rateLimitStore.set(identifier, {
            count: 1,
            resetTime: now + config.windowMs,
        });
        return {
            success: true,
            limit: config.maxRequests,
            remaining: config.maxRequests - 1,
            resetTime: now + config.windowMs,
        };
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
        return {
            success: false,
            limit: config.maxRequests,
            remaining: 0,
            resetTime: entry.resetTime,
            message: config.message ?? 'Too many requests. Please try again later.',
        };
    }

    // Increment count
    entry.count++;
    return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime,
    };
}

/**
 * Extract client IP from request headers
 * Handles various proxy configurations
 */
export function getClientIp(request: Request): string {
    // Check for forwarded headers (when behind proxy/load balancer)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        // Take first IP (original client)
        return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Fallback for development
    return '127.0.0.1';
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
    // Login endpoint: 5 attempts per 15 minutes
    LOGIN: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
        message: 'Too many login attempts. Please try again in 15 minutes.',
    },
    // General API: 100 requests per minute
    API: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        message: 'Too many requests. Please slow down.',
    },
    // Strict rate limit for sensitive operations: 10 per minute
    STRICT: {
        windowMs: 60 * 1000,
        maxRequests: 10,
        message: 'Too many attempts. Please wait before trying again.',
    },
} as const;

/**
 * Rate limit response helper
 */
export function rateLimitResponse(result: RateLimitResult): Response {
    return new Response(
        JSON.stringify({
            error: result.message ?? 'Rate limit exceeded',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
                'X-RateLimit-Limit': String(result.limit),
                'X-RateLimit-Remaining': String(result.remaining),
                'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
            },
        }
    );
}
