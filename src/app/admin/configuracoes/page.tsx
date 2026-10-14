"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/store/context";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  Settings,
  ShieldCheck,
  Database,
  Video,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react";

export default function AdminSettingsPage() {
  const { resetToDefaults, categories, lessons, users, quizQuestions, siteSettings } = useApp();

  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExportData = () => {
    const fullBackup = {
      exportedAt: new Date().toISOString(),
      siteSettings,
      categories,
      lessons,
      quizQuestions,
      users,
    };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_pilates_em_casa_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleResetCatalog = () => {
    if (
      confirm(
        "Atenção: Restaurar os dados de fábrica redefinirá categorias, aulas, textos e quiz para as versões padrão de fábrica. Deseja continuar?"
      )
    ) {
      resetToDefaults();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="pb-2 border-b border-[#EADBCE]">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
          Configurações da Plataforma & Integrações
        </h1>
        <p className="text-xs sm:text-sm text-[#827B77] mt-1">
          Status de serviços de infraestrutura, banco de dados, segurança e políticas de acesso.
        </p>
      </div>

      {/* Seção 1: Status das Integrações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supabase Status */}
        <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-[#B77D82]" />
              <h2 className="font-serif font-bold text-base text-[#292321]">
                Supabase & PostgreSQL
              </h2>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                isSupabaseConfigured
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-blue-50 text-blue-800"
              }`}
            >
              {isSupabaseConfigured ? "Chaves do app definidas" : "Modo local"}
            </span>
          </div>

          <p className="text-xs text-[#827B77] leading-relaxed">
            {isSupabaseConfigured
              ? "A URL e a chave publishable do Supabase estão configuradas. O banco, a autenticação e os fluxos administrativos ainda precisam ser preparados e conectados antes de considerar a integração completa."
              : "A aplicação está operando com armazenamento local. Para iniciar a conexão, configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env.local; revise as políticas de segurança antes de aplicar o schema."}
          </p>

          <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#EADBCE] text-[11px] text-[#827B77] space-y-1">
            <p><strong>Script SQL:</strong> [`src/lib/supabase/schema.sql`](file:///Users/levimagalhaes/saas/pilatesass/src/lib/supabase/schema.sql)</p>
            <p><strong>Políticas RLS:</strong> Revisão necessária antes de aplicar no projeto.</p>
          </div>
        </div>

        {/* Streaming de Vídeo / Cloudflare Stream */}
        <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Video className="w-5 h-5 text-[#B77D82]" />
              <h2 className="font-serif font-bold text-base text-[#292321]">
                Hospedagem & Streaming
              </h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
              Player Seguro Ativo
            </span>
          </div>

          <p className="text-xs text-[#827B77] leading-relaxed">
            A estrutura de streaming não armazena arquivos binários no banco de dados. Utiliza URLs autenticadas seguras compatíveis com Cloudflare Stream, Vimeo OTT e CDN de alta performance.
          </p>

          <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#EADBCE] text-[11px] text-[#827B77] space-y-1">
            <p><strong>Segurança:</strong> Tokens privados preservados exclusivamente no backend.</p>
            <p><strong>Suporte:</strong> MP4, HLS (m3u8) e embeds com taxa de bits adaptativa.</p>
          </div>
        </div>
      </div>

      {/* Seção 2: Políticas de Segurança e Privacidade */}
      <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#B77D82]" />
          <h2 className="font-serif font-bold text-base text-[#292321]">
            Segurança, Comunicação e LGPD
          </h2>
        </div>

        <ul className="text-xs text-[#827B77] space-y-2 list-disc list-inside leading-relaxed">
          <li>
            <strong>Comunicação Realista:</strong> Sem promessas milagrosas de emagrecimento localizado ou cura mágica. Foco na saúde, postura e constância.
          </li>
          <li>
            <strong>Quiz sem perguntas intrusivas:</strong> Nenhuma pergunta de peso, altura, IMC ou alimentação foi implementada, respeitando a privacidade integral da aluna.
          </li>
          <li>
            <strong>Separação de Papéis:</strong> Rotas de administração protegidas contra acesso de usuárias com papel comum.
          </li>
        </ul>
      </div>

      {/* Seção 3: Exportação e Manutenção */}
      <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-4">
        <h2 className="font-serif font-bold text-base text-[#292321]">
          Manutenção e Backup dos Dados
        </h2>

        {exportSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Arquivo JSON de backup baixado com sucesso!
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            Exportar Backup Completo (JSON)
          </button>

          <button
            onClick={handleResetCatalog}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-rose-300 text-rose-700 text-xs font-semibold hover:bg-rose-50 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar Catálogo Padrão de Fábrica
          </button>
        </div>
      </div>
    </div>
  );
}
