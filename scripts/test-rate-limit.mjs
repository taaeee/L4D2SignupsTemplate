// Test standalone rate limiter algorithm
function rateLimit(options) {
  const tokenCache = new Map();
  const interval = options.interval;
  const maxTokens = options.uniqueTokenPerInterval || 5000;

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
    check: (limit, token) => {
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

console.log("==================================================");
console.log("🧪 TESTING RATE LIMITER UTILITY");
console.log("==================================================\n");

const limiter = rateLimit({
  interval: 1000,
  uniqueTokenPerInterval: 100,
});

const token = "ip_192.168.1.50";
const limit = 3;

// Request 1
let res1 = limiter.check(limit, token);
console.log(`Req 1: success=${res1.success}, remaining=${res1.remaining}`);
if (!res1.success || res1.remaining !== 2) throw new Error("Req 1 failed");

// Request 2
let res2 = limiter.check(limit, token);
console.log(`Req 2: success=${res2.success}, remaining=${res2.remaining}`);
if (!res2.success || res2.remaining !== 1) throw new Error("Req 2 failed");

// Request 3
let res3 = limiter.check(limit, token);
console.log(`Req 3: success=${res3.success}, remaining=${res3.remaining}`);
if (!res3.success || res3.remaining !== 0) throw new Error("Req 3 failed");

// Request 4 (Should be BLOCKED)
let res4 = limiter.check(limit, token);
console.log(`Req 4: success=${res4.success}, remaining=${res4.remaining} (Expected Block: 429)`);
if (res4.success !== false) throw new Error("Req 4 was not blocked!");

// Different token should NOT be blocked
let otherToken = "ip_192.168.1.99";
let resOther = limiter.check(limit, otherToken);
console.log(`Other IP Req 1: success=${resOther.success}, remaining=${resOther.remaining}`);
if (!resOther.success) throw new Error("Different token was blocked incorrectly!");

console.log("\n✅ ALL RATE LIMITER TESTS PASSED SUCCESSFULLY!\n");
