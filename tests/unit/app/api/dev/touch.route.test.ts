import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    executeRawUnsafe: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    default: { $executeRawUnsafe: mocks.executeRawUnsafe },
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/dev/touch/route";

function makeRequest(query = "", headers: Record<string, string> = {}) {
    return new NextRequest(`http://localhost:3000/api/dev/touch${query}`, {
        method: "POST",
        headers,
    });
}

describe("POST /api/dev/touch", () => {
    const SECRET = "dev-admin-secret";

    beforeEach(() => {
        process.env.ADMIN_SECRET = SECRET;
        mocks.executeRawUnsafe.mockResolvedValue(10);
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("404s without the admin secret header", async () => {
        const res = await POST(makeRequest());

        expect(res.status).toBe(404);
        expect(mocks.executeRawUnsafe).not.toHaveBeenCalled();
    });

    it("404s when ADMIN_SECRET is not configured (disabled by default)", async () => {
        delete process.env.ADMIN_SECRET;

        const res = await POST(makeRequest("", { "x-admin-secret": SECRET }));

        expect(res.status).toBe(404);
    });

    it("rejects the wrong secret", async () => {
        const res = await POST(makeRequest("", { "x-admin-secret": "wrong" }));

        expect(res.status).toBe(404);
    });

    it.each([
        ["?count=0", "zero count"],
        ["?count=-1", "negative count"],
        ["?count=501", "over max"],
        ["?count=abc", "non-numeric"],
        ["?count=1.5", "fractional"],
    ])("rejects %s (%s)", async (query) => {
        const res = await POST(makeRequest(query, { "x-admin-secret": SECRET }));

        expect(res.status).toBe(400);
        expect(mocks.executeRawUnsafe).not.toHaveBeenCalled();
    });

    it("defaults to 50 and passes a bounded parameter to the UPDATE", async () => {
        const res = await POST(makeRequest("", { "x-admin-secret": SECRET }));

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ touched: 10 });
        const [sql, param] = mocks.executeRawUnsafe.mock.calls[0];
        expect(sql).toContain('UPDATE "Product"');
        expect(sql).toContain("random()");
        expect(param).toBe(50);
    });

    it("accepts a mid-range count verbatim", async () => {
        await POST(makeRequest("?count=250", { "x-admin-secret": SECRET }));
        expect(mocks.executeRawUnsafe.mock.calls[0][1]).toBe(250);
    });

    it("returns a generic 500 on database failure", async () => {
        mocks.executeRawUnsafe.mockRejectedValue(new Error("db down"));

        const res = await POST(makeRequest("", { "x-admin-secret": SECRET }));

        expect(res.status).toBe(500);
        await expect(res.json()).resolves.toEqual({
            error: "Failed to touch products.",
        });
    });
});
