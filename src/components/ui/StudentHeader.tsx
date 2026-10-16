"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/lib/store/context";
import { User as UserIcon, ChevronLeft } from "lucide-react";

import { usePathname, useSearchParams, useRouter } from "next/navigation";

interface StudentHeaderProps {
  showBack?: boolean;
  backHref?: string;
  onBack?: () => void;
}

export function StudentHeader({ showBack, backHref, onBack }: StudentHeaderProps = {}) {
  const { siteSettings, currentUser } = useApp();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Determinar automaticamente o botão voltar se não fornecido explicitamente
  let resolvedShowBack = showBack;
  let resolvedBackHref = backHref;
  let resolvedOnBack = onBack;

  if (resolvedShowBack === undefined) {
    if (pathname?.startsWith("/aluna/aula/")) {
      resolvedShowBack = true;
      resolvedBackHref = "/aluna/programas";
    } else if (pathname === "/aluna/programas") {
      const cat = searchParams?.get("categoria");
      const sub = searchParams?.get("subcategoria");
      if (sub && cat) {
        resolvedShowBack = true;
        resolvedBackHref = `/aluna/programas?categoria=${cat}`;
      } else if (cat) {
        resolvedShowBack = true;
        resolvedBackHref = "/aluna/programas";
      }
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EADBCE]/70 px-4 sm:px-6 py-3.5 sm:py-4 transition-colors">
      <div className="max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto flex items-center justify-between relative">
        {/* Lado esquerdo: Botão Voltar quando aplicável, ou espaço vazio para balancear o avatar */}
        <div className="w-11 flex items-center justify-start">
          {resolvedShowBack && (
            resolvedOnBack ? (
              <button
                type="button"
                onClick={resolvedOnBack}
                className="w-10 h-10 rounded-full bg-white/90 border border-[#EADBCE] text-[#292321] hover:text-[#B77D82] hover:bg-white flex items-center justify-center transition shadow-2xs cursor-pointer"
                aria-label="Voltar"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
            ) : resolvedBackHref ? (
              <Link
                href={resolvedBackHref}
                className="w-10 h-10 rounded-full bg-white/90 border border-[#EADBCE] text-[#292321] hover:text-[#B77D82] hover:bg-white flex items-center justify-center transition shadow-2xs"
                aria-label="Voltar"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => router.back()}
                className="w-10 h-10 rounded-full bg-white/90 border border-[#EADBCE] text-[#292321] hover:text-[#B77D82] hover:bg-white flex items-center justify-center transition shadow-2xs cursor-pointer"
                aria-label="Voltar"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
            )
          )}
        </div>

        {/* Centro: Logo Vitta Pilates cadastrada (Aumentada de forma equilibrada) */}
        <div className="flex-1 flex items-center justify-center px-2">
          <Link href="/aluna" className="flex items-center group py-0.5" aria-label="Página inicial Vitta Pilates">
            {siteSettings.logoUrl ? (
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.logoText || "Vitta Pilates"}
                className="h-9 sm:h-11 md:h-12 w-auto max-w-[210px] sm:max-w-[270px] md:max-w-[310px] object-contain transition-transform group-hover:scale-[1.02]"
              />
            ) : siteSettings.logoText ? (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#B77D82] text-white flex items-center justify-center font-serif font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
                  {siteSettings.logoText.charAt(0).toUpperCase()}
                </div>
                <span className="font-serif font-bold text-xl sm:text-2xl tracking-wider text-[#292321]">
                  {siteSettings.logoText}
                </span>
              </div>
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#B77D82] text-white flex items-center justify-center font-serif font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
                V
              </div>
            )}
          </Link>
        </div>

        {/* Lado direito: Avatar da aluna com borda delicada e alinhamento perfeito */}
        <div className="w-11 flex items-center justify-end">
          <Link
            href="/aluna/perfil"
            className="w-10 h-10 rounded-full border border-[#EADBCE] overflow-hidden bg-[#F3EAE3] flex items-center justify-center hover:ring-2 hover:ring-[#B77D82]/40 transition shadow-2xs"
            title="Meu Perfil"
          >
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-5 h-5 text-[#827B77]" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
