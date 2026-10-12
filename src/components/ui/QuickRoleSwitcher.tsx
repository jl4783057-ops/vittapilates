"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/store/context";
import { ShieldCheck, UserCheck } from "lucide-react";

export function QuickRoleSwitcher() {
  const pathname = usePathname();
  const { currentUser, login } = useApp();

  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <aside aria-label="Controle de acesso" className="bg-[#292321] text-[#FAF7F2] text-xs py-1.5 px-3 flex items-center justify-between border-b border-[#3D3532] shadow-sm z-50">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-medium text-[#FAF7F2]">
          Modo Atual:{" "}
          <strong className="text-[#EBD6D5]">
            {isAdminRoute ? "Painel Administrativo" : "Área da Aluna"}
          </strong>
        </span>
        {currentUser && (
          <span className="hidden sm:inline text-[#827B77]">
            ({currentUser.name} - {currentUser.role})
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!isAdminRoute ? (
          <button
            onClick={() => {
              login("admin@pilatesemcasa.com.br", "admin");
              window.location.href = "/admin";
            }}
            className="flex items-center gap-1.5 bg-[#B77D82] hover:bg-[#A3676C] text-white px-2.5 py-1 rounded-md transition font-medium text-[11px]"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Acessar Painel Admin
          </button>
        ) : (
          <Link
            href="/aluna"
            onClick={() => {
              login("aluna@pilatesemcasa.com.br", "aluna");
            }}
            className="flex items-center gap-1.5 bg-[#423936] hover:bg-[#4E4340] text-[#EBD6D5] px-2.5 py-1 rounded-md transition font-medium text-[11px]"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Ver como Aluna
          </Link>
        )}
      </div>
    </aside>
  );
}
