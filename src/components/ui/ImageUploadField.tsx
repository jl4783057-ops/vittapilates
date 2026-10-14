"use client";

import React, { useRef, useState } from "react";
import {
  Upload,
  Trash2,
  RefreshCw,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface ImageUploadFieldProps {
  label: string;
  helperText?: string;
  value?: string;
  onChange: (url: string) => void;
  aspectRatio?: "video" | "banner" | "square" | "wide";
  maxSizeMb?: number;
  className?: string;
}

export function ImageUploadField({
  label,
  helperText = "Formatos aceitos: JPG, PNG, WebP ou GIF (máx. 5 MB)",
  value = "",
  onChange,
  aspectRatio = "video",
  maxSizeMb = 5,
  className = "",
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isViewingFull, setIsViewingFull] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const aspectClass = {
    video: "aspect-[16/9]",
    banner: "aspect-[21/9]",
    square: "aspect-square",
    wide: "aspect-[16/10]",
  }[aspectRatio];

  const handleFile = async (file: File) => {
    setError(null);

    // Validação de tipo no cliente
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!validTypes.includes(file.type)) {
      setError("Formato de imagem não suportado. Envie um arquivo JPG, PNG, WebP ou GIF.");
      return;
    }

    // Validação de tamanho no cliente
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`Arquivo muito pesado (${sizeMb} MB). O limite máximo permitido é de ${maxSizeMb} MB.`);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Não foi possível enviar a imagem para o armazenamento. Tente novamente.");
        return;
      }

      // Salva no Supabase somente a URL pública retornada pelo Vercel Blob
      onChange(data.url);
    } catch {
      setError("Falha na conexão ao enviar o arquivo. Verifique sua conexão e tente novamente.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = () => {
    setError(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Label e Indicador */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#827B77]">
          {label}
        </label>
        {value ? (
          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Imagem ativa
          </span>
        ) : (
          <span className="text-[10px] text-[#827B77] bg-[#FAF7F2] border border-[#EADBCE] px-2 py-0.5 rounded-full">
            Nenhuma imagem
          </span>
        )}
      </div>

      {/* Input de arquivo invisível ativado pelo clique */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Se houver imagem definida: Prévia rica com opções de Substituir e Remover */}
      {value ? (
        <div className="relative rounded-2xl border border-[#EADBCE] bg-[#FFFFFF] p-2.5 space-y-2 group transition hover:border-[#B77D82]/50 shadow-2xs">
          <div className={`relative w-full ${aspectClass} max-h-56 rounded-xl overflow-hidden bg-[#FAF7F2] border border-[#EADBCE]/50 flex items-center justify-center`}>
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-101"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/55 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 z-10">
                <Loader2 className="w-7 h-7 animate-spin text-[#EBD6D5]" />
                <span className="text-xs font-semibold">Enviando nova imagem...</span>
              </div>
            )}
          </div>

          {/* Barra de Ações: Substituir Imagem, Ver em Tamanho Real e Remover */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EADBCE]/70">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] hover:bg-[#F7EEEE] text-[#B77D82] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Substituir imagem
              </button>

              <button
                type="button"
                onClick={() => setIsViewingFull(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] hover:bg-white text-[#827B77] hover:text-[#292321] text-xs font-medium transition cursor-pointer"
                title="Visualizar em tamanho real"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver
              </button>
            </div>

            <button
              type="button"
              disabled={uploading}
              onClick={handleRemove}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-rose-700 hover:bg-rose-50 text-xs font-medium transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </button>
          </div>
        </div>
      ) : (
        /* Se NÃO houver imagem definida: Botão e Área de Envio Direto */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2.5 transition cursor-pointer ${
            dragOver
              ? "border-[#B77D82] bg-[#F7EEEE]/70"
              : "border-[#EADBCE] bg-[#FAF7F2]/70 hover:border-[#B77D82]/60 hover:bg-[#FAF7F2]"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-3 text-[#B77D82]">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs font-semibold">Enviando imagem...</span>
              <span className="text-[11px] text-[#827B77]">Salvando no armazenamento permanente</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#EADBCE] text-[#B77D82] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Enviar imagem
                </button>
                <p className="text-[11px] text-[#827B77] mt-1.5">
                  ou arraste e solte o arquivo do seu computador aqui
                </p>
              </div>
              {helperText && (
                <p className="text-[10px] text-[#827B77]/80">{helperText}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Alerta de Erro */}
      {error && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-800 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modal de Visualização em Tamanho Real */}
      {isViewingFull && value && (
        <div
          onClick={() => setIsViewingFull(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden border border-[#EADBCE] shadow-2xl p-2 space-y-3"
          >
            <div className="flex items-center justify-between px-3 pt-2">
              <span className="font-serif font-bold text-sm text-[#292321]">{label}</span>
              <button
                type="button"
                onClick={() => setIsViewingFull(false)}
                className="p-1 rounded-xl text-[#827B77] hover:bg-[#FAF7F2] hover:text-[#292321] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-2xl bg-[#FAF7F2] p-2 flex items-center justify-center">
              <img src={value} alt={label} className="max-w-full max-h-[70vh] object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageUploadField;
