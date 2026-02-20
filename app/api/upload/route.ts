import { auth } from "@/lib/auth";
import { r2 } from "@/lib/cloudflareR2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
const MAX_FILENAME_LENGTH = 255;

// generates and returns a signed URL to upload files directly to server from frontend.
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { filename, fileType, isPrivate } = await request.json();
        // sanitize filename
        const sanitizedFileName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        // validate filename length and filesize
        if (filename.length > MAX_FILENAME_LENGTH) {
            return NextResponse.json(
                { error: "Invalid File" },
                { status: 400 },
            );
        }

        // bucket name based on contentType
        const bucketName =
            isPrivate ?
                process.env.R2_PRIVATE_BUCKET
            :   process.env.R2_PUBLIC_BUCKET;
        // unique file name to avoid collision
        const fileKey = `uploads/${session.user.id}/${randomUUID()}`;

        const metadata = {
            originalfilename: sanitizedFileName,
            uploadedby: session.user.id!,
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
        return NextResponse.json(
            { error: "Error generating URL: " + error },
            { status: 500 },
        );
    }
}
