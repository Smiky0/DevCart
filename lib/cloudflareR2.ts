import { S3Client } from "@aws-sdk/client-s3";

const requiredEnvVars = {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
} as const;

const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

if (missingVars.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`,
    );
}

export const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: requiredEnvVars.R2_ACCESS_KEY_ID!,
        secretAccessKey: requiredEnvVars.R2_SECRET_ACCESS_KEY!,
    },
});
