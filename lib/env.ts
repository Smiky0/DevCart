/**
 * Centralized, fail-fast environment variable validation.
 *
 * Every env var the app needs is declared here once. Modules import the
 * typed values instead of reading `process.env` with non-null assertions,
 * so a misconfigured deploy fails loudly at module load (build time or
 * startup) instead of blowing up mid-request.
 *
 * Secrets are strings; nothing sensitive is ever printed.
 */

type EnvSpec = {
    required: string[];
    optional: string[];
};

// full set of variables read anywhere in the app
const SPEC: EnvSpec = {
    required: [
        // database + auth
        "DATABASE_URL",
        "AUTH_SECRET",
        // rate limiting
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
        // object storage
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_PUBLIC_BUCKET",
        "R2_PRIVATE_BUCKET",
        // payments
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        // public app URL for Stripe redirects
        "NEXT_PUBLIC_APP_URL",
    ],
    optional: [
        // auth providers — the app works without them until sign-in is used
        "AUTH_GITHUB_ID",
        "AUTH_GITHUB_SECRET",
        "AUTH_GOOGLE_ID",
        "AUTH_GOOGLE_SECRET",
        // image host for public R2 objects
        "NEXT_PUBLIC_IMAGE_HOST",
        // cursor signing secret — falls back to AUTH_SECRET
        "CURSOR_SECRET",
        // dev/tooling only (see docs/ARCHITECTURE.md)
        "ADMIN_SECRET",
        "TEST_DATABASE_URL",
        "SEED_DATABASE_URL",
        "SEED_COUNT",
        "SEED_SELLERS",
        "SEED_MODE",
        "SEED_CHUNK_COPY",
        "SEED_CHUNK_BATCH",
        "SEED_CHUNK_DELAY_MS",
        "BENCH_DEPTH",
        "BENCH_SAMPLES",
    ],
};

const env: Record<string, string | undefined> = process.env;

/** Throws at startup if any required variable is absent. */
export function assertEnv(): void {
    const required = new Set(
        SPEC.required.filter((k) => {
            const v = env[k];
            return v === undefined || v.trim() === "";
        }),
    );
    if (required.size > 0) {
        const sorted = [...required].sort();
        throw new Error(
            `Missing required environment variable(s): ${sorted.join(", ")}. ` +
                "See README.md for the full list.",
        );
    }
}

/** Return a required variable's value or throw with a helpful message. */
export function requiredEnv(key: string): string {
    const value = env[key];
    if (value !== undefined && value.trim() !== "") return value;
    throw new Error(`Missing required environment variable: ${key}`);
}

/** Return an optional variable's value, or undefined. */
export function optionalEnv(key: string): string | undefined {
    const value = env[key];
    return value === undefined || value.trim() === "" ? undefined : value;
}

/**
 * Standalone check for tooling entrypoints (seeders, benchmarks) that must
 * run with a reduced variable set — e.g. a seeder only needs the database
 * URL, not Stripe secrets. Returns the list of missing required vars.
 */
export function missingRequired(): string[] {
    return SPEC.required.filter((k) => {
        const v = env[k];
        return v === undefined || v.trim() === "";
    });
}
