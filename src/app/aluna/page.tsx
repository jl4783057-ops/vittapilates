"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/lib/store/context";
import {
  Play,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
  BookOpen,
  Calendar,
  Layers,
} from "lucide-react";

export default function StudentDashboardPage() {
  const { currentUser, lessons, categories } = useApp();

  const userName = currentUser?.name ? currentUser.name.split(" ")[0] : "Aluna";
  const completedCount = currentUser?.completedLessonIds?.length || 0;

  // Aula atual para continuar
  const currentLesson =
    lessons.find((l) => l.id === currentUser?.lastLessonId) ||
    lessons[0];

  // Categoria da aula atual
  const currentCategory = categories.find((c) => c.id === currentLesson?.categoryId);

  // Treino recomendado de hoje
  const recommendedLesson =
    lessons.find((l) => l.id !== currentLesson?.id && l.status === "publicado") ||
    lessons[1] ||
    lessons[0];

  const recommendedCategory = categories.find((c) => c.id === recommendedLesson?.categoryId);

  // Programas iniciados
  const activeCategories = categories.slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Saudação e Frase Acolhedora */}
      <section className="space-y-1.5 pt-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Olá, {userName}! 🌸
          </h1>
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] border border-[#EADBCE] px-3 py-1 rounded-full text-xs font-semibold text-[#B77D82] shadow-xs">
            <Flame className="w-3.5 h-3.5 fill-[#B77D82]" />
            <span>{completedCount} aulas concluídas</span>
          </div>
        </div>
        <p className="text-sm text-[#827B77] leading-relaxed">
          Que bom ter você aqui hoje. Respire fundo, reserve este momento para você e respeite o ritmo do seu corpo.
        </p>
      </section>

      {/* Card "Continue seu treino" */}
      {currentLesson && (
        <section aria-labelledby="continue-training-heading">
          <div className="flex items-center justify-between mb-2">
            <h2 id="continue-training-heading" className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
              Continue seu treino
            </h2>
            <span className="text-[11px] text-[#B77D82] font-semibold">
              Última prática ativa
            </span>
          </div>

          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] overflow-hidden shadow-[0_6px_24px_rgba(41,35,33,0.05)] hover:shadow-md transition">
            <div className="relative h-44 w-full bg-[#F3EAE3]">
              <img
                src={currentLesson.thumbnailUrl}
                alt={currentLesson.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-[#292321] text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                <span>{currentCategory?.name || "Pilates"}</span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <p className="text-xs font-medium text-white/80">Aula atual:</p>
                <h3 className="font-serif font-bold text-base line-clamp-1">
                  {currentLesson.title}
                </h3>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Barra de progresso */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[#827B77]">
                  <span>Progresso do programa</span>
                  <span className="font-semibold text-[#B77D82]">65%</span>
                </div>
                <div className="w-full h-2 bg-[#F3EAE3] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#B77D82] rounded-full transition-all duration-500"
                    style={{ width: "65%" }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3 text-xs text-[#827B77]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#B77D82]" />
                    {currentLesson.durationMinutes} min
                  </span>
                  <span className="capitalize px-2 py-0.5 rounded-full bg-[#F3EAE3] text-[#292321] text-[11px] font-medium">
                    {currentLesson.level}
                  </span>
                </div>

                <Link
                  href={`/aluna/aula/${currentLesson.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold shadow-xs transition group cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white group-hover:scale-110 transition-transform" />
                  <span>Continuar Treino</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Acesso em Destaque ao Plano Personalizado */}
      <section className="bg-gradient-to-r from-[#FAF7F2] via-[#F7EEEE] to-[#F3EAE3] p-4 sm:p-5 rounded-3xl border border-[#EBD6D5] flex items-center justify-between gap-3 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[#B77D82]">
            <Sparkles className="w-4 h-4 fill-[#B77D82]/30" />
            <h2 className="font-serif font-bold text-sm text-[#292321]">
              {currentUser?.customPlan ? "Seu Plano Personalizado Está Ativo" : "Monte sua Rotina Personalizada"}
            </h2>
          </div>
          <p className="text-xs text-[#827B77] max-w-xs leading-relaxed">
            {currentUser?.customPlan
              ? `Focado em ${currentUser.customPlan.mainGoal} • ${currentUser.customPlan.weeklyDays}x por semana.`
              : "Descubra o ponto de partida ideal respondendo ao quiz de 1 minuto."}
          </p>
        </div>
        <Link
          href="/quiz"
          className="shrink-0 px-3.5 py-2 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold shadow-xs transition"
        >
          {currentUser?.customPlan ? "Ver Plano" : "Fazer Quiz"}
        </Link>
      </section>

      {/* Seção “Treino recomendado de hoje” */}
      {recommendedLesson && (
        <section aria-labelledby="recommended-lesson-heading" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 id="recommended-lesson-heading" className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
              Treino recomendado de hoje
            </h2>
            <span className="text-xs text-[#B77D82] font-medium">
              Sugestão diária
            </span>
          </div>

          <div className="bg-[#FFFFFF] p-3.5 rounded-3xl border border-[#EADBCE] flex items-center gap-3.5 shadow-xs hover:border-[#B77D82]/40 transition">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-[#F3EAE3]">
              <img
                src={recommendedLesson.thumbnailUrl}
                alt={recommendedLesson.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/15" />
              <Link
                href={`/aluna/aula/${recommendedLesson.id}`}
                className="absolute inset-0 flex items-center justify-center text-white"
                aria-label="Assistir aula"
              >
                <div className="w-8 h-8 rounded-full bg-[#B77D82]/90 flex items-center justify-center shadow-sm">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
              </Link>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <span className="text-[10px] font-semibold text-[#B77D82] uppercase tracking-wider">
                {recommendedCategory?.name || "Recomendado"}
              </span>
              <h3 className="font-serif font-bold text-sm text-[#292321] line-clamp-1">
                {recommendedLesson.title}
              </h3>
              <p className="text-xs text-[#827B77] line-clamp-1">
                {recommendedLesson.description}
              </p>

              <div className="flex items-center gap-3 pt-1 text-xs text-[#827B77]">
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#B77D82]" />
                  {recommendedLesson.durationMinutes} min
                </span>
                <span className="capitalize text-[11px] bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#EADBCE]">
                  {recommendedLesson.level}
                </span>
              </div>
            </div>

            <Link
              href={`/aluna/aula/${recommendedLesson.id}`}
              className="p-2.5 rounded-full bg-[#FAF7F2] hover:bg-[#F7EEEE] text-[#B77D82] transition"
              title="Assistir agora"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Programas em Andamento e Acesso à Biblioteca */}
      <section aria-labelledby="programs-started-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="programs-started-heading" className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
            Programas iniciados
          </h2>
          <Link
            href="/aluna/programas"
            className="text-xs font-semibold text-[#B77D82] hover:underline flex items-center gap-1"
          >
            Ver biblioteca completa
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {activeCategories.map((cat, idx) => {
            const progress = [70, 45, 20][idx] || 30;
            return (
              <Link
                key={cat.id}
                href={`/aluna/programas?categoria=${cat.slug}`}
                className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#EADBCE] space-y-2.5 hover:border-[#B77D82]/50 hover:shadow-xs transition block group"
              >
                <div className="relative h-24 w-full rounded-xl overflow-hidden bg-[#F3EAE3]">
                  {cat.bannerUrl && (
                    <img
                      src={cat.bannerUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/25" />
                  <div className="absolute bottom-2 left-2 text-white font-serif font-bold text-xs">
                    {cat.name}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#827B77]">
                    <span>Conclusão</span>
                    <span className="font-semibold text-[#B77D82]">{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#FAF7F2] border border-[#EADBCE]/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#B77D82] rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Botão amplo para a Biblioteca */}
      <section className="pt-1">
        <Link
          href="/aluna/programas"
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#FFFFFF] border border-[#EADBCE] text-[#292321] hover:border-[#B77D82] hover:bg-[#FAF7F2] transition shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F7EEEE] text-[#B77D82] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="font-serif font-bold text-sm text-[#292321]">
                Explorar Toda a Biblioteca
              </p>
              <p className="text-xs text-[#827B77]">
                8 categorias oficiais, subcategorias e filtros de duração
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-[#827B77] group-hover:text-[#B77D82] group-hover:translate-x-1 transition" />
        </Link>
      </section>
    </div>
  );
}
