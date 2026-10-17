"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store/context";
import {
  BookMarked,
  Play,
  Clock,
  CheckCircle2,
  Flame,
  ArrowRight,
  Compass,
} from "lucide-react";

export default function StudentMyWorkoutsPage() {
  const { currentUser, lessons, categories, subcategories } = useApp();

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const availableCategoryIds = useMemo(
    () =>
      new Set(
        categories
          .filter((c) => (c.status ? c.status === "available" : c.published !== false))
          .map((c) => c.id)
      ),
    [categories]
  );

  const availableSubcategoryIds = useMemo(
    () =>
      new Set(
        subcategories
          .filter((s) => {
            const parent = categoryMap.get(s.categoryId);
            const parentIsAvailable = parent
              ? (parent.status ? parent.status === "available" : parent.published !== false)
              : false;
            const subIsAvailable = s.status ? s.status === "available" : s.published !== false;
            return parentIsAvailable && subIsAvailable;
          })
          .map((s) => s.id)
      ),
    [subcategories, categoryMap]
  );

  const publishedLessons = useMemo(
    () =>
      lessons.filter(
        (l) =>
          l.status === "publicado" &&
          availableCategoryIds.has(l.categoryId) &&
          availableSubcategoryIds.has(l.subcategoryId)
      ),
    [lessons, availableCategoryIds, availableSubcategoryIds]
  );

  const completedLessonIds = useMemo(
    () => new Set(currentUser?.completedLessonIds || []),
    [currentUser]
  );

  // Aulas concluídas
  const completedLessons = useMemo(
    () => publishedLessons.filter((l) => completedLessonIds.has(l.id)),
    [publishedLessons, completedLessonIds]
  );

  // Última aula assistida / em andamento
  const lastLesson = useMemo(
    () =>
      publishedLessons.find((l) => l.id === currentUser?.lastLessonId) ||
      publishedLessons[0],
    [publishedLessons, currentUser]
  );

  const lastCategory = useMemo(
    () => categories.find((c) => c.id === lastLesson?.categoryId),
    [categories, lastLesson]
  );

  return (
    <div className="space-y-6 animate-fade-in py-1">
      {/* Cabeçalho da Seção */}
      <section className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
              Meus Treinos
            </h1>
            <p className="text-xs sm:text-sm text-[#827B77] mt-0.5">
              Seu histórico de práticas, aulas concluídas e treino em andamento.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-[#EADBCE] px-3 py-1.5 rounded-full text-xs font-semibold text-[#B77D82] shadow-xs shrink-0">
            <Flame className="w-4 h-4 fill-[#B77D82]" />
            <span>{completedLessons.length} concluídas</span>
          </div>
        </div>
      </section>

      {/* Continuar de onde parou */}
      {lastLesson && (
        <section aria-labelledby="resume-heading" className="space-y-2.5">
          <h2 id="resume-heading" className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
            Último Treino Acessado
          </h2>

          <article className="bg-white rounded-3xl border border-[#EADBCE] p-4 shadow-xs transition hover:border-[#B77D82]/40 group flex flex-col sm:flex-row gap-4">
            <div className="relative sm:w-48 h-44 sm:h-36 rounded-2xl overflow-hidden bg-[#F3EAE3] shrink-0">
              <img
                src={lastLesson.thumbnailUrl}
                alt={lastLesson.title}
                className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
              />
              <div className="absolute inset-0 bg-black/20" />
              <Link
                href={`/aluna/aula/${lastLesson.id}`}
                className="absolute inset-0 flex items-center justify-center text-white"
                aria-label={`Continuar aula ${lastLesson.title}`}
              >
                <div className="w-11 h-11 rounded-full bg-[#B77D82] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </Link>
              <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
                {lastLesson.durationMinutes} min
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-between space-y-2.5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B77D82]">
                  {lastCategory?.name || "Pilates em Casa"}
                </span>
                <h3 className="font-serif font-bold text-lg text-[#292321] group-hover:text-[#B77D82] transition-colors leading-snug">
                  {lastLesson.title}
                </h3>
                <p className="text-xs text-[#827B77] line-clamp-2 leading-relaxed">
                  {lastLesson.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#FAF7F2]">
                <span className="text-xs text-[#827B77] capitalize">
                  Nível {lastLesson.level}
                </span>
                <Link
                  href={`/aluna/aula/${lastLesson.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold transition"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Praticar Agora
                </Link>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* Histórico de Aulas Concluídas */}
      <section aria-labelledby="completed-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="completed-heading" className="text-xs font-bold uppercase tracking-wider text-[#827B77] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Aulas Concluídas ({completedLessons.length})
          </h2>
        </div>

        {completedLessons.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EADBCE] p-8 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#B77D82] mx-auto flex items-center justify-center">
              <BookMarked className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-[#292321]">
              Você ainda não marcou nenhuma aula como concluída
            </h3>
            <p className="text-xs text-[#827B77] max-w-sm mx-auto leading-relaxed">
              Ao terminar uma prática, marque o status da aula para acompanhar seu progresso e histórico aqui.
            </p>
            <div className="pt-1">
              <Link
                href="/aluna/programas"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold shadow-xs transition"
              >
                <Compass className="w-4 h-4" />
                Explorar Catálogo de Aulas
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {completedLessons.map((lesson) => {
              const cat = categories.find((c) => c.id === lesson.categoryId);
              const sub = subcategories.find((s) => s.id === lesson.subcategoryId);

              return (
                <div
                  key={lesson.id}
                  className="bg-white rounded-2xl border border-[#EADBCE] p-3.5 shadow-2xs flex items-center gap-3.5 hover:border-[#B77D82]/40 transition group"
                >
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#F3EAE3] shrink-0">
                    <img
                      src={lesson.thumbnailUrl}
                      alt={lesson.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    <div className="absolute inset-0 bg-black/15" />
                    <Link
                      href={`/aluna/aula/${lesson.id}`}
                      className="absolute inset-0 flex items-center justify-center"
                      aria-label={`Repetir aula ${lesson.title}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#B77D82]/90 text-white flex items-center justify-center shadow-xs">
                        <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      </div>
                    </Link>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#B77D82] truncate">
                        {cat?.name || "Pilates"}
                      </span>
                      {sub && (
                        <>
                          <span className="text-[#827B77] text-[10px]">•</span>
                          <span className="text-[10px] text-[#827B77] truncate">
                            {sub.name}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="font-serif font-bold text-sm text-[#292321] truncate group-hover:text-[#B77D82] transition-colors">
                      {lesson.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-[#827B77]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#B77D82]" />
                        {lesson.durationMinutes} min
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Concluída
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/aluna/aula/${lesson.id}`}
                    className="p-2 text-[#827B77] hover:text-[#B77D82] shrink-0"
                    title="Repetir aula"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
