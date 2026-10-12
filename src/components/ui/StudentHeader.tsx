"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/lib/store/context";
import { Sparkles, User as UserIcon } from "lucide-react";

export function StudentHeader() {
  const { siteSettings, currentUser } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#EADBCE]/80 px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <Link href="/aluna" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-[#B77D82] text-white flex items-center justify-center font-serif font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
            P
          </div>
          <span className="font-serif font-bold text-lg tracking-tight text-[#292321]">
            {siteSettings.logoText || "Pilates em Casa"}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/quiz"
            className="flex items-center gap-1.5 text-xs font-medium text-[#B77D82] bg-[#F7EEEE] hover:bg-[#EBD6D5] px-2.5 py-1.5 rounded-full transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B77D82]" />
            <span className="hidden xs:inline">Meu Plano</span>
          </Link>

          <Link
            href="/aluna/perfil"
            className="w-8 h-8 rounded-full border border-[#EADBCE] overflow-hidden bg-[#F3EAE3] flex items-center justify-center hover:ring-2 hover:ring-[#B77D82]/40 transition"
            title="Meu Perfil"
          >
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-4 h-4 text-[#827B77]" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
