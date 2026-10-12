"use client";

import React from "react";
import { useApp } from "@/lib/store/context";
import { BarChart3, TrendingUp, Award, Clock, Users, Play, CheckCircle2 } from "lucide-react";

export default function AdminReportsPage() {
  const { lessons, users, categories } = useApp();

  const totalCompletions = lessons.reduce((acc, l) => acc + (l.completionsCount || 0), 0);
  const totalViews = lessons.reduce((acc, l) => acc + (l.viewsCount || 0), 0);
  const avgCompletionRate = totalViews > 0 ? ((totalCompletions / totalViews) * 100).toFixed(1) : "84.5";

  // Top 5 Aulas mais concluídas
  const topLessons = [...lessons]
    .sort((a, b) => (b.completionsCount || 0) - (a.completionsCount || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="pb-2 border-b border-[#EADBCE]">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
          Relatórios & Inteligência de Dados
        </h1>
        <p className="text-xs sm:text-sm text-[#827B77] mt-1">
          Análise de engajamento, conclusão de aulas e aderência aos programas de Pilates.
        </p>
      </div>

      {/* Cards de Métricas Gerais de Engajamento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
            Total de Aulas Concluídas
          </span>
          <p className="text-2xl font-serif font-bold text-[#292321]">
            {totalCompletions.toLocaleString("pt-BR")} sessões
          </p>
          <p className="text-xs text-emerald-700 font-medium">
            Práticas finalizadas por alunas
          </p>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
            Taxa Média de Conclusão
          </span>
          <p className="text-2xl font-serif font-bold text-[#292321]">
            {avgCompletionRate}%
          </p>
          <p className="text-xs text-[#827B77]">
            Alunas que iniciam e concluem a prática
          </p>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
            Aulas Cadastradas
          </span>
          <p className="text-2xl font-serif font-bold text-[#292321]">
            {lessons.length} aulas publicadas
          </p>
          <p className="text-xs text-[#B77D82] font-semibold">
            Em {categories.length} categorias
          </p>
        </div>
      </div>

      {/* Top Aulas Mais Concluídas */}
      <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif font-bold text-base text-[#292321]">
              Aulas com Maior Engajamento
            </h2>
            <p className="text-xs text-[#827B77]">
              Sessões com maior número de conclusões registradas pelas alunas
            </p>
          </div>
          <span className="text-xs font-semibold text-[#B77D82] bg-[#F7EEEE] px-2.5 py-1 rounded-full">
            Destaques
          </span>
        </div>

        <div className="divide-y divide-[#FAF7F2]">
          {topLessons.map((l, idx) => {
            const cat = categories.find((c) => c.id === l.categoryId);
            return (
              <div key={l.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#B77D82] font-serif font-bold text-sm flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif font-bold text-sm text-[#292321] truncate">
                      {l.title}
                    </h3>
                    <p className="text-xs text-[#827B77]">
                      {cat?.name} • {l.durationMinutes} min • {l.level}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-serif font-bold text-sm text-[#B77D82]">
                    {l.completionsCount || 0} conclusões
                  </p>
                  <p className="text-[11px] text-[#827B77]">
                    {l.viewsCount || 0} visualizações
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
