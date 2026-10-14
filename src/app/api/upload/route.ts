import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { isAdminRequest } from "@/lib/access";

// Limite de 5 MB para imagens
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const IMAGE_FORMATS = [
  { mime: "image/jpeg", ext: ".jpg", matches: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: ".png", matches: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/gif", ext: ".gif", matches: (b: Buffer) => b.subarray(0, 6).toString("ascii").match(/^GIF8[79]a$/) !== null },
  { mime: "image/webp", ext: ".webp", matches: (b: Buffer) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_SIZE + 64 * 1024) {
    return NextResponse.json({ error: "O envio excede o limite de 5 MB." }, { status: 413 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Nenhum arquivo de imagem foi enviado." },
        { status: 400 }
      );
    }

    // Validação de tamanho
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        {
          error: `O arquivo tem ${sizeMb} MB e excede o limite máximo permitido de 5 MB.`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Confiar só no nome ou no MIME enviado pelo navegador permite disfarçar SVG/HTML.
    const format = IMAGE_FORMATS.find((candidate) => candidate.matches(buffer));
    const declaredMime = file.type.toLowerCase();
    if (!format || (declaredMime && declaredMime !== format.mime && !(format.mime === "image/jpeg" && declaredMime === "image/jpg"))) {
      return NextResponse.json(
        { error: "Formato inválido. Envie uma imagem JPG, PNG, WebP ou GIF." },
        { status: 400 }
      );
    }

    // Sanitização do nome do arquivo
    const ext = path.extname(file.name).toLowerCase();
    const safeBaseName = path
      .basename(file.name, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const finalExt = format.ext;
    const uniqueFileName = `img-${Date.now()}-${safeBaseName}${finalExt}`;

    let publicUrl: string;

    // Se o Vercel Blob estiver configurado (BLOB_READ_WRITE_TOKEN), envia diretamente para o bucket vittapilates-blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`images/${uniqueFileName}`, buffer, {
        access: "public",
        contentType: format.mime,
      });
      publicUrl = blob.url;
    } else if (process.env.NODE_ENV === "development") {
      // Fallback em ambiente de desenvolvimento local caso a variável BLOB_READ_WRITE_TOKEN ainda não tenha sido puxada localmente
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, uniqueFileName), buffer);
      publicUrl = `/uploads/${uniqueFileName}`;
    } else {
      return NextResponse.json(
        {
          error:
            "Vercel Blob não conectado. Certifique-se de que o Blob 'vittapilates-blob' está conectado ao projeto com a variável BLOB_READ_WRITE_TOKEN.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: uniqueFileName,
      size: file.size,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro ao processar upload de imagem:", error);
    return NextResponse.json(
      { error: "Ocorreu uma falha ao salvar a imagem no servidor. Tente novamente." },
      { status: 500 }
    );
  }
}
