import { auth } from "@/lib/auth";
import { r2 } from "@/lib/cloudflareR2";
import { uploadRatelimit } from "@/lib/ratelimit";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILENAME_LENGTH = 255;
// basic mime shape check, e.g. "image/png", "application/zip", "video/mp4"
const FILE_TYPE_PATTERN = /^[\w.+-]+\/[\w.+-]+$/;

// generates and returns a signed URL to upload files directly to server from frontend.
export async function POST(request: NextRequest) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // check for upload rate limits before touching the request body
    const { success } = await uploadRatelimit.limit(userId);
    if (!success) {
        return NextResponse.json(
            { error: "Too many requests, try again after few minutes." },
            { status: 429 },
        );
    }

    try {
        const { filename, fileType, isPrivate } = await request.json();

        // validate filename type and length
        if (
            typeof filename !== "string" ||
            filename.length === 0 ||
            filename.length > MAX_FILENAME_LENGTH
        ) {
            return NextResponse.json({ error: "Invalid File" }, { status: 400 });
        }
        // validate content type shape to keep garbage out of the signature
        if (typeof fileType !== "string" || !FILE_TYPE_PATTERN.test(fileType)) {
            return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
        }

        // sanitize filename
        const sanitizedFileName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

        // bucket name based on flag
        const bucketName = isPrivate
            ? process.env.R2_PRIVATE_BUCKET
            : process.env.R2_PUBLIC_BUCKET;
        // unique file name to avoid collision
        const fileKey = `uploads/${userId}/${randomUUID()}`;

        const metadata = {
            originalfilename: sanitizedFileName,
            uploadedby: userId,
        };

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
            ContentType: fileType,
            // store original filename in metadata to avoid collision
            Metadata: metadata,
        });
        // generate an URL that allows PUT request for 60 seconds
        // unhoistableHeaders keeps metadata as headers so R2 stores them correctly
        const signedUrl = await getSignedUrl(r2, command, {
            expiresIn: 60,
            unhoistableHeaders: new Set([
                "x-amz-meta-originalfilename",
                "x-amz-meta-uploadedby",
            ]),
        });

        return NextResponse.json({
            url: signedUrl,
            key: fileKey,
            metadata: metadata,
        });
    } catch (error) {
        console.error("Failed to generate presigned upload URL:", error);
        return NextResponse.json(
            { error: "Error generating upload URL" },
            { status: 500 },
        );
    }
}
