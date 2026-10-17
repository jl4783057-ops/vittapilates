"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, MessageCircle, User as UserIcon } from "lucide-react";

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
      isActive:
        pathname === "/aluna/programas" ||
        pathname?.startsWith("/aluna/programas") ||
        pathname?.startsWith("/aluna/aula"),
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
    <nav
      aria-label="Navegação da aluna"
      className="fixed bottom-0 sm:bottom-5 left-0 right-0 z-50 pointer-events-none pb-safe sm:pb-0"
    >
      <div className="max-w-md mx-auto pointer-events-auto px-4 sm:px-0">
        <div className="bg-[#FFFFFF]/95 backdrop-blur-xl border border-[#EADBCE] rounded-2xl sm:rounded-full shadow-[0_6px_25px_rgba(41,35,33,0.08)] grid grid-cols-4 py-2 px-2 transition-all">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl sm:rounded-full transition-all group ${
                  active ? "text-[#B77D82]" : "text-[#827B77] hover:text-[#292321]"
                }`}
              >
                <div
                  className={`p-1.5 rounded-full transition-transform duration-200 ${
                    active ? "bg-[#F7EEEE] scale-105" : "group-hover:scale-105"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? "stroke-[2.3]" : "stroke-[1.8]"}`} />
                </div>
                <span
                  className={`text-[11px] tracking-tight mt-0.5 transition-all ${
                    active ? "font-bold text-[#B77D82]" : "font-medium text-[#827B77]"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
