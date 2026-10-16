"use client";

import React, { Suspense } from "react";
import { StudentHeader } from "@/components/ui/StudentHeader";
import { StudentBottomNav } from "@/components/ui/StudentBottomNav";

import { useApp } from "@/lib/store/context";
import { Lesson } from "@/types";

interface StudentLayoutClientProps {
  children: React.ReactNode;
  initialLessons?: Lesson[];
}

export function StudentLayoutClient({ children, initialLessons }: StudentLayoutClientProps) {
  const { setLessons } = useApp();

  React.useEffect(() => {
    if (initialLessons && initialLessons.length > 0) {
      setLessons(initialLessons);
    }
  }, [initialLessons, setLessons]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col antialiased">
      <Suspense fallback={<div className="h-14 bg-[#FAF7F2]" />}>
        <StudentHeader />
      </Suspense>

      <main className="flex-1 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full px-4 sm:px-6 pt-3 pb-36 sm:pb-40 md:pb-44">
        <Suspense
          fallback={
            <div className="p-8 text-center text-xs text-[#827B77]">
              Carregando conteúdo...
            </div>
          }
        >
          {children}
        </Suspense>
      </main>

      <Suspense fallback={<div className="h-14 bg-white" />}>
        <StudentBottomNav />
      </Suspense>
    </div>
  );
}
