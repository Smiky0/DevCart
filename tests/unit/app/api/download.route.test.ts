import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    downloadLimit: vi.fn(),
    fileAssetFindUnique: vi.fn(),
    purchaseItemFindFirst: vi.fn(),
    r2Send: vi.fn(),
    getCommands: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/ratelimit", () => ({
    downloadRatelimit: { limit: mocks.downloadLimit },
}));

vi.mock("@/lib/prisma", () => ({
    default: {
        fileAsset: { findUnique: mocks.fileAssetFindUnique },
        purchaseItem: { findFirst: mocks.purchaseItemFindFirst },
    },
}));

vi.mock("@/lib/cloudflareR2", () => ({ r2: { send: mocks.r2Send } }));

vi.mock("@aws-sdk/client-s3", () => ({
    GetObjectCommand: class {
        constructor(input: Record<string, unknown>) {
            mocks.getCommands.push(input);
        }
    },
}));

import type { NextRequest } from "next/server";
import { GET } from "@/app/api/download/[assetId]/route";

const userId = "user-1";
const assetId = "asset-1";
const sellerId = "seller-1";

function makeFileAsset(overrides: Record<string, unknown> = {}) {
    return {
        id: assetId,
        productId: "product-1",
        fileName: "bundle.zip",
        storageKey: "uploads/seller-1/uuid",
        product: {
            id: "product-1",
            sellerId,
            purchaseItems: [],
        },
        ...overrides,
    };
}

function makeRequest() {
    return {
        url: `http://localhost:3000/api/download/${assetId}`,
    } as NextRequest;
}

function callGet() {
    return GET(makeRequest(), { params: Promise.resolve({ assetId }) });
}

describe("GET /api/download/[assetId]", () => {
    const originalPrivate = process.env.R2_PRIVATE_BUCKET;

    beforeEach(() => {
        process.env.R2_PRIVATE_BUCKET = "devcart-private";
        mocks.auth.mockResolvedValue({ user: { id: userId } });
        mocks.downloadLimit.mockResolvedValue({ success: true });
        mocks.fileAssetFindUnique.mockResolvedValue(makeFileAsset());
        mocks.purchaseItemFindFirst.mockResolvedValue(null);
        mocks.r2Send.mockResolvedValue({
            Body: { transformToWebStream: () => new ReadableStream() },
            ContentType: undefined,
            ContentLength: 2048,
        });
    });

    afterEach(() => {
        if (originalPrivate === undefined) delete process.env.R2_PRIVATE_BUCKET;
        else process.env.R2_PRIVATE_BUCKET = originalPrivate;
    });

    it("returns 401 for unauthenticated requests", async () => {
        mocks.auth.mockResolvedValue(null);

        const res = await callGet();

        expect(res.status).toBe(401);
        expect(mocks.downloadLimit).not.toHaveBeenCalled();
    });

    it("returns 429 when the rate limit is exceeded", async () => {
        mocks.downloadLimit.mockResolvedValue({ success: false });

        const res = await callGet();

        expect(res.status).toBe(429);
        expect(mocks.downloadLimit).toHaveBeenCalledWith(userId);
        expect(mocks.fileAssetFindUnique).not.toHaveBeenCalled();
    });

    it("returns 404 when the asset does not exist", async () => {
        mocks.fileAssetFindUnique.mockResolvedValue(null);

        const res = await callGet();

        expect(res.status).toBe(404);
        await expect(res.json()).resolves.toEqual({ error: "Asset not found" });
    });

    it("looks up only the fields needed for the ownership check", async () => {
        await callGet();

        expect(mocks.fileAssetFindUnique).toHaveBeenCalledWith({
            where: { id: assetId },
            select: {
                productId: true,
                storageKey: true,
                fileName: true,
                product: { select: { sellerId: true } },
            },
        });
    });

    it("returns 403 when the user neither owns nor purchased the product", async () => {
        const res = await callGet();

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: "You haven't purchased this product",
        });
        expect(mocks.r2Send).not.toHaveBeenCalled();
    });

    it("allows the buyer who purchased the product and streams the file", async () => {
        mocks.purchaseItemFindFirst.mockResolvedValue({ id: "pi-1" });
        mocks.fileAssetFindUnique.mockResolvedValue(
            makeFileAsset({
                fileName: "guide.pdf",
                product: { id: "product-1", sellerId, purchaseItems: [] },
            }),
        );

        const res = await callGet();

        expect(res.status).toBe(200);
        expect(mocks.purchaseItemFindFirst).toHaveBeenCalledWith({
            where: {
                productId: "product-1",
                purchase: { buyerId: userId },
            },
        });
        expect(mocks.getCommands[0]).toEqual({
            Bucket: "devcart-private",
            Key: "uploads/seller-1/uuid",
        });
        expect(res.headers.get("content-type")).toBe("application/pdf");
        expect(res.headers.get("content-disposition")).toBe(
            'attachment; filename="guide.pdf"',
        );
        expect(res.headers.get("content-length")).toBe("2048");
    });

    it("allows the seller to download their own asset without a purchase", async () => {
        mocks.fileAssetFindUnique.mockResolvedValue(
            makeFileAsset({
                product: { id: "product-1", sellerId: userId, purchaseItems: [] },
            }),
        );

        const res = await callGet();

        expect(res.status).toBe(200);
        expect(mocks.purchaseItemFindFirst).toHaveBeenCalledWith({
            where: {
                productId: "product-1",
                purchase: { buyerId: userId },
            },
        });
    });

    it("prefers the content type returned by R2 over the extension map", async () => {
        mocks.purchaseItemFindFirst.mockResolvedValue({ id: "pi-1" });
        mocks.r2Send.mockResolvedValue({
            Body: { transformToWebStream: () => new ReadableStream() },
            ContentType: "application/x-r2-type",
            ContentLength: null,
        });

        const res = await callGet();

        expect(res.headers.get("content-type")).toBe("application/x-r2-type");
        expect(res.headers.get("content-length")).toBeNull();
    });

    it("falls back to octet-stream for unknown extensions", async () => {
        mocks.purchaseItemFindFirst.mockResolvedValue({ id: "pi-1" });
        mocks.fileAssetFindUnique.mockResolvedValue(
            makeFileAsset({ fileName: "mystery.xyz" }),
        );

        const res = await callGet();

        expect(res.headers.get("content-type")).toBe("application/octet-stream");
    });

    it("returns 500 when fetching the object from R2 fails", async () => {
        mocks.purchaseItemFindFirst.mockResolvedValue({ id: "pi-1" });
        mocks.r2Send.mockRejectedValue(new Error("r2 down"));

        const res = await callGet();

        expect(res.status).toBe(500);
        await expect(res.json()).resolves.toEqual({
            error: "Unable to fetch assets from server.",
        });
    });
});
