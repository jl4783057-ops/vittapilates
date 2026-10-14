"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/store/context";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FolderTree,
  ListTree,
  Video,
  Palette,
  HelpCircle,
  BarChart3,
  Settings,
  Gift,
  Menu,
  X,
  LogOut,
  ExternalLink,
} from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();
  const { siteSettings, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Alunas", href: "/admin/alunas", icon: Users },
    { label: "Assinaturas", href: "/admin/assinaturas", icon: CreditCard },
    { label: "Cortesias (Influenciadoras)", href: "/admin/cortesias", icon: Gift },
    { label: "Categorias", href: "/admin/categorias", icon: FolderTree },
    { label: "Subcategorias", href: "/admin/subcategorias", icon: ListTree },
    { label: "Aulas e Vídeos", href: "/admin/aulas", icon: Video },
    { label: "Personalização do Site", href: "/admin/personalizacao", icon: Palette },
    { label: "Quiz Personalizado", href: "/admin/quiz", icon: HelpCircle },
    { label: "Relatórios", href: "/admin/relatorios", icon: BarChart3 },
    { label: "Configurações", href: "/admin/configuracoes", icon: Settings },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#FFFFFF] border-r border-[#EADBCE]">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#EADBCE] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {siteSettings.logoUrl ? (
            <img
              src={siteSettings.logoUrl}
              alt={siteSettings.platformName}
              className="h-9 w-9 object-contain rounded-xl bg-[#FAF7F2] border border-[#EADBCE] p-0.5"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#B77D82] text-white flex items-center justify-center font-serif font-bold text-lg shadow-sm">
              P
            </div>
          )}
          <div>
            {siteSettings.platformName && (
              <span className="font-serif font-bold text-base text-[#292321] block leading-tight">
                {siteSettings.platformName}
              </span>
            )}
            <span className="text-[10px] tracking-wider uppercase font-semibold text-[#B77D82]">
              Painel Administrativo
            </span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-[#827B77] hover:bg-[#FAF7F2]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Navegação administrativa" className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#F7EEEE] text-[#B77D82] font-semibold shadow-xs"
                  : "text-[#827B77] hover:text-[#292321] hover:bg-[#FAF7F2]"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? "text-[#B77D82] stroke-[2.2]" : "text-[#827B77]"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-3 border-t border-[#EADBCE] space-y-2">
        <Link
          href="/aluna"
          className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-[#827B77] hover:bg-[#FAF7F2] transition"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-[#B77D82]" />
            Ver Área da Aluna
          </span>
          <span className="text-[10px] bg-[#EBD6D5]/60 text-[#292321] px-1.5 py-0.5 rounded font-mono">
            /aluna
          </span>
        </Link>

        <button
          onClick={async () => {
            await fetch("/api/admin/session", { method: "DELETE" });
            logout();
            window.location.assign("/admin/login");
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          Encerrar Sessão
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#EADBCE] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg border border-[#EADBCE] text-[#292321] hover:bg-[#FAF7F2]"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-serif font-bold text-base text-[#292321]">
            Admin • {siteSettings.platformName}
          </span>
        </div>
        <Link
          href="/aluna"
          className="text-xs font-medium text-[#B77D82] bg-[#F7EEEE] px-2.5 py-1 rounded-full"
        >
          Ver Aluna
        </Link>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <NavContent />
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside aria-label="Menu administrativo lateral" className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        <NavContent />
      </aside>
    </>
  );
}
