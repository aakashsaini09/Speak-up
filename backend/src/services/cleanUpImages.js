import { DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { r2 } from "./r2.service.js";

const buildRoomPrefix = (roomId) => `rooms/${roomId}/`;

async function listAllObjectsForPrefix(prefix) {
  const keys = [];
  let continuationToken;

  do {
    const response = await r2.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    for (const item of response.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

async function deleteObjectFromR2(key) {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    })
  );
}

export async function deleteFilesFromR2(roomIds = []) {
  const uniqueRoomIds = [...new Set(roomIds)].filter(Boolean);

  if (!uniqueRoomIds.length) {
    return { success: true, deletedFiles: 0 };
  }

  let deletedFiles = 0;

  for (const roomId of uniqueRoomIds) {
    const prefix = buildRoomPrefix(roomId);
    const keys = await listAllObjectsForPrefix(prefix);

    if (!keys.length) {
      continue;
    }

    await Promise.all(keys.map((key) => deleteObjectFromR2(key)));
    deletedFiles += keys.length;
  }

  return { success: true, deletedFiles };
}