/**
 * Pagination benchmark against a bulk-seeded database.
 *
 * ⚠️ ISOLATED BY DESIGN: only runs against the LOCAL Docker Postgres
 * (same guard as seed-bulk). Never points at hosted databases.
 *
 * Compares keyset (cursor) paging vs classic OFFSET paging at increasing
 * page depths, using identical SQL shapes so PostgreSQL performance is
 * directly comparable. Run AFTER `pnpm db:up && pnpm seed:bulk`.
 *
 * Options:
 *   BENCH_DEPTH   deepest page offset to probe (default 100000)
 *   BENCH_SAMPLES pages fetched per strategy/depth (default 20)
 *
 * Usage: pnpm db:up && pnpm seed:bulk && pnpm bench:pagination
 */
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const DEFAULT_LOCAL_URL = "postgresql://postgres:postgres@localhost:5432/devcart_test";

function resolveSeedUrl(): string {
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
            `Refusing to run benchmarks against "${host}". ` +
                `Only the local Docker Postgres is allowed (pnpm db:up).`,
        );
    }
    return url;
}

const adapter = new PrismaPg({ connectionString: resolveSeedUrl() });
const prisma = new PrismaClient({ adapter });

const PAGE_SIZE = 24;

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

async function timeKeyset(offset: number, samples: number): Promise<number> {
    // anchor cursor: row that would be first on the target page
    const anchorRows = await prisma.$queryRawUnsafe<{ updatedAt: Date; id: string }[]>(
        `SELECT "updatedAt", "id" FROM "Product"
         ORDER BY "updatedAt" DESC, "id" DESC
         OFFSET $1 LIMIT 1`,
        offset,
    );
    if (anchorRows.length === 0) return NaN;
    const { updatedAt, id } = anchorRows[0];

    const timings: number[] = [];
    for (let i = 0; i < samples; i++) {
        const t0 = performance.now();
        // row-value comparison, same as lib/products.ts
        await prisma.$queryRawUnsafe<unknown[]>(
            `SELECT "id" FROM "Product"
             WHERE ("updatedAt", "id") < ($1, $2)
             ORDER BY "updatedAt" DESC, "id" DESC
             LIMIT $3`,
            updatedAt,
            id,
            PAGE_SIZE,
        );
        timings.push(performance.now() - t0);
    }
    return median(timings);
}

async function timeOffsetPage(offset: number, samples: number): Promise<number> {
    const timings: number[] = [];
    for (let i = 0; i < samples; i++) {
        const t0 = performance.now();
        await prisma.$queryRawUnsafe<unknown[]>(
            `SELECT "id" FROM "Product"
             ORDER BY "updatedAt" DESC, "id" DESC
             OFFSET $1 LIMIT $2`,
            offset,
            PAGE_SIZE,
        );
        timings.push(performance.now() - t0);
    }
    return median(timings);
}

async function main() {
    const maxDepth = Number(process.env.BENCH_DEPTH ?? 100_000);
    const samples = Number(process.env.BENCH_SAMPLES ?? 20);

    const [{ count }] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint AS count FROM "Product"`,
    );
    console.log(
        `Benchmarking on ${count.toLocaleString()} products ` +
            `(page size ${PAGE_SIZE}, ${samples} samples per point)\n`,
    );

    const depths = [0, Math.floor(maxDepth / 100), Math.floor(maxDepth / 10), maxDepth];
    console.log("depth   | keyset (ms) | OFFSET (ms)");
    console.log("--------|-------------|------------");
    for (const depth of depths) {
        const keyset = await timeKeyset(depth, samples);
        const offset = await timeOffsetPage(depth, samples);
        console.log(
            `${depth.toLocaleString().padStart(7)} | ` +
                `${keyset.toFixed(2).padStart(11)} | ${offset.toFixed(2).padStart(10)}`,
        );
    }

    console.log(
        "\nKeyset stays flat as depth grows; OFFSET degrades because " +
            "PostgreSQL must scan+discard every skipped row.",
    );
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
