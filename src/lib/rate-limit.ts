import { NextResponse } from "next/server";

interface RateLimitOptions {
  interval: number; // in milliseconds, e.g. 15 * 60 * 1000 (15 min)
  uniqueTokenPerInterval?: number; // max active tracked tokens before cleanup
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // timestamp in ms when window resets
}

export function rateLimit(options: RateLimitOptions) {
  const tokenCache = new Map<string, { count: number; expiresAt: number }>();
  const interval = options.interval;
  const maxTokens = options.uniqueTokenPerInterval || 5000;

  // Periodic cleanup helper
  let lastCleanup = Date.now();
  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup > interval || tokenCache.size > maxTokens) {
      for (const [key, val] of tokenCache.entries()) {
        if (val.expiresAt <= now) {
          tokenCache.delete(key);
        }
      }
      lastCleanup = now;
    }
  }

  return {
    check: (limit: number, token: string): RateLimitResult => {
      cleanup();

      const now = Date.now();
      const record = tokenCache.get(token);

      if (!record || record.expiresAt <= now) {
        tokenCache.set(token, {
          count: 1,
          expiresAt: now + interval,
        });

        return {
          success: true,
          limit,
          remaining: limit - 1,
          reset: now + interval,
        };
      }

      if (record.count >= limit) {
        return {
          success: false,
          limit,
          remaining: 0,
          reset: record.expiresAt,
        };
      }

      record.count += 1;
      return {
        success: true,
        limit,
        remaining: limit - record.count,
        reset: record.expiresAt,
      };
    },
  };
}

/**
 * Extracts client IP from Request headers
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}

/**
 * Helper to generate a standardized HTTP 429 Too Many Requests response
 */
export function rateLimitExceededResponse(
  message = "Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde.",
  retryAfterSeconds = 60
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}
