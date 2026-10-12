import "dotenv/config";
import { S3Client } from "@aws-sdk/client-s3";
import { extname } from "path";
import { randomUUID } from "crypto";

export const s3 = new S3Client({
    forcePathStyle: true, endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION,
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! }
});

export function createStorageKey(filename: string): string {
    const extension = extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, "");
    return `${randomUUID()}${extension}`;
}