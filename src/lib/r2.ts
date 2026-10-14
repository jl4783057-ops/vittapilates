import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Configurações do Cloudflare R2 (compatível com S3)
// Aceita tanto prefixo CLOUDFLARE_R2_* quanto R2_* para compatibilidade perfeita
const accountId = (process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID)?.trim();
const accessKeyId = (process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID)?.trim();
const secretAccessKey = (process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY)?.trim();
const bucketName = (process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME)?.trim();
const publicDomain = (process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_DOMAIN || "").trim().replace(/\/$/, "");

export const isR2Configured = Boolean(
  accountId &&
  accessKeyId &&
  secretAccessKey &&
  bucketName &&
  publicDomain
);

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

/**
 * Envia uma imagem diretamente para o bucket Cloudflare R2 e retorna a URL pública permanente.
 */
export async function uploadImageToR2(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
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
