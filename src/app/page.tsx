"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/context";

export default function RootPage() {
  const router = useRouter();
  const { currentUser } = useApp();

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/aluna");
      }
    } else {
      router.replace("/login");
    }
  }, [currentUser, router]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#B77D82] text-white flex items-center justify-center font-serif font-bold text-xl animate-pulse">
          P
        </div>
        <p className="text-sm font-medium text-[#827B77]">Carregando seu espaço...</p>
      </div>
    </div>
  );
}
