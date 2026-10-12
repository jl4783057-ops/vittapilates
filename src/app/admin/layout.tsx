"use client";

import React, { Suspense } from "react";
import { AdminSidebar } from "@/components/ui/AdminSidebar";
import { QuickRoleSwitcher } from "@/components/ui/QuickRoleSwitcher";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col antialiased">
      <Suspense fallback={<div className="h-7 bg-[#292321]" />}>
        <QuickRoleSwitcher />
      </Suspense>

      <div className="flex-1 flex flex-col lg:flex-row">
        <Suspense fallback={<div className="w-64 h-screen bg-white" />}>
          <AdminSidebar />
        </Suspense>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Suspense fallback={<div className="p-8 text-center text-xs text-[#827B77]">Carregando painel...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
