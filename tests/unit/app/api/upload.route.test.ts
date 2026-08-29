import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    uploadLimit: vi.fn(),
    getSignedUrl: vi.fn(),
    putCommands: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/ratelimit", () => ({
    uploadRatelimit: { limit: mocks.uploadLimit },
}));

vi.mock("@/lib/cloudflareR2", () => ({ r2: { send: vi.fn() } }));

vi.mock("@aws-sdk/client-s3", () => ({
    PutObjectCommand: class {
        constructor(input: Record<string, unknown>) {
            mocks.putCommands.push(input);
        }
    },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: mocks.getSignedUrl,
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/upload/route";

const userId = "user-1";
const session = { user: { id: userId } };

function makeRequest(body: unknown) {
    return new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
    });
}

describe("POST /api/upload", () => {
    const originalPublic = process.env.R2_PUBLIC_BUCKET;
    const originalPrivate = process.env.R2_PRIVATE_BUCKET;

    beforeEach(() => {
        process.env.R2_PUBLIC_BUCKET = "devcart-public";
        process.env.R2_PRIVATE_BUCKET = "devcart-private";
        mocks.putCommands.length = 0;
        mocks.auth.mockResolvedValue(session);
        mocks.uploadLimit.mockResolvedValue({ success: true });
        mocks.getSignedUrl.mockResolvedValue("https://signed.example.com/upload");
    });

    afterEach(() => {
        if (originalPublic === undefined) delete process.env.R2_PUBLIC_BUCKET;
        else process.env.R2_PUBLIC_BUCKET = originalPublic;
        if (originalPrivate === undefined) delete process.env.R2_PRIVATE_BUCKET;
        else process.env.R2_PRIVATE_BUCKET = originalPrivate;
    });

    it("returns 401 for unauthenticated requests", async () => {
        mocks.auth.mockResolvedValue(null);

        const res = await POST(makeRequest({ filename: "a.zip" }));

        expect(res.status).toBe(401);
        expect(mocks.getSignedUrl).not.toHaveBeenCalled();
    });

    it("returns 429 when the rate limit is exceeded", async () => {
        mocks.uploadLimit.mockResolvedValue({ success: false });

        const res = await POST(makeRequest({ filename: "a.zip" }));

        expect(res.status).toBe(429);
        expect(mocks.uploadLimit).toHaveBeenCalledWith(userId);
        expect(mocks.getSignedUrl).not.toHaveBeenCalled();
    });

    it("rate-limits before parsing the request body", async () => {
        mocks.uploadLimit.mockResolvedValue({ success: false });

        const res = await POST(
            new NextRequest("http://localhost:3000/api/upload", {
                method: "POST",
                body: "{broken",
                headers: { "content-type": "application/json" },
            }),
        );

        expect(res.status).toBe(429);
    });

    it("rejects filenames longer than 255 characters", async () => {
        const res = await POST(
            makeRequest({ filename: "x".repeat(256), fileType: "application/zip" }),
        );

        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({ error: "Invalid File" });
        expect(mocks.getSignedUrl).not.toHaveBeenCalled();
    });

    it.each([undefined, null, "", 123])(
        "rejects invalid filename: %s",
        async (filename) => {
            const res = await POST(
                makeRequest({ filename, fileType: "application/zip" }),
            );

            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({ error: "Invalid File" });
            expect(mocks.getSignedUrl).not.toHaveBeenCalled();
        },
    );

    it.each([undefined, "not-a-mime", "image/", 42])(
        "rejects invalid fileType: %s",
        async (fileType) => {
            const res = await POST(makeRequest({ filename: "a.zip", fileType }));

            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({ error: "Invalid file type." });
            expect(mocks.getSignedUrl).not.toHaveBeenCalled();
        },
    );

    it("signs a PUT URL into the public bucket with sanitized metadata", async () => {
        const res = await POST(
            makeRequest({
                filename: "my cover image (v2).png",
                fileType: "image/png",
                isPrivate: false,
            }),
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(mocks.putCommands[0]).toEqual({
            Bucket: "devcart-public",
            Key: body.key,
            ContentType: "image/png",
            Metadata: {
                originalfilename: "my_cover_image__v2_.png",
                uploadedby: userId,
            },
        });
        expect(body.url).toBe("https://signed.example.com/upload");
        expect(body.key).toMatch(new RegExp(`^uploads/${userId}/[0-9a-f-]+$`));
        expect(body.metadata).toEqual({
            originalfilename: "my_cover_image__v2_.png",
            uploadedby: userId,
        });
    });

    it("uses the private bucket when isPrivate is true", async () => {
        const res = await POST(
            makeRequest({
                filename: "asset.zip",
                fileType: "application/zip",
                isPrivate: true,
            }),
        );
        await res.json();

        expect(mocks.putCommands[0].Bucket).toBe("devcart-private");
    });

    it("passes 60s expiry and metadata headers to the signer", async () => {
        const res = await POST(
            makeRequest({ filename: "asset.zip", fileType: "application/zip" }),
        );
        await res.json();

        expect(mocks.getSignedUrl).toHaveBeenCalledTimes(1);
        const options = mocks.getSignedUrl.mock.calls[0][2];
        expect(options.expiresIn).toBe(60);
        expect([...options.unhoistableHeaders]).toEqual([
            "x-amz-meta-originalfilename",
            "x-amz-meta-uploadedby",
        ]);
    });

    it("returns 500 with a generic message when the request body is not valid JSON", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const res = await POST(
            new NextRequest("http://localhost:3000/api/upload", {
                method: "POST",
                body: "{broken",
                headers: { "content-type": "application/json" },
            }),
        );

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe("Error generating upload URL");
        expect(JSON.stringify(body)).not.toContain("broken");
        expect(consoleError).toHaveBeenCalled();
    });
});
