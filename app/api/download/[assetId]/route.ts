import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ assetId: string }> },
) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 },
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

        // Read the file from disk
        const filePath = path.join(
            process.cwd(),
            "public",
            fileAsset.storageKey,
        );
        const fileBuffer = await readFile(filePath);

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
        const contentType = mimeTypes[ext] || "application/octet-stream";

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="${fileAsset.fileName}"`,
                "Content-Length": fileBuffer.length.toString(),
            },
        });
    } catch {
        return NextResponse.json(
            { error: "Unable to fetch assets from server." },
            { status: 500 },
        );
    }
}
