"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, BookMarked, MessageCircle, User as UserIcon } from "lucide-react";

export function StudentBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Início",
      href: "/aluna",
      icon: Home,
      isActive: pathname === "/aluna",
    },
    {
      label: "Explorar",
      href: "/aluna/programas",
      icon: Compass,
      isActive: pathname === "/aluna/programas" || (pathname?.startsWith("/aluna/programas") && !pathname?.includes("meus-treinos")),
    },
    {
      label: "Meus treinos",
      href: "/aluna/treinos",
      icon: BookMarked,
      isActive: pathname === "/aluna/treinos" || pathname?.startsWith("/aluna/aula"),
    },
    {
      label: "Comunidade",
      href: "/aluna/comunidade",
      icon: MessageCircle,
      isActive: pathname === "/aluna/comunidade",
    },
    {
      label: "Perfil",
      href: "/aluna/perfil",
      icon: UserIcon,
      isActive: pathname === "/aluna/perfil",
    },
  ];

  return (
    <nav aria-label="Navegação da aluna" className="fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#EADBCE] shadow-[0_-4px_20px_rgba(41,35,33,0.05)] pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                active
                  ? "text-[#B77D82]"
                  : "text-[#827B77] hover:text-[#292321]"
              }`}
            >
              <div
                className={`p-1 rounded-full transition-transform ${
                  active ? "bg-[#F7EEEE] scale-110" : ""
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
              </div>
              <span
                className={`text-[11px] font-medium tracking-tight mt-0.5 ${
                  active ? "font-semibold text-[#B77D82]" : "text-[#827B77]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
