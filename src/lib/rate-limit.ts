import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = Redis.fromEnv();

const globalGeminiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(4, "60 s"),
  prefix: "decisiongraph:gemini:global",
  analytics: false,
});

const visitorLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "decisiongraph:visitor",
  analytics: false,
});

export async function checkGeminiCapacity() {
  const result = await globalGeminiLimiter.limit("all");

  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export async function checkVisitorLimit(visitorId: string) {
  const result = await visitorLimiter.limit(visitorId);

  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

const databaseLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  prefix: "decisiongraph:database:visitor",
  analytics: false,
});

export async function checkDatabaseLimit(visitorId: string) {
  const result = await databaseLimiter.limit(visitorId);

  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

const globalDatabaseLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "60 s"),
  prefix: "decisiongraph:database:global",
  analytics: false,
});

export async function checkGlobalDatabaseLimit() {
  const result = await globalDatabaseLimiter.limit("all");

  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
