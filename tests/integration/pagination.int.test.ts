/**
 * Keyset pagination integration tests against a REAL PostgreSQL database.
 *
 * Requirements:
 *   - Docker: `docker compose up -d postgres` (see docker-compose.yml)
 *   - TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/devcart_test
 *
 * The suite is skipped entirely when TEST_DATABASE_URL is not set, so
 * `pnpm test` stays green without a database. Schema is pushed
 * automatically before the tests run.
 *
 * Invariants verified here (the whole point of keyset pagination):
 *   1. Walking all pages yields zero duplicates and zero gaps.
 *   2. Category-filtered walks cover exactly that category's rows.
 *   3. A walk in progress is stable when rows are inserted or touched
 *      mid-walk: no duplicates ever appear; only rows whose updatedAt
 *      moved AHEAD of the cursor can be missed (documented behavior).
 *   4. Tampered cursors are rejected with HTTP 400 by the BFF route.
 */
import { execSync } from "child_process";
import path from "path";

import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

process.env.CURSOR_SECRET = "integration-cursor-secret";

// route-handler mocks (auth + rate limit) so we can drive the real HTTP layer
const mocks = vi.hoisted(() => ({
    auth: vi.fn(async () => ({ user: { id: "integration-user" } })),
    limit: vi.fn(async () => ({ success: true })),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/ratelimit", () => ({
    browseRatelimit: { limit: mocks.limit },
}));

// Redirect ALL Prisma access (the service singleton included) to the
// throwaway test database. Never touches the configured cloud database.
let currentTestClient: PrismaClient | null = null;
vi.mock("@/lib/prisma", () => ({
    get default() {
        if (!currentTestClient) {
            throw new Error("integration test client not initialized");
        }
        return currentTestClient;
    },
}));

import { GET as productsGET } from "@/app/api/products/route";
import { listProducts } from "@/lib/products";
import { encodeCursor } from "@/lib/cursor";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const CATEGORIES = ["Templates", "Icons", "Education"] as const;
const TOTAL = 300;
const PAGE = 40;

function makeTestDb(): PrismaClient {
    const adapter = new PrismaPg({ connectionString: TEST_DATABASE_URL });
    return new PrismaClient({ adapter });
}

/** Reset the test database to the current migration state (cross-platform).
 *  Uses the real migration chain rather than `db push` so renames and data
 *  migrations are exercised exactly as they ship. */
function pushSchema() {
    const cwd = path.resolve(__dirname, "../..");
    execSync(`npx prisma migrate reset --force`, {
        cwd,
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
        stdio: "pipe",
    });
}

function makeProduct(i: number): {
    id: string;
    sellerId: string;
    title: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    isPublished: boolean;
} {
    return {
        id: `int_${i.toString(36).padStart(6, "0")}`,
        sellerId: "int_test_seller",
        title: `Integration Product ${i}`,
        description: `Seeded integration product #${i}`,
        price: 100 + i,
        category: CATEGORIES[i % CATEGORIES.length],
        images: [`https://example.com/img-${i}.png`],
        isPublished: true,
    };
}

async function walkAllPages(
    params: Parameters<typeof listProducts>[0] & { pageSize?: number },
): Promise<{ ids: string[]; cursorsUsed: number }> {
    const ids: string[] = [];
    const seen = new Set<string>();
    let cursor: string | null | undefined =
        params.cursor === undefined ? undefined : params.cursor;
    let cursorsUsed = 0;

    // first call without cursor, then follow nextCursor to exhaustion
    let page = await listProducts({ ...params, cursor: null, limit: PAGE });
    for (;;) {
        for (const item of page.items) {
            if (seen.has(item.id)) throw new Error(`duplicate id ${item.id}`);
            seen.add(item.id);
            ids.push(item.id);
        }
        if (!page.nextCursor) break;
        cursor = page.nextCursor;
        cursorsUsed++;
        page = await listProducts({
            ...params,
            cursor,
            limit: PAGE,
        });
    }
    return { ids, cursorsUsed };
}

describe.skipIf(!TEST_DATABASE_URL)("keyset pagination (real database)", () => {
    let prisma: PrismaClient;

    beforeAll(async () => {
        pushSchema();
        currentTestClient = makeTestDb();
        prisma = currentTestClient;

        await prisma.$executeRawUnsafe(
            `TRUNCATE "CartItem","FileAsset","PurchaseItem","Product" CASCADE`,
        );
        await prisma.user.createMany({
            data: [
                {
                    id: "int_test_seller",
                    name: "Integration Seller",
                    email: "integration-seller@devcart.test",
                    username: "integrationseller",
                },
            ],
            skipDuplicates: true,
        });
        await prisma.product.createMany({
            data: Array.from({ length: TOTAL }, (_, i) => makeProduct(i)),
        });
    }, 180_000);

    afterAll(async () => {
        await prisma?.$disconnect();
    });

    it("covers every product exactly once across all pages", async () => {
        const { ids } = await walkAllPages({});

        expect(ids).toHaveLength(TOTAL);
        expect(new Set(ids).size).toBe(TOTAL);

        const expected = (
            await prisma.product.findMany({
                orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
                select: { id: true },
            })
        ).map((r) => r.id);
        expect(ids).toEqual(expected);
    });

    it("category filtering covers exactly that category's rows", async () => {
        const { ids } = await walkAllPages({ category: "Icons" });

        const expected = (
            await prisma.product.findMany({
                where: { category: "Icons" },
                orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
                select: { id: true },
            })
        ).map((r) => r.id);

        expect(ids).toEqual(expected);
        expect(ids.length).toBeGreaterThan(0);
        expect(ids.length).toBeLessThan(TOTAL);
    });

    it("keeps an in-progress walk stable while rows are inserted and touched", async () => {
        // snapshot of the world at walk start
        const snapshot = (
            await prisma.product.findMany({
                orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
                select: { id: true },
            })
        ).map((r) => r.id);

        // consume one page, then churn the data behind the walk
        const firstPage = await listProducts({ limit: PAGE });
        expect(firstPage.nextCursor).toBeTruthy();
        const walkedSoFar = new Set(firstPage.items.map((i) => i.id));

        const insertedIds = Array.from({ length: 5 }, (_, k) => `int_new_${k}`);
        await prisma.product.createMany({
            data: insertedIds.map((id, k) => ({
                ...makeProduct(10_000 + k),
                id,
            })),
        });
        // touch a slice of FUTURE rows so their updatedAt jumps ahead of
        // the cursor position -> they legitimately escape the walk
        const futureTargets = snapshot.filter((id) => !walkedSoFar.has(id)).slice(-20);
        await prisma.$executeRawUnsafe(
            `UPDATE "Product" SET "updatedAt" = NOW() WHERE "id" = ANY($1::text[])`,
            futureTargets,
        );

        // continue the SAME walk using the pre-churn cursor
        const remainingIds: string[] = [];
        const remainingSeen = new Set<string>();
        let page = await listProducts({
            cursor: firstPage.nextCursor!,
            limit: PAGE,
        });
        for (;;) {
            for (const item of page.items) {
                if (remainingSeen.has(item.id))
                    throw new Error(`duplicate id ${item.id}`);
                remainingSeen.add(item.id);
                remainingIds.push(item.id);
            }
            if (!page.nextCursor) break;
            page = await listProducts({ cursor: page.nextCursor!, limit: PAGE });
        }

        const walkedAll = [...firstPage.items.map((i) => i.id), ...remainingIds];

        // no duplicates anywhere
        expect(new Set(walkedAll).size).toBe(walkedAll.length);
        // inserts never leak into an in-progress walk
        expect(walkedAll.filter((id) => insertedIds.includes(id))).toEqual([]);
        // every untouched snapshot row was visited; only the touched
        // rows (moved ahead of the cursor) escaped
        const missed = snapshot.filter(
            (id) => !walkedAll.includes(id) && !walkedSoFar.has(id),
        );
        expect([...missed].sort()).toEqual([...futureTargets].sort());
    });

    it("rejects tampered cursors with HTTP 400 through the API route", async () => {
        const genuine = encodeCursor({
            u: new Date().toISOString(),
            i: "prod_1",
        });
        // flip a character in the signature
        const tampered = genuine.slice(0, -3) + "xxx";

        const res = await productsGET(
            new NextRequest(
                `http://localhost:3000/api/products?cursor=${encodeURIComponent(tampered)}`,
            ),
        );
        expect(res.status).toBe(400);

        // sanity: the genuine cursor passes signature verification and
        // reaches the database
        const ok = await productsGET(
            new NextRequest(
                `http://localhost:3000/api/products?cursor=${encodeURIComponent(genuine)}&limit=5`,
            ),
        );
        expect(ok.status).toBe(200);
        const body = await ok.json();
        expect(Array.isArray(body.items)).toBe(true);
    });

    it("returns pages through the API route that match the service", async () => {
        const res = await productsGET(
            new NextRequest("http://localhost:3000/api/products?limit=25"),
        );
        expect(res.status).toBe(200);
        const body = await res.json();

        const servicePage = await listProducts({ limit: 25 });
        expect(body.items.map((i: { id: string }) => i.id)).toEqual(
            servicePage.items.map((i) => i.id),
        );
        // both must hand out a cursor while more pages remain
        expect(body.nextCursor).toBeTruthy();
    });
});
