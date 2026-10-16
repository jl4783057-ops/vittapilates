"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/lib/store/context";
import {
  Clock,
  Play,
  ArrowRight,
  Compass,
  Sparkles,
} from "lucide-react";

function getBahiaDayNumber() {
  try {
    const dateInBahia = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bahia",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return Math.floor(Date.parse(`${dateInBahia}T00:00:00Z`) / 86_400_000);
  } catch {
    return Math.floor(Date.now() / 86_400_000);
  }
}

export default function StudentDashboardPage() {
  const { currentUser, lessons, categories } = useApp();
  const publishedLessons = lessons.filter((lesson) => lesson.status === "publicado");

  // Aula para continuar ou primeira aula disponível
  const currentLesson =
    publishedLessons.find((lesson) => lesson.id === currentUser?.lastLessonId) ||
    publishedLessons[0];

  // Aula recomendada para hoje (outra aula do catálogo real, se houver)
  const recommendationOptions = publishedLessons.filter((lesson) => lesson.id !== currentLesson?.id);
  const recommendedLesson = recommendationOptions.length > 0
    ? recommendationOptions[getBahiaDayNumber() % recommendationOptions.length]
    : null;

  // Categorias ativas
  const activeCategories = categories
    .filter((category) => category.published)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in py-1">
      {/* 1. Saudação acolhedora e editorial */}
      <section className="space-y-1.5 pt-1 sm:pt-2">
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#292321] leading-tight">
          Seu momento começa aqui.
        </h1>
        <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed max-w-md font-sans">
          Movimento, bem-estar e mais presença para todos os seus dias.
        </p>
      </section>

      {/* 2. Bloco de Destaque: Continuar Treino com Play Circular */}
      {currentLesson ? (
        <section aria-label="Continuar treino">
          <article className="relative rounded-[28px] overflow-hidden border border-[#EADBCE] bg-[#F3EAE3] shadow-sm group hover:border-[#B77D82]/50 transition-all">
            <div className="relative aspect-[16/10] sm:aspect-[21/9] w-full overflow-hidden">
              {currentLesson.thumbnailUrl ? (
                <img
                  src={currentLesson.thumbnailUrl}
                  alt={currentLesson.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
                />
              ) : (
                <div className="w-full h-full bg-[#EADFD5] flex items-center justify-center text-[#B77D82]">
                  <Compass className="w-12 h-12 opacity-40" />
                </div>
              )}
              {/* Gradiente escuro para legibilidade */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

              <div className="absolute inset-0 p-5 sm:p-7 flex flex-col justify-end text-white">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold text-[#EBD6D5]">
                  {currentUser?.completedLessonIds?.length ? "CONTINUAR TREINO" : "PRÁTICA EM DESTAQUE"}
                </span>

                <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium text-white mt-1 leading-snug line-clamp-2">
                  {currentLesson.title}
                </h2>

                <div className="mt-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3.5 text-xs text-white/90 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#EBD6D5]" />
                      {currentLesson.durationMinutes} min
                    </span>
                    <span className="flex items-center gap-1.5 capitalize">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EBD6D5]" />
                      {currentLesson.level}
                    </span>
                  </div>

                  <Link
                    href={`/aluna/aula/${currentLesson.id}`}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 hover:bg-[#B77D82] border border-white/70 backdrop-blur-md text-white flex items-center justify-center transition-all duration-300 shadow-md group-hover:scale-105 group-hover:bg-[#B77D82] group-hover:border-[#B77D82] cursor-pointer"
                    aria-label={`Iniciar aula ${currentLesson.title}`}
                  >
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </article>
        </section>
      ) : (
        <section className="p-8 sm:p-10 rounded-[28px] bg-white border border-[#EADBCE] text-center space-y-2.5 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#B77D82] mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-serif font-bold text-lg text-[#292321]">
            Seu espaço de práticas está pronto
          </h2>
          <p className="text-xs text-[#827B77] max-w-sm mx-auto leading-relaxed">
            As aulas do catálogo serão exibidas aqui para você iniciar seu momento de movimento.
          </p>
        </section>
      )}

      {/* 3. Bloco: Recomendado para Hoje (horizontal com thumbnail, texto e play) */}
      {recommendedLesson && (
        <section aria-label="Recomendado para hoje" className="space-y-2.5">
          <article className="rounded-[24px] bg-white border border-[#EADBCE] p-3.5 sm:p-4.5 flex items-center gap-3.5 sm:gap-4 shadow-2xs hover:border-[#B77D82]/50 transition group">
            <div className="relative w-22 h-22 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 bg-[#F3EAE3] border border-[#EADBCE]/60">
              {recommendedLesson.thumbnailUrl ? (
                <img
                  src={recommendedLesson.thumbnailUrl}
                  alt={recommendedLesson.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#B77D82]">
                  <Play className="w-6 h-6 opacity-40" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B77D82] block">
                RECOMENDADO PARA HOJE
              </span>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#292321] line-clamp-1 group-hover:text-[#B77D82] transition-colors leading-snug">
                {recommendedLesson.title}
              </h3>
              {recommendedLesson.description && (
                <p className="text-xs text-[#827B77] line-clamp-2 leading-relaxed">
                  {recommendedLesson.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-[#827B77] pt-0.5">
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#B77D82]" />
                  {recommendedLesson.durationMinutes} min
                </span>
                <span className="capitalize">{recommendedLesson.level}</span>
              </div>
            </div>

            <Link
              href={`/aluna/aula/${recommendedLesson.id}`}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition cursor-pointer"
              aria-label={`Praticar aula ${recommendedLesson.title}`}
            >
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </Link>
          </article>
        </section>
      )}

      {/* 4. Seção: Explore por Categoria */}
      <section aria-labelledby="categories-heading" className="space-y-3.5 pt-1">
        <div className="flex items-center justify-between">
          <h2 id="categories-heading" className="font-serif font-bold text-xl sm:text-2xl text-[#292321]">
            Explore por categoria
          </h2>
          <Link
            href="/aluna/programas"
            className="text-xs font-semibold text-[#B77D82] hover:text-[#A3676C] flex items-center gap-1 transition"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Linha de categorias: scroll suave em mobile, grid de 4 colunas em desktop */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-4 sm:gap-4">
          {activeCategories.slice(0, 4).map((category) => (
            <Link
              key={category.id}
              href={`/aluna/programas?categoria=${category.slug}`}
              className="w-28 sm:w-auto shrink-0 group flex flex-col items-center sm:items-start text-center sm:text-left cursor-pointer"
            >
              <div className="aspect-square w-full rounded-2xl overflow-hidden bg-[#F3EAE3] border border-[#EADBCE] shadow-2xs group-hover:border-[#B77D82]/60 group-hover:shadow-xs transition relative">
                {category.bannerUrl ? (
                  <img
                    src={category.bannerUrl}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#B77D82]">
                    <Compass className="w-8 h-8 opacity-50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition" />
              </div>
              <span className="font-medium text-xs text-[#292321] mt-2 group-hover:text-[#B77D82] transition line-clamp-2">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
