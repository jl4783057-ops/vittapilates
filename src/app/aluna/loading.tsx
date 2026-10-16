import React from "react";
import { RefreshCw } from "lucide-react";

export default function StudentLoading() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
      <div className="max-w-xs w-full bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.06)] p-6 sm:p-8 flex flex-col items-center text-center space-y-3 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-[#F7EEEE] text-[#B77D82] flex items-center justify-center mb-1">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="font-serif font-bold text-lg text-[#292321]">
          Carregando seus treinos...
        </h2>
        <p className="text-xs text-[#827B77] leading-relaxed">
          Preparando sua área de aluna. Aguarde um instante.
        </p>
      </div>
    </div>
  );
}
