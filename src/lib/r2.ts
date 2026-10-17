import "server-only";
import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configurações do Cloudflare R2 (compatível com S3)
// Aceita tanto prefixo CLOUDFLARE_R2_* quanto R2_* para compatibilidade perfeita
const accountId = (process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID)?.trim();
const accessKeyId = (process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID)?.trim();
const secretAccessKey = (process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY)?.trim();
const bucketName = (process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME)?.trim();
const publicDomain = (process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_DOMAIN || "").trim().replace(/\/$/, "");

export const isR2Configured = Boolean(accountId && accessKeyId && secretAccessKey && bucketName);
export const isR2ImageConfigured = Boolean(isR2Configured && publicDomain);
export const R2_VIDEO_MAX_BYTES = 5 * 1024 * 1024 * 1024;
export const R2_VIDEO_PART_BYTES = 16 * 1024 * 1024;

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("R2_NOT_CONFIGURED");
    }
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return r2Client;
}

export function isValidVideoKey(key: string) {
  return /^lessons\/[a-f0-9-]+\.(mp4|webm|mov)$/i.test(key);
}

export async function beginR2VideoUpload(key: string, contentType: string) {
  const result = await getR2Client().send(new CreateMultipartUploadCommand({
    Bucket: bucketName, Key: key, ContentType: contentType,
    CacheControl: "private, no-store",
  }));
  if (!result.UploadId) throw new Error("R2_UPLOAD_INIT_FAILED");
  return result.UploadId;
}

export async function signR2VideoPart(key: string, uploadId: string, partNumber: number) {
  return getSignedUrl(getR2Client(), new UploadPartCommand({
    Bucket: bucketName, Key: key, UploadId: uploadId, PartNumber: partNumber,
  }), { expiresIn: 600 });
}

export async function finishR2VideoUpload(key: string, uploadId: string, parts: { ETag: string; PartNumber: number }[]) {
  await getR2Client().send(new CompleteMultipartUploadCommand({
    Bucket: bucketName, Key: key, UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  }));
  const head = await getR2Client().send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
  if (!head.ContentLength || head.ContentLength > R2_VIDEO_MAX_BYTES) {
    throw new Error("R2_VIDEO_SIZE_INVALID");
  }
  return { size: head.ContentLength, contentType: head.ContentType || "" };
}

export async function cancelR2VideoUpload(key: string, uploadId: string) {
  await getR2Client().send(new AbortMultipartUploadCommand({ Bucket: bucketName, Key: key, UploadId: uploadId }));
}

export async function signR2VideoPlayback(key: string) {
  if (!isValidVideoKey(key)) throw new Error("R2_VIDEO_KEY_INVALID");
  return getSignedUrl(getR2Client(), new GetObjectCommand({
    Bucket: bucketName, Key: key, ResponseCacheControl: "private, no-store",
  }), { expiresIn: 3600 });
}

/**
 * Envia uma imagem diretamente para o bucket Cloudflare R2 e retorna a URL pública permanente.
 */
export async function uploadImageToR2(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  if (!isR2ImageConfigured) throw new Error("R2_NOT_CONFIGURED");
  const client = getR2Client();
  const key = `uploads/${fileName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return `${publicDomain}/${key}`;
}
