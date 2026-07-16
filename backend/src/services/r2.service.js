import { S3Client } from "@aws-sdk/client-s3";
import {
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import path from "path";
import { randomUUID } from "crypto";
export async function uploadToR2(file, roomId) {
  const extension = path.extname(
    file.originalname
  );

  const key =
    `rooms/${roomId}/${randomUUID()}${extension}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCOUNT_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});