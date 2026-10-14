import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

// Limite de 5 MB para imagens
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Nenhum arquivo de imagem foi enviado." },
        { status: 400 }
      );
    }

    // Validação de tipo MIME e extensão
    const ext = path.extname(file.name).toLowerCase();
    const mimeValid = ALLOWED_MIME_TYPES.has(file.type);
    const extValid = ALLOWED_EXTENSIONS.has(ext);

    if (!mimeValid && !extValid) {
      return NextResponse.json(
        {
          error:
            "Formato não suportado. Por favor, envie uma imagem nos formatos JPG, PNG, WebP ou GIF.",
        },
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

    // Sanitização do nome do arquivo
    const safeBaseName = path
      .basename(file.name, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const finalExt = ext || ".png";
    const uniqueFileName = `img-${Date.now()}-${safeBaseName}${finalExt}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, uniqueFileName), buffer);

    const publicUrl = `/uploads/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: uniqueFileName,
      size: file.size,
    });
  } catch (error) {
    console.error("Erro ao processar upload de imagem:", error);
    return NextResponse.json(
      { error: "Ocorreu uma falha ao salvar a imagem no servidor. Tente novamente." },
      { status: 500 }
    );
  }
}
