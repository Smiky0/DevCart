/**
 * Bulk product seeder for large-dataset testing (200k+ rows).
 *
 * ⚠️ ISOLATED BY DESIGN: this script only ever touches a LOCAL PostgreSQL
 * instance (the docker-compose one by default). It refuses remote hosts so
 * it can never truncate your hosted/production database.
 *
 * Target resolution order:
 *   1. SEED_DATABASE_URL   (explicit override, still must be local)
 *   2. TEST_DATABASE_URL
 *   3. postgresql://postgres:postgres@localhost:5432/devcart_test
 *
 * Start the database first:  pnpm db:up
 *
 * Modes (SEED_MODE env, default "copy"):
 *   copy  - PostgreSQL COPY FROM STDIN via pg-copy-streams (~seconds)
 *   batch - Prisma createMany in chunks (baseline for the benchmark)
 *   bench - runs BOTH on a fresh table each time and prints a comparison
 *
 * Options:
 *   SEED_COUNT          total products to insert        (default 200000)
 *   SEED_SELLERS        number of seller users to create (default 200)
 *   SEED_CHUNK_COPY     rows per COPY write             (default 1000)
 *   SEED_CHUNK_BATCH    rows per createMany batch       (default 2000)
 *   SEED_CHUNK_DELAY_MS pause between chunks            (default 0)
 *
 * Usage: pnpm db:up && pnpm seed:bulk
 */
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { from as copyFrom } from "pg-copy-streams";
import type { Client } from "pg";

/** The isolated docker-compose database used by seeding and benchmarks. */
const DEFAULT_LOCAL_URL = "postgresql://postgres:postgres@localhost:5432/devcart_test";

// hosts considered safe for destructive bulk operations
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Resolve + validate the target connection string.
 * Throws on any non-local host — this is the guard that keeps the
 * seeder away from production databases (Accelerate URLs resolve to
 * Cloudflare IPs, which are NOT wire-protocol reachable anyway).
 */
export function resolveSeedUrl(): string {
    const url =
        process.env.SEED_DATABASE_URL ??
        process.env.TEST_DATABASE_URL ??
        DEFAULT_LOCAL_URL;
    let host: string;
    try {
        host = new URL(url).hostname;
    } catch {
        throw new Error(`Invalid database URL: ${url}`);
    }
    if (!LOCAL_HOSTS.has(host.toLowerCase())) {
        throw new Error(
            `Refusing to run destructive bulk operations against "${host}".\n` +
                `This script may only target the local Docker Postgres.\n` +
                `Start it with: pnpm db:up`,
        );
    }
    return url;
}

const adapter = new PrismaPg({ connectionString: resolveSeedUrl() });
const prisma = new PrismaClient({ adapter });

// raw pg client for COPY (shares the same validated local connection)
const SEED_URL = resolveSeedUrl();
let pgClient: Client | null = null;

// ---------------------------------------------------------------------------
// deterministic data generation (mulberry32)
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rand = mulberry32(20260822);

function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(rand() * arr.length)];
}

const CATEGORIES = [
    "Templates",
    "Icons",
    "UI Kits",
    "Education",
    "3D Assets",
    "Fonts",
    "Illustrations",
    "Audio",
    "Video",
    "Photos",
] as const;

const ADJECTIVES = [
    "Ultimate",
    "Minimal",
    "Advanced",
    "Modern",
    "Pro",
    "Essential",
    "Complete",
    "Dynamic",
    "Elegant",
    "Robust",
    "Sleek",
    "Premium",
] as const;

const NOUNS = [
    "Dashboard",
    "Starter Kit",
    "Icon Pack",
    "Landing Page",
    "Design System",
    "Font Family",
    "Texture Set",
    "Mockup Bundle",
    "Component Library",
    "Boilerplate",
    "Template Pack",
    "Sound Kit",
] as const;

const IMAGE_POOL = [
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=800&q=80",
] as const;

interface GeneratedProduct {
    id: string;
    sellerId: string;
    title: string;
    description: string;
    price: number;
    category: string;
    image: string;
}

function productId(i: number): string {
    return `bulk_${i.toString(36).padStart(8, "0")}`;
}

function generateProduct(i: number, sellerIds: string[]): GeneratedProduct {
    const adjective = pick(ADJECTIVES);
    const noun = pick(NOUNS);
    const category = pick(CATEGORIES);
    return {
        id: productId(i),
        sellerId: pick(sellerIds),
        title: `${adjective} ${noun} ${category} #${i}`,
        description:
            `The ${adjective.toLowerCase()} ${noun.toLowerCase()} for ${category.toLowerCase()} creators. ` +
            `Includes source files, documentation and free updates. Item #${i}.`,
        price: 299 + Math.floor(rand() * 49_700), // $2.99 - $499.98 in cents
        category,
        image: pick(IMAGE_POOL),
    };
}

// ---------------------------------------------------------------------------
// COPY import
// ---------------------------------------------------------------------------
/** Escape a value for PostgreSQL COPY text format. */
function tsv(value: string): string {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/\t/g, "\\t")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
}

const SPREAD_DAYS = 180;

/** Rows per COPY write. Small chunks + stream backpressure keep the
 *  database's memory/WAL load steady instead of one giant spike. */
const COPY_CHUNK_ROWS = intEnv("SEED_CHUNK_COPY", 1_000);
/** Optional pause between chunks (ms) to further flatten the write rate. */
const CHUNK_DELAY_MS = intEnv("SEED_CHUNK_DELAY_MS", 0);

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function intEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (raw === undefined || raw === "") return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
    return value;
}

async function copyInsertProducts(
    pgClient: Client,
    count: number,
    sellerIds: string[],
): Promise<void> {
    const stream = pgClient.query(
        copyFrom(
            `COPY "Product" ("id","sellerId","title","description","price","isPublished","category","images","createdAt","updatedAt")
             FROM STDIN WITH (FORMAT text)`,
        ),
    );

    const now = Date.now();
    const spanMs = SPREAD_DAYS * 24 * 60 * 60 * 1000;
    for (let start = 0; start < count; start += COPY_CHUNK_ROWS) {
        const end = Math.min(start + COPY_CHUNK_ROWS, count);
        let chunk = "";
        for (let i = start; i < end; i++) {
            const p = generateProduct(i, sellerIds);
            // newest first: index 0 gets the most recent timestamp
            const ts = new Date(now - (i / count) * spanMs).toISOString();
            // images is text[]: {"url"} literal in text format
            chunk +=
                `${tsv(p.id)}\t${tsv(p.sellerId)}\t${tsv(p.title)}\t` +
                `${tsv(p.description)}\t${p.price}\tt\t${tsv(p.category)}\t` +
                `{"${tsv(p.image)}"}\t${ts}\t${ts}\n`;
        }
        // write() returning false = backpressure: wait for drain so we never
        // buffer more than one chunk ahead of the server.
        if (!write(stream, chunk)) {
            await onceDrain(stream);
        }
        if (CHUNK_DELAY_MS > 0 && end < count) {
            await sleep(CHUNK_DELAY_MS);
        }
    }
    await new Promise<void>((resolve, reject) => {
        stream.on("error", reject);
        stream.on("finish", () => resolve());
        stream.end();
    });
}

/** Node stream write() returning false means backpressure; wait for drain. */
function write(stream: NodeJS.WritableStream, chunk: string): boolean {
    return stream.write(chunk);
}
function onceDrain(stream: NodeJS.WritableStream): Promise<void> {
    return new Promise((resolve) => stream.once("drain", resolve));
}

// ---------------------------------------------------------------------------
// createMany baseline
// ---------------------------------------------------------------------------
async function batchInsertProducts(count: number, sellerIds: string[]): Promise<void> {
    // Smaller than the old 5k: keeps each statement's lock/WAL footprint low
    const BATCH_ROWS = intEnv("SEED_CHUNK_BATCH", 2_000);
    for (let start = 0; start < count; start += BATCH_ROWS) {
        const end = Math.min(start + BATCH_ROWS, count);
        await prisma.product.createMany({
            data: Array.from({ length: end - start }, (_, k) => {
                const p = generateProduct(start + k, sellerIds);
                return {
                    id: p.id,
                    sellerId: p.sellerId,
                    title: p.title,
                    description: p.description,
                    price: p.price,
                    isPublished: true,
                    category: p.category,
                    images: [p.image],
                };
            }),
        });
        process.stdout.write(`  batched ${end}/${count}\r`);
        if (CHUNK_DELAY_MS > 0 && end < count) {
            await sleep(CHUNK_DELAY_MS);
        }
    }
    process.stdout.write("\n");
}

// ---------------------------------------------------------------------------
// shared helpers
// ---------------------------------------------------------------------------
async function resetTables(): Promise<void> {
    await prisma.$executeRawUnsafe(
        `TRUNCATE "CartItem","FileAsset","PurchaseItem","Product" CASCADE`,
    );
}

async function createSellers(total: number): Promise<string[]> {
    await prisma.user.createMany({
        data: Array.from({ length: total }, (_, i) => ({
            id: `seller_${productId(i)}`,
            name: `Bulk Seller ${i}`,
            email: `bulk-seller-${i}@devcart.test`,
            username: `bulkseller${i}`,
        })),
        skipDuplicates: true,
    });
    const sellers = await prisma.user.findMany({
        where: { email: { startsWith: "bulk-seller-" } },
        select: { id: true },
    });
    return sellers.map((s) => s.id);
}

/**
 * Spread created/updated timestamps deterministically over the last 180
 * days so that (updatedAt DESC, id DESC) has realistic variety.
 */
async function spreadTimestamps(): Promise<void> {
    await prisma.$executeRawUnsafe(`
        UPDATE "Product" AS p
        SET "createdAt" = ts, "updatedAt" = ts
        FROM (
            SELECT
                "id",
                NOW() - (
                    ROW_NUMBER() OVER (ORDER BY "id") * INTERVAL '180 days'
                    / GREATEST(COUNT(*) OVER (), 1)
                ) AS ts
            FROM "Product"
        ) AS sub
        WHERE p."id" = sub."id"
    `);
}

async function truncateAndSeedSellers(sellerCount: number): Promise<string[]> {
    console.log("Truncating product tables...");
    await resetTables();
    console.log(`Creating ${sellerCount} sellers...`);
    return createSellers(sellerCount);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
    const count = Number(process.env.SEED_COUNT ?? 200_000);
    const sellerCount = Number(process.env.SEED_SELLERS ?? 200);
    const mode = process.env.SEED_MODE ?? "copy";

    if (!Number.isInteger(count) || count < 1) {
        throw new Error("SEED_COUNT must be a positive integer");
    }

    if (mode === "copy" || mode === "bench") {
        const pg = await import("pg");
        pgClient = new pg.Client({ connectionString: SEED_URL });
        await pgClient.connect();
    }

    async function runCopy(): Promise<number> {
        const sellerIds = await truncateAndSeedSellers(sellerCount);
        console.log(`COPY-inserting ${count} products...`);
        const t0 = performance.now();
        await copyInsertProducts(pgClient!, count, sellerIds);
        const secs = (performance.now() - t0) / 1000;
        console.log(
            `COPY done in ${secs.toFixed(2)}s (${Math.round(count / secs).toLocaleString()} rows/s)`,
        );
        return secs;
    }

    async function runBatch(): Promise<number> {
        const sellerIds = await truncateAndSeedSellers(sellerCount);
        console.log(`createMany-inserting ${count} products...`);
        const t0 = performance.now();
        await batchInsertProducts(count, sellerIds);
        const secs = (performance.now() - t0) / 1000;
        console.log(
            `createMany done in ${secs.toFixed(2)}s (${Math.round(count / secs).toLocaleString()} rows/s)`,
        );
        return secs;
    }

    console.log(`Seeding ${count.toLocaleString()} products (mode: ${mode})`);
    const timings: Record<string, number> = {};

    if (mode === "copy") await runCopy();
    else if (mode === "batch") await runBatch();
    else if (mode === "bench") {
        timings.createMany = await runBatch();
        timings.copy = await runCopy();
    } else {
        throw new Error(`Unknown SEED_MODE "${mode}" (copy|batch|bench)`);
    }

    console.log("Spreading timestamps over the past 180 days...");
    await spreadTimestamps();

    const [{ count: inserted }] = (await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint AS count FROM "Product"`,
    )) ?? [{ count: BigInt(0) }];
    console.log(`✅ Products in database: ${inserted.toLocaleString()}`);

    if (mode === "bench") {
        const speedup = timings.createMany / timings.copy;
        console.log("\n=== Import benchmark ===");
        console.log(
            `createMany: ${timings.createMany.toFixed(2)}s\n` +
                `COPY:       ${timings.copy.toFixed(2)}s\n` +
                `COPY is ${speedup.toFixed(1)}x faster`,
        );
    }

    await pgClient?.end();
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await pgClient?.end().catch(() => {});
        await prisma.$disconnect();
        process.exit(1);
    });
