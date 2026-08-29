import { browseRatelimit } from "@/lib/ratelimit";
import { listProducts, MAX_PAGE_SIZE } from "@/lib/products";
import { InvalidCursorError } from "@/lib/paginationErrors";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

const SLOW_QUERY_MS = 1000;

function getClientKey(userId: string | undefined, request: NextRequest) {
    return (
        userId ??
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "anonymous"
    );
}

/**
 * Backend-for-frontend endpoint for product browsing.
 *
 * Centralizes: rate limiting, input validation, cursor signature
 * verification (tamper -> 400), slow-query monitoring and error
 * reporting. The shop's server components call `listProducts()`
 * directly; this route exists for client-side "load more" fetches
 * and any future consumers.
 */
export async function GET(request: NextRequest) {
    const startedAt = performance.now();

    const session = await auth();
    const { success } = await browseRatelimit.limit(
        getClientKey(session?.user?.id, request),
    );
    if (!success) {
        return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const params = request.nextUrl.searchParams;
    const limitRaw = params.get("limit");
    const limit =
        limitRaw === null
            ? null
            : Number.isInteger(Number(limitRaw))
              ? Number(limitRaw)
              : NaN;
    if (limit !== null && (isNaN(limit) || limit < 1 || limit > MAX_PAGE_SIZE)) {
        return NextResponse.json(
            { error: `limit must be an integer between 1 and ${MAX_PAGE_SIZE}.` },
            { status: 400 },
        );
    }

    try {
        const page = await listProducts({
            cursor: params.get("cursor"),
            category: params.get("category"),
            q: params.get("q"),
            limit,
        });

        const durationMs = performance.now() - startedAt;
        if (durationMs > SLOW_QUERY_MS) {
            console.warn(
                `[monitoring] slow /api/products query: ${durationMs.toFixed(0)}ms` +
                    ` (category=${params.get("category") ?? "-"} q=${params.get("q") ?? "-"})`,
            );
        }

        return NextResponse.json(page, {
            headers: {
                "Cache-Control": "no-store",
                "Server-Timing": `db;dur=${durationMs.toFixed(1)}`,
            },
        });
    } catch (error) {
        if (error instanceof InvalidCursorError) {
            return NextResponse.json({ error: "Invalid cursor." }, { status: 400 });
        }
        Sentry.captureException(error);
        console.error("GET /api/products failed:", error);
        return NextResponse.json({ error: "Failed to list products." }, { status: 500 });
    }
}
