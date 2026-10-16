"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/store/context";
import {
  Clock,
  Play,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Compass,
  Layers,
  Sparkles,
} from "lucide-react";

function ProgramsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("categoria");
  const subcategoryParam = searchParams.get("subcategoria");

  const { categories, subcategories, lessons } = useApp();

  const selectedCategory = categoryParam || null;
  const selectedSubcategory = subcategoryParam || null;

  const publishedCategories = useMemo(
    () => categories.filter((c) => c.published).sort((a, b) => a.order - b.order),
    [categories]
  );

  const currentCategoryData = useMemo(() => {
    if (!selectedCategory) return null;
    return categories.find(
      (c) => c.slug === selectedCategory || c.id === selectedCategory
    );
  }, [categories, selectedCategory]);

  // Subcategorias vinculadas EXCLUSIVAMENTE à categoria selecionada
  const linkedSubcategories = useMemo(() => {
    if (!currentCategoryData) return [];
    return subcategories
      .filter((s) => s.categoryId === currentCategoryData.id && s.published)
      .sort((a, b) => a.order - b.order);
  }, [subcategories, currentCategoryData]);

  // Dados da subcategoria selecionada
  const currentSubcategoryData = useMemo(() => {
    if (!selectedSubcategory) return null;
    return linkedSubcategories.find(
      (s) => s.id === selectedSubcategory || s.slug === selectedSubcategory
    );
  }, [linkedSubcategories, selectedSubcategory]);

  // Aulas vinculadas estritamente à subcategoria aberta
  const subcategoryLessons = useMemo(() => {
    if (!currentCategoryData || !currentSubcategoryData) return [];
    return lessons.filter(
      (l) =>
        l.status === "publicado" &&
        l.categoryId === currentCategoryData.id &&
        l.subcategoryId === currentSubcategoryData.id
    );
  }, [lessons, currentCategoryData, currentSubcategoryData]);

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
     ETAPA 3: LISTAGEM DE AULAS DA SUBCATEGORIA ESPECÍFICA
     ========================================================================= */
  if (currentCategoryData && currentSubcategoryData) {
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

          <span className="text-[11px] font-bold uppercase tracking-wider text-[#B77D82] bg-white border border-[#EADBCE] px-3 py-1 rounded-full shadow-2xs">
            {subcategoryLessons.length} {subcategoryLessons.length === 1 ? "aula" : "aulas"}
          </span>
        </div>

        {/* Cabeçalho da Subcategoria Aberta */}
        <header className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B77D82] block">
            {currentCategoryData.name}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#292321] tracking-tight">
            {currentSubcategoryData.name}
          </h1>
          {currentSubcategoryData.description && (
            <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed max-w-xl">
              {currentSubcategoryData.description}
            </p>
          )}
        </header>

        {/* Grade de Aulas */}
        <section aria-label="Aulas disponíveis">
          {subcategoryLessons.length === 0 ? (
            <div className="bg-white rounded-[26px] border border-[#EADBCE] p-8 sm:p-10 text-center space-y-2.5 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#B77D82] mx-auto flex items-center justify-center">
                <Play className="w-5 h-5 opacity-60 ml-0.5" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#292321]">
                Nenhuma aula cadastrada neste tema ainda
              </h3>
              <p className="text-xs text-[#827B77] max-w-sm mx-auto leading-relaxed">
                As novas aulas cadastradas nesta subcategoria aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subcategoryLessons.map((lesson) => (
                <article
                  key={lesson.id}
                  className="rounded-[24px] bg-white border border-[#EADBCE] overflow-hidden shadow-2xs hover:border-[#B77D82]/60 hover:shadow-xs transition group flex flex-col justify-between"
                >
                  <div className="relative aspect-[16/9] w-full bg-[#F3EAE3] overflow-hidden">
                    {lesson.thumbnailUrl ? (
                      <img
                        src={lesson.thumbnailUrl}
                        alt={lesson.title}
                        className="w-full h-full object-cover group-hover:scale-103 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#B77D82]">
                        <Play className="w-8 h-8 opacity-40 ml-0.5" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20" />
                    <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-mono font-medium text-white backdrop-blur-md">
                      {lesson.durationMinutes} min
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h3 className="font-serif font-bold text-base text-[#292321] line-clamp-1 group-hover:text-[#B77D82] transition-colors">
                        {lesson.title}
                      </h3>
                      {lesson.description && (
                        <p className="text-xs text-[#827B77] line-clamp-2 leading-relaxed">
                          {lesson.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-[#FAF7F2]">
                      <div className="flex items-center gap-2.5 text-xs text-[#827B77]">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#B77D82]" />
                          {lesson.durationMinutes} min
                        </span>
                        <span className="capitalize text-[11px] bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#EADBCE]">
                          {lesson.level}
                        </span>
                      </div>

                      <Link
                        href={`/aluna/aula/${lesson.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B77D82] hover:underline"
                      >
                        <span>Praticar Aula</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
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
     ETAPA 2: TELA DE DETALHE DA CATEGORIA (Screen 3 da referência)
     ========================================================================= */
  if (currentCategoryData) {
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

        {/* Título da Categoria em destaque editorial */}
        <header className="space-y-1">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#292321]">
            {currentCategoryData.name}
          </h1>
        </header>

        {/* Banner com foto real da categoria */}
        <div className="relative rounded-[26px] overflow-hidden border border-[#EADBCE] shadow-xs bg-[#F3EAE3] aspect-[16/8] sm:aspect-[21/9]">
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
          <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed max-w-2xl">
            {currentCategoryData.description}
          </p>
        )}

        {/* Seção "Escolha um tema" com lista de subcategorias */}
        <section aria-labelledby="choose-theme-heading" className="space-y-3.5 pt-1">
          <h2 id="choose-theme-heading" className="font-serif text-xl sm:text-2xl font-bold text-[#292321]">
            Escolha um tema
          </h2>

          {linkedSubcategories.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-[#EADBCE] p-8 text-center space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-[#FAF7F2] text-[#B77D82] mx-auto flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#292321]">
                Nenhum tema específico cadastrado nesta categoria
              </h3>
              <p className="text-xs text-[#827B77] max-w-sm mx-auto leading-relaxed">
                Esta categoria ainda não possui divisões ativas no momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              {linkedSubcategories.map((sub) => {
                const subImage = sub.imageUrl || currentCategoryData.bannerUrl;

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleOpenSubcategory(sub.slug || sub.id)}
                    className="p-3 sm:p-3.5 rounded-2xl border border-[#EADBCE] bg-white text-left transition hover:border-[#B77D82]/60 hover:shadow-2xs active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {subImage ? (
                        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border border-[#EADBCE]/70 shrink-0 bg-[#FAF7F2]">
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
                        <h3 className="font-serif font-bold text-sm sm:text-base text-[#292321] group-hover:text-[#B77D82] transition-colors line-clamp-1">
                          {sub.name}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-[#827B77] line-clamp-1">
                          {sub.description || "Aulas e sequências guiadas"}
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
     ETAPA 1: TELA DE EXPLORAR CATEGORIAS (Screen 2 da referência)
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

      {/* Cartões verticais de categoria largos com foto integrada (conforme referência) */}
      <section aria-label="Categorias de Pilates" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {publishedCategories.map((category) => {
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleOpenCategory(category.slug)}
                className="group relative w-full rounded-[28px] overflow-hidden border border-[#EADBCE] bg-[#F5EFE8] text-left shadow-2xs hover:border-[#B77D82]/60 hover:shadow-sm transition-all duration-300 active:scale-[0.99] cursor-pointer min-h-[150px] sm:min-h-[170px] aspect-[16/7.5] sm:aspect-[21/9] flex items-center"
              >
                {/* Imagem fotográfica horizontal integrada ocupando a composição inteira do card */}
                {category.bannerUrl ? (
                  <img
                    src={category.bannerUrl}
                    alt={category.name}
                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#F3EAE3] flex items-center justify-end pr-10 text-[#B77D82]/40">
                    <Compass className="w-20 h-20 opacity-30" />
                  </div>
                )}

                {/* Gradiente sutil em marfim/areia para garantir leitura nítida e estética acolhedora */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FAF7F2]/95 via-[#FAF7F2]/80 via-45% to-transparent pointer-events-none" />

                {/* Conteúdo sobreposto: Título, Descrição e Botão circular */}
                <div className="relative z-10 w-full h-full p-5 sm:p-6 flex items-center justify-between gap-4">
                  {/* Textos: Nome da categoria e descrição */}
                  <div className="min-w-0 max-w-[65%] sm:max-w-[60%] space-y-1">
                    <h3 className="font-serif text-xl sm:text-2xl text-[#292321] group-hover:text-[#B77D82] transition-colors leading-tight drop-shadow-2xs">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-xs sm:text-sm text-[#6A635E] line-clamp-2 leading-relaxed font-sans">
                        {category.description}
                      </p>
                    )}
                  </div>

                  {/* Botão de seta em círculo claro à direita, exatamente como na referência */}
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
