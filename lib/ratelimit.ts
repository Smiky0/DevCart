import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { requiredEnv } from "./env";

const redis = new Redis({
    url: requiredEnv("UPSTASH_REDIS_REST_URL"),
    token: requiredEnv("UPSTASH_REDIS_REST_TOKEN"),
});

// 20 uploads per minute per user
export const uploadRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "ratelimit:upload",
});

// 20 downloads per minute per user
export const downloadRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "ratelimit:download",
});

// 120 product-list requests per minute per visitor
export const browseRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, "1 m"),
    prefix: "ratelimit:browse",
});
