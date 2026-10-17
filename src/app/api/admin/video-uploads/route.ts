import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/access";
import {
  beginR2VideoUpload,
  cancelR2VideoUpload,
  finishR2VideoUpload,
  isR2Configured,
  isValidVideoKey,
  R2_VIDEO_MAX_BYTES,
  R2_VIDEO_PART_BYTES,
  signR2VideoPart,
} from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME_BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isR2Configured) return NextResponse.json({ error: "O armazenamento de vídeos ainda não está configurado." }, { status: 503 });

  try {
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "initiate") {
      const size = Number(body.size);
      const extension = String(body.extension || "").toLowerCase().replace(/^\./, "");
      if (!Number.isSafeInteger(size) || size <= 0 || size > R2_VIDEO_MAX_BYTES) {
        return NextResponse.json({ error: "O vídeo deve ter até 5 GB." }, { status: 400 });
      }
      const contentType = MIME_BY_EXTENSION[extension];
      if (!contentType) return NextResponse.json({ error: "Formato não aceito. Envie MP4, WebM ou MOV." }, { status: 400 });
      const key = `lessons/${randomUUID()}.${extension}`;
      const uploadId = await beginR2VideoUpload(key, contentType);
      return NextResponse.json({ key, uploadId, partSize: R2_VIDEO_PART_BYTES, partCount: Math.ceil(size / R2_VIDEO_PART_BYTES) });
    }

    const key = String(body.key || "");
    const uploadId = String(body.uploadId || "");
    if (!isValidVideoKey(key) || !uploadId || uploadId.length > 2048) {
      return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
    }

    if (action === "sign-part") {
      const partNumber = Number(body.partNumber);
      const partCount = Number(body.partCount);
      if (!Number.isInteger(partNumber) || !Number.isInteger(partCount) || partNumber < 1 || partNumber > 10000 || partNumber > partCount || partCount > 10000) {
        return NextResponse.json({ error: "Parte do envio inválida." }, { status: 400 });
      }
      return NextResponse.json({ url: await signR2VideoPart(key, uploadId, partNumber) }, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "complete") {
      const parts = Array.isArray(body.parts) ? body.parts : [];
      if (!parts.length || parts.length > 10000) return NextResponse.json({ error: "O envio não contém partes válidas." }, { status: 400 });
      const normalized = parts.map((part: { ETag?: unknown; PartNumber?: unknown }) => ({
        ETag: String(part.ETag || ""),
        PartNumber: Number(part.PartNumber),
      }));
      if (normalized.some((part: { ETag: string; PartNumber: number }) => !/^"?[\w+=/.-]+"?$/.test(part.ETag) || !Number.isInteger(part.PartNumber) || part.PartNumber < 1 || part.PartNumber > 10000)) {
        return NextResponse.json({ error: "Metadados de envio inválidos." }, { status: 400 });
      }
      normalized.sort((a: { PartNumber: number }, b: { PartNumber: number }) => a.PartNumber - b.PartNumber);
      const file = await finishR2VideoUpload(key, uploadId, normalized);
      if (!file.contentType.startsWith("video/")) return NextResponse.json({ error: "O arquivo enviado não foi reconhecido como vídeo." }, { status: 400 });
      return NextResponse.json({ success: true, key, size: file.size });
    }

    if (action === "abort") {
      await cancelR2VideoUpload(key, uploadId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    console.error("Falha no envio de vídeo ao R2:", error instanceof Error ? error.message : "erro desconhecido");
    return NextResponse.json({ error: "Não foi possível concluir o envio para o armazenamento de vídeos." }, { status: 500 });
  }
}
