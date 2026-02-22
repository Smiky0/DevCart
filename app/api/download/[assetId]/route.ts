import { auth } from "@/lib/auth";
import { r2 } from "@/lib/cloudflareR2";
import prisma from "@/lib/prisma";
import { downloadRatelimit } from "@/lib/ratelimit";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function GET(
    _req: NextRequest,
    {
        params,
    }: {
        params: Promise<{ assetId: string }>;
    },
) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 },
        );
    }
    // check for download rate limit
    const { success } = await downloadRatelimit.limit(userId);
    if (!success) {
        return NextResponse.json(
            {
                error: "Too many download requests, try again after few minutes.",
            },
            { status: 429 },
        );
    }

    const { assetId } = await params;

    try {
        // Look up the file asset and verify ownership via purchase
        const fileAsset = await prisma.fileAsset.findUnique({
            where: { id: assetId },
            include: {
                product: {
                    include: {
                        purchaseItems: {
                            where: { seller: { id: userId } },
                        },
                    },
                },
            },
        });

        if (!fileAsset) {
            return NextResponse.json(
                { error: "Asset not found" },
                { status: 404 },
            );
        }

        // Check if user bought this product OR is the seller
        const isSeller = fileAsset.product.sellerId === userId;
        const hasPurchased = await prisma.purchaseItem.findFirst({
            where: {
                productId: fileAsset.productId,
                purchase: { buyerId: userId },
            },
        });

        if (!isSeller && !hasPurchased) {
            return NextResponse.json(
                { error: "You haven't purchased this product" },
                { status: 403 },
            );
        }

        // Fetch the file from R2 private bucket
        const command = new GetObjectCommand({
            Bucket: process.env.R2_PRIVATE_BUCKET,
            Key: fileAsset.storageKey,
        });

        const r2Response = await r2.send(command);

        if (!r2Response.Body) {
            return NextResponse.json(
                { error: "File not found in storage" },
                { status: 404 },
            );
        }

        // Determine content type from extension
        const ext = path.extname(fileAsset.fileName).toLowerCase();
        const mimeTypes: Record<string, string> = {
            ".zip": "application/zip",
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".mp4": "video/mp4",
            ".mp3": "audio/mpeg",
            ".psd": "application/octet-stream",
            ".ai": "application/postscript",
            ".fig": "application/octet-stream",
            ".sketch": "application/octet-stream",
        };
        const contentType =
            r2Response.ContentType ||
            mimeTypes[ext] ||
            "application/octet-stream";

        // Convert the R2 readable stream to a web ReadableStream
        const stream = r2Response.Body.transformToWebStream() as ReadableStream;

        return new NextResponse(stream, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="${fileAsset.fileName}"`,
                ...(r2Response.ContentLength && {
                    "Content-Length": r2Response.ContentLength.toString(),
                }),
            },
        });
    } catch {
        return NextResponse.json(
            { error: "Unable to fetch assets from server." },
            { status: 500 },
        );
    }
}
