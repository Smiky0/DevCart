import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    default: { $queryRaw: mocks.queryRaw },
}));

import { InvalidCursorError } from "@/lib/paginationErrors";
import { Prisma } from "@/lib/generated/prisma/client";
import { encodeCursor } from "@/lib/cursor";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, listProducts } from "@/lib/products";

process.env.CURSOR_SECRET = "test-cursor-secret";

function makeRow(i: number) {
    return {
        id: `prod_${i}`,
        title: `Product ${i}`,
        category: "Templates",
        price: 1000 + i,
        images: ["img.png"],
        updatedAt: new Date(Date.UTC(2026, 0, 1) - i * 1000),
    };
}

/** $queryRaw receives one composed Prisma.Sql per call. */
function sqlObjectOf(callIndex: number): Prisma.Sql {
    return mocks.queryRaw.mock.calls[callIndex][0] as Prisma.Sql;
}

/** The parameterized SQL text of the nth query ($1, $2, ...). */
function sqlOf(callIndex: number): string {
    return sqlObjectOf(callIndex).sql;
}

/** Bound parameter values of the nth query, in order. */
function paramsOf(callIndex: number): unknown[] {
    return [...sqlObjectOf(callIndex).values];
}

describe("listProducts", () => {
    beforeEach(() => {
        mocks.queryRaw.mockReset();
    });

    it("returns a page without a cursor when the result fills exactly", async () => {
        mocks.queryRaw.mockResolvedValue(
            Array.from({ length: DEFAULT_PAGE_SIZE }, (_, i) => makeRow(i)),
        );

        const page = await listProducts({});

        expect(page.items).toHaveLength(DEFAULT_PAGE_SIZE);
        expect(page.nextCursor).toBeNull();
        // LIMIT is take+1 so exhaustion is detectable in one query
        expect(paramsOf(0).at(-1)).toBe(DEFAULT_PAGE_SIZE + 1);
        expect(sqlOf(0)).toContain('ORDER BY "updatedAt" DESC, "id" DESC');
        // no row-value seek predicate without a cursor
        expect(sqlOf(0)).not.toContain("< (");
    });

    it("returns a signed nextCursor when more pages exist", async () => {
        const rows = Array.from({ length: DEFAULT_PAGE_SIZE + 1 }, (_, i) => makeRow(i));
        mocks.queryRaw.mockResolvedValue(rows);

        const page = await listProducts({});

        // extra row must be sliced off
        expect(page.items).toHaveLength(DEFAULT_PAGE_SIZE);
        expect(page.nextCursor).not.toBeNull();
        const last = rows[DEFAULT_PAGE_SIZE - 1];
        const [json] = decodeParts(page.nextCursor!);
        expect(JSON.parse(json)).toEqual({
            u: last.updatedAt.toISOString(),
            i: last.id,
        });
    });

    function decodeParts(cursor: string): [string, string] {
        const [, body, sig] = cursor.split(".");
        expect(sig).toBeTruthy();
        return [Buffer.from(body, "base64url").toString("utf8"), sig];
    }

    it("binds the row-value seek parameters from a valid cursor", async () => {
        mocks.queryRaw.mockResolvedValue([]);
        const anchor = makeRow(5);

        await listProducts({
            cursor: encodeCursor({
                u: anchor.updatedAt.toISOString(),
                i: anchor.id,
            }),
        });

        expect(sqlOf(0)).toContain("< (");
        const params = paramsOf(0);
        // the service re-creates the Date from the signed payload
        expect(params.find((p) => p instanceof Date)?.toISOString()).toBe(
            anchor.updatedAt.toISOString(),
        );
        expect(params).toContain(anchor.id);
    });

    it("throws InvalidCursorError for tampered cursors before querying", async () => {
        await expect(listProducts({ cursor: "v1.abc.tampered" })).rejects.toThrow(
            InvalidCursorError,
        );
        expect(mocks.queryRaw).not.toHaveBeenCalled();
    });

    it("combines cursor, category and search clauses with bound parameters", async () => {
        mocks.queryRaw.mockResolvedValue([]);
        const anchor = makeRow(9);

        await listProducts({
            cursor: encodeCursor({
                u: anchor.updatedAt.toISOString(),
                i: anchor.id,
            }),
            category: "Icons",
            q: "50%_off",
        });

        const sql = sqlOf(0);
        expect(sql).toContain('"category" =');
        // wildcards must be escaped, then wrapped in ILIKE bounds
        expect(sql).toContain("ILIKE");
        const likeParam = paramsOf(0).find(
            (p) => typeof p === "string" && p.includes("%"),
        );
        expect(likeParam).toBe("%50\\%\\_off%");
        expect(sql.match(/AND/g)?.length).toBeGreaterThanOrEqual(3);
    });

    it("truncates overlong search terms", async () => {
        mocks.queryRaw.mockResolvedValue([]);

        await listProducts({ q: "x".repeat(500) });

        const likeParam = paramsOf(0).find(
            (p) => typeof p === "string" && p.startsWith("%"),
        ) as string;
        // %term% wrapper adds 2 chars around the 100-char cap
        expect(likeParam.length).toBe(102);
    });

    it.each([
        [undefined, DEFAULT_PAGE_SIZE],
        [null, DEFAULT_PAGE_SIZE],
        [0, DEFAULT_PAGE_SIZE], // falsy -> falls back to the default size
        [-5, 1],
        [7, 7],
        [999, MAX_PAGE_SIZE],
        [3.9, 3],
        [NaN, DEFAULT_PAGE_SIZE],
    ])("clamps limit %s to take %i", async (limit, expectedTake) => {
        mocks.queryRaw.mockResolvedValue([]);

        await listProducts({ limit: limit as number | undefined | null });

        expect(paramsOf(0).at(-1)).toBe(expectedTake + 1);
    });
});
