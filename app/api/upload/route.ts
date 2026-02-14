import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 },
        );
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 },
            );
        }

        // Ensure upload directory exists
        await mkdir(UPLOAD_DIR, { recursive: true });

        // Generate a unique filename: uuid + original extension
        const ext = path.extname(file.name) || "";
        const assetId = randomUUID();
        const fileName = `${assetId}${ext}`;
        const filePath = path.join(UPLOAD_DIR, fileName);

        // Write file to disk
        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        // Return a public URL path (served from /public)
        const publicUrl = `/uploads/${fileName}`;

        return NextResponse.json({
            storageKey: publicUrl,
            fileName: file.name,
            fileSize: file.size,
            assetId,
        });
    } catch {
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
