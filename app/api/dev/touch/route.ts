import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const MAX_TOUCH_COUNT = 500;

/**
 * Demo endpoint: simulates live product churn by bumping `updatedAt`
 * on N random products. Useful for demonstrating that keyset pagination
 * keeps browsing sessions stable while the underlying data changes.
 *
 * Guarded by the ADMIN_SECRET header so it can't be abused in production.
 */
export async function POST(request: NextRequest) {
    const secret = process.env.ADMIN_SECRET;
    if (!secret || request.headers.get("x-admin-secret") !== secret) {
        return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const countRaw = request.nextUrl.searchParams.get("count");
    const count =
        countRaw === null
            ? 50
            : Number.isInteger(Number(countRaw))
              ? Math.trunc(Number(countRaw))
              : NaN;
    if (isNaN(count) || count < 1 || count > MAX_TOUCH_COUNT) {
        return NextResponse.json(
            { error: `count must be an integer between 1 and ${MAX_TOUCH_COUNT}.` },
            { status: 400 },
        );
    }

    try {
        // random() ordering doesn't use the browse indexes, but this is a
        // dev/demo utility touching at most MAX_TOUCH_COUNT rows.
        const touched = await prisma.$executeRawUnsafe(
            `UPDATE "Product" SET "updatedAt" = NOW()
             WHERE "id" IN (
                 SELECT "id" FROM "Product" ORDER BY random() LIMIT $1
             )`,
            count,
        );
        return NextResponse.json({ touched });
    } catch (error) {
        console.error("POST /api/dev/touch failed:", error);
        return NextResponse.json({ error: "Failed to touch products." }, { status: 500 });
    }
}
