import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    default: { $queryRaw: mocks.queryRaw },
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
    it("returns ok when the database is reachable", async () => {
        mocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);

        const res = await GET();

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ status: "ok" });
    });

    it("returns 503 when the database is unreachable", async () => {
        mocks.queryRaw.mockRejectedValue(new Error("connection refused"));

        const res = await GET();

        expect(res.status).toBe(503);
        await expect(res.json()).resolves.toEqual({
            status: "error",
            message: "Database unreachable",
        });
    });
});
