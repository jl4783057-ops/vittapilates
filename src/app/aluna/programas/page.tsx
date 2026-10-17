"use client";

import React, { useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/store/context";
import { Category, Subcategory, PublicationStatus } from "@/types";
import {
  Clock,
  Play,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Compass,
  Sparkles,
  AlertCircle,
  Clock3,
} from "lucide-react";

function getCategoryStatus(c?: Category | null): PublicationStatus {
  if (!c) return "hidden";
  if (c.status === "available" || c.status === "updating" || c.status === "hidden") {
    return c.status;
  }
  return c.published === false ? "hidden" : "available";
}

function getSubcategoryStatus(s?: Subcategory | null, parent?: Category | null): PublicationStatus {
  if (!s) return "hidden";
  const parentStatus = getCategoryStatus(parent);
  if (parentStatus === "hidden") return "hidden";

  const rawStatus =
    s.status === "available" || s.status === "updating" || s.status === "hidden"
      ? s.status
      : s.published === false
      ? "hidden"
      : "available";

  if (rawStatus === "hidden") return "hidden";
  if (parentStatus === "updating") return "updating";
  return rawStatus;
}

function ProgramsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("categoria");
  const subcategoryParam = searchParams.get("subcategoria");

  const { categories, subcategories, lessons, exercises = [] } = useApp();

  const selectedCategory = categoryParam || null;
  const selectedSubcategory = subcategoryParam || null;
  const [selectedExerciseId, setSelectedExerciseId] = React.useState<string | null>(null);

  // 1. Categorias visíveis no Explorar (Disponível ou Em atualização; Oculta é excluída)
  const visibleCategories = useMemo(
    () =>
      categories
        .filter((c) => getCategoryStatus(c) !== "hidden")
        .sort((a, b) => a.order - b.order),
    [categories]
  );

  // Categoria atualmente selecionada (bloqueada se for 'hidden')
  const currentCategoryData = useMemo(() => {
    if (!selectedCategory) return null;
    const found = categories.find(
      (c) => c.slug === selectedCategory || c.id === selectedCategory
    );
    return found || null;
  }, [categories, selectedCategory]);

  const categoryStatus = getCategoryStatus(currentCategoryData);

  // 2. Subcategorias vinculadas à categoria atual (exclui ocultas)
  const linkedSubcategories = useMemo(() => {
    if (!currentCategoryData || categoryStatus === "hidden") return [];
    return subcategories
      .filter((s) => s.categoryId === currentCategoryData.id)
      .map((s) => ({
        ...s,
        effectiveStatus: getSubcategoryStatus(s, currentCategoryData),
      }))
      .filter((s) => s.effectiveStatus !== "hidden")
      .sort((a, b) => a.order - b.order);
  }, [subcategories, currentCategoryData, categoryStatus]);

  // Subcategoria atualmente selecionada
  const currentSubcategoryData = useMemo(() => {
    if (!selectedSubcategory) return null;
    return (
      subcategories.find(
        (s) =>
          (s.id === selectedSubcategory || s.slug === selectedSubcategory) &&
          (!currentCategoryData || s.categoryId === currentCategoryData.id)
      ) || null
    );
  }, [subcategories, selectedSubcategory, currentCategoryData]);

  const subcategoryEffectiveStatus = getSubcategoryStatus(
    currentSubcategoryData,
    currentCategoryData
  );

  // Exercícios vinculados estritamente à subcategoria aberta
  const subcategoryExercises = useMemo(() => {
    if (!currentSubcategoryData) return [];
    return (exercises || [])
      .filter((e) => e.subcategoryId === currentSubcategoryData.id)
      .sort((a, b) => a.order - b.order);
  }, [exercises, currentSubcategoryData]);

  // Exercício ativo (prioriza o selecionado ou o primeiro da lista)
  const activeExerciseId = useMemo(() => {
    if (selectedExerciseId && subcategoryExercises.some((e) => e.id === selectedExerciseId)) {
      return selectedExerciseId;
    }
    return subcategoryExercises[0]?.id || null;
  }, [selectedExerciseId, subcategoryExercises]);

  const activeExercise = useMemo(() => {
    if (!activeExerciseId) return null;
    return subcategoryExercises.find((e) => e.id === activeExerciseId) || null;
  }, [activeExerciseId, subcategoryExercises]);

  // Aulas do exercício atualmente ativo
  const activeExerciseLessons = useMemo(() => {
    if (!activeExerciseId) return [];
    return lessons
      .filter((l) => l.status === "publicado" && l.exerciseId === activeExerciseId)
      .sort((a, b) => a.order - b.order);
  }, [lessons, activeExerciseId]);

  // Aulas vinculadas à subcategoria que não possuem exercício atribuído
  const unassignedSubcategoryLessons = useMemo(() => {
    if (
      !currentCategoryData ||
      !currentSubcategoryData ||
      categoryStatus !== "available" ||
      subcategoryEffectiveStatus !== "available"
    ) {
      return [];
    }

    return lessons.filter(
      (l) =>
        l.status === "publicado" &&
        l.categoryId === currentCategoryData.id &&
        l.subcategoryId === currentSubcategoryData.id &&
        (!l.exerciseId || !subcategoryExercises.some((e) => e.id === l.exerciseId))
    );
  }, [
    lessons,
    currentCategoryData,
    currentSubcategoryData,
    categoryStatus,
    subcategoryEffectiveStatus,
    subcategoryExercises,
  ]);

  // Aulas vinculadas estritamente à subcategoria aberta (para modo legado sem exercícios)
  const subcategoryLessons = useMemo(() => {
    if (
      !currentCategoryData ||
      !currentSubcategoryData ||
      categoryStatus !== "available" ||
      subcategoryEffectiveStatus !== "available"
    ) {
      return [];
    }

    return lessons.filter(
      (l) =>
        l.status === "publicado" &&
        l.categoryId === currentCategoryData.id &&
        l.subcategoryId === currentSubcategoryData.id
    );
  }, [lessons, currentCategoryData, currentSubcategoryData, categoryStatus, subcategoryEffectiveStatus]);

  const handleOpenCategory = (catSlug: string) => {
    router.push(`/aluna/programas?categoria=${encodeURIComponent(catSlug)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenSubcategory = (subIdOrSlug: string) => {
    if (currentCategoryData) {
      router.push(
        `/aluna/programas?categoria=${encodeURIComponent(currentCategoryData.slug)}&subcategoria=${encodeURIComponent(subIdOrSlug)}`
      );
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToCategories = () => {
    router.push("/aluna/programas");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToSubcategories = () => {
    if (currentCategoryData) {
      router.push(`/aluna/programas?categoria=${encodeURIComponent(currentCategoryData.slug)}`);
    } else {
      router.push("/aluna/programas");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* =========================================================================
     CASO DE CATEGORIA OCULTA OU INEXISTENTE ACESSADA POR URL
     ========================================================================= */
  if (selectedCategory && (!currentCategoryData || categoryStatus === "hidden")) {
    return (
      <div className="space-y-6 animate-fade-in py-6 max-w-md mx-auto text-center">
        <div className="w-14 h-14 rounded-full bg-[#FAF7F2] text-[#827B77] mx-auto flex items-center justify-center border border-[#EADBCE]">
          <AlertCircle className="w-7 h-7 text-[#827B77]" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-[#292321]">
            Categoria não encontrada
          </h2>
          <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed">
            Esta categoria não está disponível no momento para as alunas.
          </p>
        </div>
        <button
          type="button"
          onClick={handleBackToCategories}
          className="px-5 py-2.5 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition shadow-xs cursor-pointer"
        >
          Voltar para todas as categorias
        </button>
      </div>
    );
  }

  /* =========================================================================
     ETAPA 3: LISTAGEM DE AULAS DA SUBCATEGORIA ABERTA
     ========================================================================= */
  if (currentCategoryData && currentSubcategoryData) {
    // Se a subcategoria for oculta
    if (subcategoryEffectiveStatus === "hidden") {
      return (
        <div className="space-y-6 animate-fade-in py-6 max-w-md mx-auto text-center">
          <div className="w-14 h-14 rounded-full bg-[#FAF7F2] text-[#827B77] mx-auto flex items-center justify-center border border-[#EADBCE]">
            <AlertCircle className="w-7 h-7 text-[#827B77]" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-bold text-[#292321]">
              Tema não encontrado
            </h2>
            <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed">
              Este tema não está disponível no momento.
            </p>
          </div>
          <button
            type="button"
            onClick={handleBackToSubcategories}
            className="px-5 py-2.5 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition shadow-xs cursor-pointer"
          >
            Voltar aos temas de {currentCategoryData.name}
          </button>
        </div>
      );
    }

    // Se a categoria OU a subcategoria estiverem "Em atualização"
    const isUpdating = categoryStatus === "updating" || subcategoryEffectiveStatus === "updating";

    return (
      <div className="space-y-6 sm:space-y-7 animate-fade-in py-1">
        {/* Botão Voltar */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleBackToSubcategories}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#827B77] hover:text-[#292321] transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-[#B77D82]" />
            <span>Voltar aos temas de {currentCategoryData.name}</span>
          </button>
        </div>

        {/* Cabeçalho da Subcategoria Aberta */}
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B77D82]">
              {currentCategoryData.name}
            </span>
            {isUpdating && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Clock3 className="w-3 h-3" />
                Em atualização
              </span>
            )}
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#292321] tracking-tight">
            {currentSubcategoryData.name}
          </h1>
          {currentSubcategoryData.description && (
            <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed max-w-xl">
              {currentSubcategoryData.description}
            </p>
          )}
        </header>

        {/* AVISO MANDATÓRIO CASO ESTEJA EM ATUALIZAÇÃO */}
        {isUpdating && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3 shadow-2xs">
            <Clock3 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h3 className="text-xs sm:text-sm font-bold text-amber-950 font-serif">
                Em atualização — nossas aulas estarão disponíveis em breve.
              </h3>
              <p className="text-[11px] sm:text-xs text-amber-900 leading-relaxed font-sans">
                {categoryStatus === "updating"
                  ? `A categoria "${currentCategoryData.name}" está sendo atualizada com novas práticas exclusivas. O acesso às aulas está temporariamente pausado.`
                  : "Estamos refinando as práticas deste tema para oferecer a melhor experiência para você."}
              </p>
            </div>
          </div>
        )}

        {/* Grade de Aulas ou Bloqueio */}
        <section aria-label="Aulas disponíveis">
          {isUpdating ? (
            <div className="bg-white rounded-[26px] border border-[#EADBCE] p-8 sm:p-12 text-center space-y-3 shadow-2xs">
              <div className="w-14 h-14 rounded-full bg-[#FAF7F2] text-amber-700 mx-auto flex items-center justify-center border border-amber-200">
                <Clock3 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#292321]">
                  Aulas temporariamente indisponíveis
                </h3>
                <p className="text-xs sm:text-sm text-[#827B77] max-w-md mx-auto leading-relaxed">
                  Em atualização — nossas aulas estarão disponíveis em breve. Explore outros temas já liberados em nossa plataforma.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleBackToSubcategories}
                  className="px-5 py-2.5 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition shadow-xs cursor-pointer"
                >
                  Ver outros temas de {currentCategoryData.name}
                </button>
              </div>
            </div>
          ) : subcategoryExercises.length > 0 ? (
            <div className="space-y-6">
              {/* Barra de introdução dos Exercícios */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EADBCE]/80 pb-3">
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-[#292321]">
                    Exercícios Disponíveis
                  </h2>
                  <p className="text-xs text-[#827B77]">
                    Toque em um exercício para acessar a aula ou as aulas correspondentes.
                  </p>
                </div>
                <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full bg-[#FAF7F2] text-[#B77D82] border border-[#EADBCE]">
                  {subcategoryExercises.length} {subcategoryExercises.length === 1 ? "exercício" : "exercícios"}
                </span>
              </div>

              {/* Grade de Quadradinhos / Cards dos Exercícios */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {subcategoryExercises.map((exercise, index) => {
                  const isActive = exercise.id === activeExerciseId;
                  const exLessons = lessons.filter(
                    (l) => l.status === "publicado" && l.exerciseId === exercise.id
                  );
                  const totalDuration = exLessons.reduce(
                    (acc, l) => acc + (l.durationMinutes || 0),
                    0
                  );

                  return (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => setSelectedExerciseId(exercise.id)}
                      className={`group relative rounded-[22px] p-3.5 sm:p-4 text-left transition-all flex flex-col justify-between cursor-pointer border ${
                        isActive
                          ? "bg-[#FAF7F2] border-[#B77D82] ring-2 ring-[#B77D82]/20 shadow-xs"
                          : "bg-white border-[#EADBCE] hover:border-[#B77D82]/50 hover:bg-[#FAF7F2]/40 shadow-2xs"
                      }`}
                    >
                      {/* Topo: Ícone de Play e Badge do Número */}
                      <div className="flex items-center justify-between w-full mb-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                            isActive
                              ? "bg-[#B77D82] text-white shadow-2xs"
                              : "bg-[#FAF7F2] text-[#B77D82] border border-[#EADBCE] group-hover:bg-[#B77D82] group-hover:text-white"
                          }`}
                        >
                          <Play className="w-4 h-4 ml-0.5 fill-current" />
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-[#B77D82]/15 text-[#B77D82]"
                              : "bg-[#FAF7F2] text-[#827B77] border border-[#EADBCE]"
                          }`}
                        >
                          #{index + 1}
                        </span>
                      </div>

                      {/* Nome do Exercício */}
                      <div className="space-y-1">
                        <h3
                          className={`font-serif font-bold text-xs sm:text-sm line-clamp-2 leading-tight transition-colors ${
                            isActive ? "text-[#B77D82]" : "text-[#292321] group-hover:text-[#B77D82]"
                          }`}
                        >
                          {exercise.title || `Exercício ${index + 1}`}
                        </h3>
                        <p className="text-[11px] text-[#827B77]">
                          {exLessons.length} {exLessons.length === 1 ? "aula" : "aulas"}
                        </p>
                      </div>

                      {/* Indicador de Seleção Ativa */}
                      <div className="mt-3 pt-2 border-t border-[#FAF7F2] flex items-center justify-between text-[10px] font-semibold">
                        <span className={isActive ? "text-[#B77D82]" : "text-[#827B77]"}>
                          {isActive ? "Selecionado" : "Tocar p/ ver"}
                        </span>
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform ${
                            isActive ? "text-[#B77D82] translate-x-0.5" : "text-[#827B77]/60"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detalhe e Aulas do Exercício Ativo */}
              {activeExercise && (
                <div className="mt-6 rounded-[24px] bg-white border border-[#EADBCE] p-5 sm:p-7 shadow-xs space-y-5 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#FAF7F2]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#B77D82] bg-[#FAF7F2] px-2.5 py-0.5 rounded-full border border-[#EADBCE]">
                          Aulas do {activeExercise.title}
                        </span>
                        <span className="text-xs text-[#827B77]">
                          {activeExerciseLessons.length}{" "}
                          {activeExerciseLessons.length === 1 ? "prática" : "práticas"}
                        </span>
                      </div>
                      <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#292321]">
                        {activeExercise.title}
                      </h3>
                      {activeExercise.description && (
                        <p className="text-xs sm:text-sm text-[#827B77] max-w-2xl leading-relaxed">
                          {activeExercise.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {activeExerciseLessons.length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                      <div className="w-11 h-11 rounded-full bg-[#FAF7F2] text-[#B77D82] mx-auto flex items-center justify-center">
                        <Play className="w-4 h-4 ml-0.5 opacity-60" />
                      </div>
                      <p className="font-serif font-bold text-sm text-[#292321]">
                        Nenhuma aula cadastrada ainda para este exercício.
                      </p>
                      <p className="text-xs text-[#827B77]">
                        O administrador cadastrará as aulas deste exercício em breve.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {activeExerciseLessons.map((lesson) => (
                        <article
                          key={lesson.id}
                          className="rounded-[22px] bg-[#FAF7F2]/50 border border-[#EADBCE] p-4 sm:p-5 hover:border-[#B77D82]/60 hover:bg-white transition group flex flex-col justify-between gap-3.5 shadow-2xs"
                        >
                          <div className="space-y-1.5 min-w-0">
                            <h4 className="font-serif font-bold text-base sm:text-lg text-[#292321] group-hover:text-[#B77D82] transition-colors leading-snug">
                              {lesson.title}
                            </h4>
                            {lesson.showDescription !== false && lesson.description && (
                              <p className="text-xs sm:text-sm text-[#827B77] line-clamp-3 leading-relaxed">
                                {lesson.description}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-[#EADBCE]/50 flex items-center justify-end">
                            <Link
                              href={`/aluna/aula/${lesson.id}`}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition shadow-xs cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              <span>Praticar Aula</span>
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Se houver aulas legadas no tema sem exercício atribuído */}
              {unassignedSubcategoryLessons.length > 0 && (
                <div className="mt-8 pt-6 border-t border-[#EADBCE]/80 space-y-4">
                  <h3 className="font-serif text-base font-bold text-[#292321]">
                    Outras aulas disponíveis neste tema
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {unassignedSubcategoryLessons.map((lesson) => (
                      <article
                        key={lesson.id}
                        className="rounded-[22px] bg-white border border-[#EADBCE] p-4 sm:p-5 hover:border-[#B77D82]/60 transition group flex flex-col justify-between gap-3.5 shadow-2xs"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <h4 className="font-serif font-bold text-base sm:text-lg text-[#292321] group-hover:text-[#B77D82] transition-colors leading-snug">
                            {lesson.title}
                          </h4>
                          {lesson.showDescription !== false && lesson.description && (
                            <p className="text-xs sm:text-sm text-[#827B77] line-clamp-3 leading-relaxed">
                              {lesson.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-[#EADBCE]/50 flex items-center justify-end">
                          <Link
                            href={`/aluna/aula/${lesson.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition shadow-xs cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            <span>Praticar Aula</span>
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : subcategoryLessons.length === 0 ? (
            <div className="bg-white rounded-[26px] border border-[#EADBCE] p-8 sm:p-10 text-center space-y-2.5 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#B77D82] mx-auto flex items-center justify-center">
                <Play className="w-5 h-5 opacity-60 ml-0.5" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#292321]">
                Em breve novas aulas neste tema
              </h3>
              <p className="text-xs text-[#827B77] max-w-sm mx-auto leading-relaxed">
                As novas aulas cadastradas aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {subcategoryLessons.map((lesson) => (
                <article
                  key={lesson.id}
                  className="rounded-[24px] bg-white border border-[#EADBCE] p-4 sm:p-5 hover:border-[#B77D82]/60 shadow-2xs hover:shadow-xs transition group flex flex-col justify-between gap-3.5"
                >
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="font-serif font-bold text-base sm:text-lg text-[#292321] group-hover:text-[#B77D82] transition-colors leading-snug">
                      {lesson.title}
                    </h3>
                    {lesson.showDescription !== false && lesson.description && (
                      <p className="text-xs sm:text-sm text-[#827B77] line-clamp-3 leading-relaxed">
                        {lesson.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#FAF7F2] flex items-center justify-end">
                    <Link
                      href={`/aluna/aula/${lesson.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition shadow-xs cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      <span>Praticar Aula</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  /* =========================================================================
     ETAPA 2: TELA DE DETALHE DA CATEGORIA (LISTAGEM DE TEMAS / SUBCATEGORIAS)
     ========================================================================= */
  if (currentCategoryData) {
    const isCategoryUpdating = categoryStatus === "updating";

    return (
      <div className="space-y-6 sm:space-y-7 animate-fade-in py-1">
        {/* Botão Voltar */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleBackToCategories}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#827B77] hover:text-[#292321] transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-[#B77D82]" />
            <span>Voltar para todas as categorias</span>
          </button>
        </div>

        {/* Título da Categoria em destaque editorial com badge se estiver em atualização */}
        <header className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#292321]">
              {currentCategoryData.name}
            </h1>
            {isCategoryUpdating && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Clock3 className="w-3.5 h-3.5" />
                Em atualização
              </span>
            )}
          </div>
        </header>

        {/* AVISO DE DESTAQUE MANDATÓRIO SE A CATEGORIA ESTIVER EM ATUALIZAÇÃO */}
        {isCategoryUpdating && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3 shadow-2xs">
            <Clock3 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h3 className="text-xs sm:text-sm font-bold text-amber-950 font-serif">
                Em atualização — nossas aulas estarão disponíveis em breve.
              </h3>
              <p className="text-[11px] sm:text-xs text-amber-900 leading-relaxed font-sans">
                Estamos finalizando práticas especiais nesta categoria. Os temas e aulas abaixo ficarão liberados assim que a atualização for concluída.
              </p>
            </div>
          </div>
        )}

        {/* Banner com foto real da categoria (esmaecido/cinza se estiver em atualização) */}
        <div
          className={`relative rounded-[26px] overflow-hidden border border-[#EADBCE] shadow-xs bg-[#F3EAE3] aspect-[16/8] sm:aspect-[21/9] ${
            isCategoryUpdating ? "filter grayscale contrast-90 opacity-75" : ""
          }`}
        >
          {currentCategoryData.bannerUrl ? (
            <img
              src={currentCategoryData.bannerUrl}
              alt={currentCategoryData.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#B77D82]">
              <Compass className="w-12 h-12 opacity-50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent flex flex-col justify-end p-5 sm:p-7 text-white">
            <p className="font-serif text-lg sm:text-2xl font-normal text-white/95 max-w-sm sm:max-w-md leading-snug drop-shadow-xs">
              {currentCategoryData.description || "Práticas e movimentos para o seu bem-estar diário."}
            </p>
          </div>
        </div>

        {/* Descrição curta da categoria */}
        {currentCategoryData.description && (
          <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed max-w-2xl font-sans">
            {currentCategoryData.description}
          </p>
        )}

        {/* Seção "Escolha um tema" com lista de subcategorias */}
        <section aria-labelledby="choose-theme-heading" className="space-y-3.5 pt-1">
          <div className="flex items-center justify-between">
            <h2 id="choose-theme-heading" className="font-serif text-xl sm:text-2xl font-bold text-[#292321]">
              Escolha um tema
            </h2>
            {isCategoryUpdating && (
              <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Temas com aulas em atualização
              </span>
            )}
          </div>

          {linkedSubcategories.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-[#EADBCE] p-8 text-center space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-[#FAF7F2] text-[#B77D82] mx-auto flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#292321]">
                Em atualização — em breve teremos aulas nesta categoria.
              </h3>
              <p className="text-xs text-[#827B77] max-w-sm mx-auto leading-relaxed">
                Estamos organizando os novos temas e sequências guiadas para este foco.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              {linkedSubcategories.map((sub) => {
                const subImage = sub.imageUrl || currentCategoryData.bannerUrl;
                const isSubUpdating = isCategoryUpdating || sub.effectiveStatus === "updating";

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleOpenSubcategory(sub.slug || sub.id)}
                    className={`p-3 sm:p-3.5 rounded-2xl border text-left transition hover:shadow-2xs active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 group ${
                      isSubUpdating
                        ? "border-amber-200/80 bg-[#FAF8F5] hover:border-amber-300"
                        : "border-[#EADBCE] bg-white hover:border-[#B77D82]/60"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {subImage ? (
                        <div
                          className={`w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border border-[#EADBCE]/70 shrink-0 bg-[#FAF7F2] ${
                            isSubUpdating ? "filter grayscale contrast-90 opacity-75" : ""
                          }`}
                        >
                          <img
                            src={subImage}
                            alt={sub.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-[#F3EAE3] text-[#B77D82] flex items-center justify-center shrink-0">
                          <Sparkles className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-serif font-bold text-sm sm:text-base text-[#292321] group-hover:text-[#B77D82] transition-colors line-clamp-1">
                            {sub.name}
                          </h3>
                          {isSubUpdating && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                              Em atualização
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-[#827B77] line-clamp-1">
                          {isSubUpdating
                            ? "Em atualização — nossas aulas estarão disponíveis em breve."
                            : sub.description || "Aulas e sequências guiadas"}
                        </p>
                      </div>
                    </div>

                    <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[#827B77] flex items-center justify-center shrink-0 group-hover:bg-[#B77D82] group-hover:text-white transition-colors shadow-2xs">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  /* =========================================================================
     ETAPA 1: TELA DE EXPLORAR CATEGORIAS
     ========================================================================= */
  return (
    <div className="space-y-6 sm:space-y-7 animate-fade-in py-1">
      {/* Título & Instrução Editorial */}
      <section className="space-y-1.5 pt-1 sm:pt-2">
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#292321] leading-tight">
          Explore seus movimentos.
        </h1>
        <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed max-w-lg font-sans">
          Escolha uma categoria e encontre práticas para o seu momento.
        </p>
      </section>

      {/* Cartões verticais de categoria largos com foto integrada */}
      <section aria-label="Categorias de Pilates" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {visibleCategories.map((category) => {
            const status = getCategoryStatus(category);
            const isUpdating = status === "updating";

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleOpenCategory(category.slug)}
                className={`group relative w-full rounded-[28px] overflow-hidden border text-left shadow-2xs transition-all duration-300 active:scale-[0.99] cursor-pointer min-h-[150px] sm:min-h-[170px] aspect-[16/7.5] sm:aspect-[21/9] flex items-center ${
                  isUpdating
                    ? "border-amber-200/90 bg-[#FAF8F5] hover:border-amber-300 hover:shadow-sm"
                    : "border-[#EADBCE] bg-[#F5EFE8] hover:border-[#B77D82]/60 hover:shadow-sm"
                }`}
              >
                {/* Imagem fotográfica horizontal integrada (tons de cinza/esmaecido se estiver em atualização) */}
                {category.bannerUrl ? (
                  <img
                    src={category.bannerUrl}
                    alt={category.name}
                    className={`absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.03] ${
                      isUpdating ? "filter grayscale contrast-90 opacity-75" : ""
                    }`}
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#F3EAE3] flex items-center justify-end pr-10 text-[#B77D82]/40">
                    <Compass className="w-20 h-20 opacity-30" />
                  </div>
                )}

                {/* Gradiente sutil em marfim/areia para garantir leitura nítida e estética acolhedora */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FAF7F2]/95 via-[#FAF7F2]/85 via-50% to-transparent pointer-events-none" />

                {/* Conteúdo sobreposto: Título, Badge, Descrição e Botão circular */}
                <div className="relative z-10 w-full h-full p-5 sm:p-6 flex items-center justify-between gap-4">
                  {/* Textos: Nome da categoria, Aviso e descrição */}
                  <div className="min-w-0 max-w-[70%] sm:max-w-[65%] space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-serif text-xl sm:text-2xl text-[#292321] group-hover:text-[#B77D82] transition-colors leading-tight drop-shadow-2xs">
                        {category.name}
                      </h3>
                      {isUpdating && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock3 className="w-3 h-3" />
                          Em atualização
                        </span>
                      )}
                    </div>

                    {isUpdating ? (
                      <p className="text-xs sm:text-sm text-amber-900 font-medium line-clamp-2 leading-relaxed font-sans">
                        Em atualização — nossas aulas estarão disponíveis em breve.
                      </p>
                    ) : (
                      category.description && (
                        <p className="text-xs sm:text-sm text-[#6A635E] line-clamp-2 leading-relaxed font-sans">
                          {category.description}
                        </p>
                      )
                    )}
                  </div>

                  {/* Botão de seta em círculo claro à direita */}
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 text-[#292321] border border-[#EADBCE]/80 shadow-md flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-white group-hover:text-[#B77D82] transition-all">
                    <ChevronRight className="w-5 h-5 stroke-[2.2]" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function StudentProgramsLibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-[#827B77]">
          Carregando categorias e práticas...
        </div>
      }
    >
      <ProgramsContent />
    </Suspense>
  );
}
