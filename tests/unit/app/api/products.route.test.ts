import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    listProducts: vi.fn(),
    browseLimit: vi.fn(),
    sentryCapture: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
// NOTE: no importOriginal here - the real module would construct a
// PrismaClient through @/lib/prisma, which needs a database adapter.
vi.mock("@/lib/products", () => ({
    listProducts: mocks.listProducts,
    DEFAULT_PAGE_SIZE: 12,
    MAX_PAGE_SIZE: 50,
}));
vi.mock("@/lib/ratelimit", () => ({
    browseRatelimit: { limit: mocks.browseLimit },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.sentryCapture }));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/products/route";
import { InvalidCursorError } from "@/lib/paginationErrors";

function makeRequest(query = "") {
    return new NextRequest(`http://localhost:3000/api/products${query}`);
}

const validPage = {
    items: [
        {
            id: "prod_1",
            title: "A",
            category: "Templates",
            price: 1999,
            images: ["img.png"],
        },
    ],
    nextCursor: null,
};

describe("GET /api/products", () => {
    beforeEach(() => {
        mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
        mocks.browseLimit.mockResolvedValue({ success: true });
        mocks.listProducts.mockResolvedValue(validPage);
        vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it("returns the product page with monitoring headers", async () => {
        const res = await GET(makeRequest("?category=Icons&limit=6"));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.items).toEqual(validPage.items);
        expect(body.nextCursor).toBeNull();
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(res.headers.get("server-timing")).toMatch(/^db;dur=/);
        expect(mocks.listProducts).toHaveBeenCalledWith({
            cursor: null,
            category: "Icons",
            q: null,
            limit: 6,
        });
    });

    it("rate-limits before touching the database", async () => {
        mocks.browseLimit.mockResolvedValue({ success: false });

        const res = await GET(makeRequest());

        expect(res.status).toBe(429);
        await expect(res.json()).resolves.toEqual({
            error: "Too many requests.",
        });
        expect(mocks.listProducts).not.toHaveBeenCalled();
    });

    it("falls back to the client IP for anonymous rate limiting", async () => {
        mocks.auth.mockResolvedValue(null);

        await GET(
            new NextRequest("http://localhost:3000/api/products", {
                headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18" },
            }),
        );

        expect(mocks.browseLimit).toHaveBeenCalledWith("203.0.113.7");
    });

    it.each([
        ["?limit=0", "zero limit"],
        ["?limit=-3", "negative limit"],
        ["?limit=51", "over max"],
        ["?limit=abc", "non-numeric limit"],
        ["?limit=2.5", "fractional limit"],
    ])("rejects %s (%s)", async (query) => {
        const res = await GET(makeRequest(query));

        expect(res.status).toBe(400);
        expect(mocks.listProducts).not.toHaveBeenCalled();
    });

    it("maps an invalid cursor to 400 without leaking internals", async () => {
        mocks.listProducts.mockRejectedValue(new InvalidCursorError());

        const res = await GET(makeRequest("?cursor=v1.tampered.sig"));

        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({ error: "Invalid cursor." });
        expect(mocks.sentryCapture).not.toHaveBeenCalled();
    });

    it("returns a generic 500 and reports to Sentry on unexpected errors", async () => {
        mocks.listProducts.mockRejectedValue(new Error("db exploded"));

        const res = await GET(makeRequest());

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe("Failed to list products.");
        expect(JSON.stringify(body)).not.toContain("db exploded");
        expect(mocks.sentryCapture).toHaveBeenCalledWith(expect.any(Error));
    });

    it("logs slow queries above the monitoring threshold", async () => {
        vi.useFakeTimers({ toFake: ["performance"] });
        const warn = vi.spyOn(console, "warn");
        mocks.listProducts.mockImplementation(async () => {
            vi.advanceTimersByTime(1500);
            return validPage;
        });

        const res = await GET(makeRequest());

        expect(res.status).toBe(200);
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("slow /api/products query"),
        );
        // fast queries stay silent
        warn.mockClear();
        mocks.listProducts.mockResolvedValue(validPage);
        await GET(makeRequest());
        expect(warn).not.toHaveBeenCalled();
    });
});
