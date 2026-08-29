import { S3Client } from "@aws-sdk/client-s3";
import { requiredEnv } from "./env";

const accountId = requiredEnv("R2_ACCOUNT_ID");
const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");

export const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
});
