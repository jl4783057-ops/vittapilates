"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/lib/store/context";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock,
  Flame,
  Play,
  Compass,
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
  const rawName = currentUser?.name?.trim();
  const userName = rawName
    ? rawName.split(" ")[0].replace(/[^a-zA-ZÀ-ÿ]/g, "") || "Aluna"
    : currentUser?.email
    ? currentUser.email.split("@")[0].split(".")[0].replace(/[^a-zA-ZÀ-ÿ]/g, "") || "Aluna"
    : "Aluna";
  const completedLessonIds = new Set(currentUser?.completedLessonIds || []);

  const currentLesson =
    publishedLessons.find((lesson) => lesson.id === currentUser?.lastLessonId) || publishedLessons[0];
  const currentCategory = categories.find((category) => category.id === currentLesson?.categoryId);

  // A aula recomendada usa o dia local da Bahia como índice, então a sugestão diária varia de forma consistente.
  const recommendationOptions = publishedLessons.filter((lesson) => lesson.id !== currentLesson?.id);
  const recommendedLesson = recommendationOptions.length
    ? recommendationOptions[getBahiaDayNumber() % recommendationOptions.length]
    : currentLesson;
  const recommendedCategory = categories.find(
    (category) => category.id === recommendedLesson?.categoryId,
  );

  // Categorias de objetivo ativas
  const programCategories = categories
    .filter((category) => category.published && publishedLessons.some((lesson) => lesson.categoryId === category.id))
    .slice(0, 4);

  return (
    <div className="space-y-6 sm:space-y-7 animate-fade-in py-1">
      {/* 1. Saudação acolhedora e badge de consistência */}
      <section className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#B77D82] block">
              Bem-vinda de volta
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321] tracking-tight">
              Olá, {userName}!
            </h1>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-[#EADBCE] px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#B77D82] shadow-xs shrink-0">
            <Flame className="w-4 h-4 fill-[#B77D82]" />
            <span>{currentUser?.completedLessonIds?.length || 0} concluídas</span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed max-w-md">
          Respire fundo, reserve este momento para você e respeite o ritmo natural do seu corpo.
        </p>
      </section>

      {/* 2. Destaque Visual Principal: Continuar Treino de Onde Parou */}
      {currentLesson && (
        <section aria-labelledby="continue-training-heading" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 id="continue-training-heading" className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
              Continuar Treino
            </h2>
            <Link
              href="/aluna/treinos"
              className="text-xs text-[#B77D82] font-semibold hover:underline"
            >
              Meus treinos
            </Link>
          </div>

          <article className="relative bg-white rounded-3xl border border-[#EADBCE] overflow-hidden shadow-[0_8px_30px_rgba(41,35,33,0.06)] group transition hover:border-[#B77D82]/50">
            {/* Imagem de Capa do Treino */}
            <div className="relative aspect-[16/9] w-full bg-[#F3EAE3] overflow-hidden">
              <img
                src={currentLesson.thumbnailUrl}
                alt={currentLesson.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

              <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                <span className="rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-[#292321] shadow-xs">
                  {currentCategory?.name || "Pilates em Casa"}
                </span>
              </div>

              <span className="absolute top-3.5 right-3.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                {currentLesson.durationMinutes} min
              </span>

              {/* Botão de Play em Destaque Flutuante */}
              <Link
                href={`/aluna/aula/${currentLesson.id}`}
                className="absolute inset-0 flex items-center justify-center text-white"
                aria-label={`Assistir aula ${currentLesson.title}`}
              >
                <div className="w-14 h-14 rounded-full bg-[#B77D82] text-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <Play className="w-6 h-6 fill-white ml-1" />
                </div>
              </Link>
            </div>

            {/* Conteúdo do Card */}
            <div className="p-5 space-y-3.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-[#827B77]">
                  <span className="capitalize font-medium text-[#B77D82]">
                    Prática guiada
                  </span>
                  <span>•</span>
                  <span className="capitalize">Nível {currentLesson.level}</span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold leading-snug text-[#292321] group-hover:text-[#B77D82] transition-colors">
                  {currentLesson.title}
                </h3>
                {currentLesson.description && (
                  <p className="text-xs sm:text-sm text-[#827B77] line-clamp-2 leading-relaxed">
                    {currentLesson.description}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#FAF7F2]">
                <div className="flex items-center gap-1.5 text-xs text-[#827B77]">
                  <Clock className="w-4 h-4 text-[#B77D82]" />
                  <span>Duração: {currentLesson.durationMinutes} minutos</span>
                </div>

                <Link
                  href={`/aluna/aula/${currentLesson.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#B77D82] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#A3676C]"
                >
                  <span>Continuar aula</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* 3. Bloco de Treino Recomendado de Hoje */}
      {recommendedLesson && (
        <section aria-labelledby="recommended-lesson-heading" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 id="recommended-lesson-heading" className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
              Recomendado para Hoje
            </h2>
            <span className="text-[11px] text-[#B77D82] font-semibold">Sugestão diária</span>
          </div>

          <article className="flex items-center gap-3.5 rounded-3xl border border-[#EADBCE] bg-white p-3.5 shadow-2xs transition hover:border-[#B77D82]/50 group">
            <div className="relative h-20 w-20 sm:h-22 sm:w-22 shrink-0 overflow-hidden rounded-2xl bg-[#F3EAE3]">
              <img
                src={recommendedLesson.thumbnailUrl}
                alt={recommendedLesson.title}
                className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-black/20" />
              <Link
                href={`/aluna/aula/${recommendedLesson.id}`}
                className="absolute inset-0 flex items-center justify-center text-white"
                aria-label="Assistir aula recomendada"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#B77D82] shadow-xs group-hover:scale-110 transition-transform">
                  <Play className="h-4 w-4 fill-white ml-0.5" />
                </span>
              </Link>
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B77D82]">
                {recommendedCategory?.name || "Recomendado"}
              </span>
              <h3 className="line-clamp-1 font-serif text-sm sm:text-base font-bold text-[#292321] group-hover:text-[#B77D82] transition-colors">
                {recommendedLesson.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-[#827B77]">
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5 text-[#B77D82]" />
                  {recommendedLesson.durationMinutes} min
                </span>
                <span className="capitalize">{recommendedLesson.level}</span>
              </div>
            </div>

            <Link
              href={`/aluna/aula/${recommendedLesson.id}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FAF7F2] text-[#827B77] transition group-hover:bg-[#B77D82] group-hover:text-white"
              aria-label="Assistir agora"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </section>
      )}

      {/* 4. Categorias de Objetivo (sem barras ou percentuais de progresso) */}
      <section aria-labelledby="objectives-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="objectives-heading" className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
              Objetivos & Programas
            </h2>
            <p className="text-[11px] text-[#827B77] mt-0.5">
              Escolha seu foco para acessar os treinos específicos.
            </p>
          </div>
          <Link
            href="/aluna/programas"
            className="flex items-center gap-1 text-xs font-semibold text-[#B77D82] hover:underline"
          >
            Explorar todos <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {programCategories.map((category) => {
            const categoryLessons = publishedLessons.filter((lesson) => lesson.categoryId === category.id);
            const levels = Array.from(new Set(categoryLessons.map((lesson) => lesson.level)));
            const levelLabel = levels.length === 1
              ? levels[0].charAt(0).toUpperCase() + levels[0].slice(1)
              : "Todos os níveis";

            return (
              <Link
                key={category.id}
                href={`/aluna/programas?categoria=${category.slug}`}
                className="group relative flex items-center gap-3.5 rounded-3xl border border-[#EADBCE] bg-white p-3.5 shadow-2xs transition hover:border-[#B77D82]/50 hover:shadow-xs"
              >
                <div className="h-18 w-18 shrink-0 overflow-hidden rounded-2xl bg-[#F3EAE3]">
                  {category.bannerUrl ? (
                    <img
                      src={category.bannerUrl}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[#B77D82]">
                      <Compass className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="line-clamp-1 font-serif text-base font-bold text-[#292321] group-hover:text-[#B77D82] transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-xs text-[#827B77]">
                    {categoryLessons.length} aulas <span className="mx-1">•</span> {levelLabel}
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-[#827B77] transition group-hover:translate-x-1 group-hover:text-[#B77D82]" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. Atalho para a Biblioteca Completa */}
      <Link
        href="/aluna/programas"
        className="group flex w-full items-center justify-between rounded-3xl border border-[#EADBCE] bg-gradient-to-r from-white via-white to-[#FAF7F2] p-4 text-[#292321] shadow-2xs transition hover:border-[#B77D82]"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7EEEE] text-[#B77D82] shadow-2xs">
            <BookOpen className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-serif text-base font-bold text-[#292321]">
              Explorar Todos os Objetivos e Focos
            </span>
            <span className="block text-xs text-[#827B77]">
              Veja todas as categorias, subcategorias e aulas disponíveis
            </span>
          </span>
        </span>
        <ArrowRight className="h-5 w-5 text-[#827B77] transition group-hover:translate-x-1 group-hover:text-[#B77D82]" />
      </Link>
    </div>
  );
}
