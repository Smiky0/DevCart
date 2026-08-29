import { Prisma } from "@/lib/generated/prisma/client";
import { InvalidCursorError } from "@/lib/paginationErrors";
import prisma from "@/lib/prisma";
import { decodeCursor, encodeCursor } from "@/lib/cursor";

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;
const MAX_QUERY_LENGTH = 100;

export interface ProductPage {
    items: {
        id: string;
        title: string;
        category: string;
        price: number;
        images: string[];
    }[];
    nextCursor: string | null;
}

export interface ListProductsParams {
    cursor?: string | null;
    category?: string | null;
    q?: string | null;
    limit?: number | null;
}

interface ProductRow {
    id: string;
    title: string;
    category: string;
    price: number;
    images: string[];
    updatedAt: Date;
}

/** Escape LIKE wildcards so user input can't inject % or _ patterns. */
function escapeLike(term: string): string {
    return term.replace(/[\\%_]/g, "\\$&");
}

/**
 * Keyset ("cursor") pagination over products, ordered by
 * (updatedAt DESC, id DESC) to match the composite browse indexes.
 *
 * Uses PostgreSQL's row-value comparison `(updated_at, id) < (...)`,
 * which performs a single index seek regardless of depth (EXPLAIN shows
 * an Index Only Scan with zero filtered rows). The equivalent Prisma
 * OR-emulation forces a full index scan + filter, so this one query is
 * intentionally raw; all values are bound parameters.
 */
export async function listProducts({
    cursor,
    category,
    q,
    limit,
}: ListProductsParams): Promise<ProductPage> {
    const take = Math.min(
        Math.max(Math.trunc(limit ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE, 1),
        MAX_PAGE_SIZE,
    );

    let cursorUpdatedAt: Date | undefined;
    let cursorId: string | undefined;
    if (cursor) {
        const parsed = decodeCursor(cursor);
        if (!parsed) throw new InvalidCursorError();
        cursorUpdatedAt = new Date(parsed.u);
        cursorId = parsed.i;
    }

    const cursorSql =
        cursorUpdatedAt && cursorId
            ? Prisma.sql`AND ("updatedAt", "id") < (${cursorUpdatedAt}, ${cursorId})`
            : Prisma.empty;

    const categorySql = category
        ? Prisma.sql`AND "category" = ${category}`
        : Prisma.empty;

    const term = q ? escapeLike(q.slice(0, MAX_QUERY_LENGTH)) : null;
    const searchSql = term
        ? Prisma.sql`AND ("title" ILIKE ${`%${term}%`} ESCAPE '\\' OR "category" ILIKE ${`%${term}%`} ESCAPE '\\')`
        : Prisma.empty;

    // fetch one extra row to detect whether another page exists cheaply
    const rows = await prisma.$queryRaw<ProductRow[]>(
        Prisma.sql`
            SELECT "id", "title", "category", "price", "images", "updatedAt"
            FROM "Product"
            WHERE "isPublished" = TRUE
                ${cursorSql}
                ${categorySql}
                ${searchSql}
            ORDER BY "updatedAt" DESC, "id" DESC
            LIMIT ${take + 1}
        `,
    );

    const hasNextPage = rows.length > take;
    const items = hasNextPage ? rows.slice(0, -1) : rows;
    const last = items[items.length - 1];

    return {
        items: items.map(({ id, title, category, price, images }) => ({
            id,
            title,
            category,
            price,
            images,
        })),
        nextCursor:
            hasNextPage && last
                ? encodeCursor({
                      u: last.updatedAt.toISOString(),
                      i: last.id,
                  })
                : null,
    };
}
