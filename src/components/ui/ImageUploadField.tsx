"use client";

import React, { useState } from "react";
import {
  Image as ImageIcon,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  FolderPlus,
  GitCommit,
  ExternalLink,
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
  helperText,
  value = "",
  onChange,
  aspectRatio = "video",
  className = "",
}: ImageUploadFieldProps) {
  const [isViewingFull, setIsViewingFull] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const aspectClass = {
    video: "aspect-[16/9]",
    banner: "aspect-[21/9]",
    square: "aspect-square",
    wide: "aspect-[16/10]",
  }[aspectRatio];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value.trim());
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Label e Indicador */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#827B77]">
          {label}
        </label>
        {value ? (
          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Imagem vinculada
          </span>
        ) : (
          <span className="text-[10px] text-[#827B77] bg-[#FAF7F2] border border-[#EADBCE] px-2 py-0.5 rounded-full">
            Nenhuma imagem
          </span>
        )}
      </div>

      {/* Caixa de instrução e orientação simples sobre a pasta public/images/ */}
      <div className="rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] p-3 text-xs text-[#292321] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-[#B77D82] font-semibold text-[11px]">
            <FolderPlus className="w-4 h-4 shrink-0" />
            <span>Como adicionar imagens do seu computador:</span>
          </div>
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-[11px] text-[#B77D82] hover:text-[#A3676C] underline cursor-pointer shrink-0"
          >
            {showInstructions ? "Ocultar detalhes" : "Ver passo a passo"}
          </button>
        </div>

        <p className="text-[11px] text-[#827B77] leading-relaxed">
          Copie o arquivo de imagem do seu Mac/Windows para a pasta <code>public/images/</code> do projeto e informe abaixo o caminho correspondente (ex: <code>/images/nome-da-imagem.webp</code>).
        </p>

        {showInstructions && (
          <div className="pt-2 border-t border-[#EADBCE]/80 text-[11px] text-[#827B77] space-y-1.5 animate-fade-in bg-white/60 p-2.5 rounded-xl">
            <p className="flex items-center gap-1.5 font-medium text-[#292321]">
              <span className="w-4 h-4 rounded-full bg-[#B77D82] text-white text-[10px] flex items-center justify-center shrink-0">1</span>
              No seu computador, salve a imagem na pasta <code>public/images/</code> (ou <code>public/uploads/</code>).
            </p>
            <p className="flex items-center gap-1.5 font-medium text-[#292321]">
              <span className="w-4 h-4 rounded-full bg-[#B77D82] text-white text-[10px] flex items-center justify-center shrink-0">2</span>
              Digite o caminho relativo no campo abaixo (ex: <code>/images/banner-principal.webp</code>).
            </p>
            <p className="flex items-center gap-1.5 font-medium text-[#292321]">
              <GitCommit className="w-4 h-4 text-[#B77D82] shrink-0" />
              <span>Para publicar no ar: envie as alterações ao GitHub para a Vercel compilar e exibir as imagens para todas as alunas.</span>
            </p>
          </div>
        )}
      </div>

      {/* Campo de Entrada do Caminho Público da Imagem */}
      <div className="space-y-1">
        <div className="relative flex items-center">
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder="Ex: /images/banner-home.webp ou /uploads/logo.png"
            className="w-full pl-3 pr-20 py-2.5 rounded-xl border border-[#EADBCE] bg-[#FFFFFF] text-xs text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 placeholder:text-[#827B77]/60"
          />
          {value && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute right-2 px-2 py-1 rounded-lg text-rose-700 hover:bg-rose-50 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
              title="Limpar campo"
            >
              <Trash2 className="w-3 h-3" />
              Limpar
            </button>
          )}
        </div>
        {helperText && (
          <p className="text-[10px] text-[#827B77]">{helperText}</p>
        )}
      </div>

      {/* Pré-visualização da Imagem se houver valor preenchido */}
      {value ? (
        <div className="relative rounded-2xl border border-[#EADBCE] bg-[#FFFFFF] p-2.5 space-y-2 group transition hover:border-[#B77D82]/50 shadow-2xs">
          <div className={`relative w-full ${aspectClass} max-h-52 rounded-xl overflow-hidden bg-[#FAF7F2] border border-[#EADBCE]/50 flex items-center justify-center`}>
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-101"
              onError={(e) => {
                // Caso a imagem ainda não exista na pasta local
                const target = e.currentTarget;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent && !parent.querySelector(".img-error-fallback")) {
                  const fallback = document.createElement("div");
                  fallback.className = "img-error-fallback p-4 text-center text-xs text-[#827B77] space-y-1";
                  fallback.innerHTML = `<span class="block font-semibold text-[#292321]">Pré-visualização pendente</span><span class="block text-[11px]">Certifique-se de que o arquivo existe em <code>public${value}</code></span>`;
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#EADBCE]/70 text-xs">
            <button
              type="button"
              onClick={() => setIsViewingFull(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] hover:bg-white text-[#827B77] hover:text-[#292321] text-xs font-medium transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Visualizar em tamanho real
            </button>

            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[#B77D82] hover:text-[#A3676C] font-medium"
            >
              Abrir link
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-[#EADBCE] rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1.5 bg-[#FAF7F2]/50 text-[#827B77]">
          <ImageIcon className="w-6 h-6 text-[#827B77]/60" />
          <p className="text-xs font-medium text-[#292321]">Nenhuma imagem vinculada</p>
          <p className="text-[10px] text-[#827B77]">Digite o caminho público acima para exibir a imagem</p>
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
