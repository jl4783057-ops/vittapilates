"use client";

import React, { Suspense } from "react";
import { StudentHeader } from "@/components/ui/StudentHeader";
import { StudentBottomNav } from "@/components/ui/StudentBottomNav";
import { QuickRoleSwitcher } from "@/components/ui/QuickRoleSwitcher";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col antialiased">
      <Suspense fallback={<div className="h-7 bg-[#292321]" />}>
        <QuickRoleSwitcher />
      </Suspense>

      <Suspense fallback={<div className="h-14 bg-[#FAF7F2]" />}>
        <StudentHeader />
      </Suspense>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-3 pb-24">
        <Suspense fallback={<div className="p-8 text-center text-xs text-[#827B77]">Carregando conteúdo...</div>}>
          {children}
        </Suspense>
      </main>

      <Suspense fallback={<div className="h-14 bg-white" />}>
        <StudentBottomNav />
      </Suspense>
    </div>
  );
}
