"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store/context";
import {
  Clock,
  Play,
  Layers,
  Sparkles,
  PlusCircle,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Target,
  ChevronLeft,
} from "lucide-react";

function ProgramsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("categoria");
  const subcategoryParam = searchParams.get("subcategoria");

  const { categories, subcategories, lessons } = useApp();

  // Etapa 1: Categoria principal selecionada (objetivo). Se null, exibe lista de cards de objetivos.
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryParam || null
  );

  // Etapa 2: Subcategoria selecionada (treino/região). Se null, exibe lista de cards de treinos/regiões do objetivo.
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    subcategoryParam || null
  );

  // Sincroniza parâmetros de URL
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
      if (subcategoryParam) {
        setSelectedSubcategory(subcategoryParam);
      } else {
        setSelectedSubcategory(null);
      }
    } else {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
    }
  }, [categoryParam, subcategoryParam]);

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

  // Subcategorias vinculadas EXCLUSIVAMENTE ao objetivo selecionado
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

  // Handlers de navegação entre as 3 etapas
  const handleOpenCategory = (catSlug: string) => {
    setSelectedCategory(catSlug);
    setSelectedSubcategory(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenSubcategory = (subIdOrSlug: string) => {
    setSelectedSubcategory(subIdOrSlug);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToSubcategories = () => {
    setSelectedSubcategory(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* =========================================================================
     ETAPA 3: VER AULAS DAQUELA SUBCATEGORIA ESPECÍFICA
     ========================================================================= */
  if (currentCategoryData && currentSubcategoryData) {
    return (
      <div className="space-y-6 animate-fade-in py-1">
        {/* Navegação de Retorno */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleBackToSubcategories}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#827B77] hover:text-[#292321] transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-[#B77D82]" />
            <span>Voltar aos treinos de {currentCategoryData.name}</span>
          </button>

          <span className="text-[11px] font-bold uppercase tracking-wider text-[#B77D82] bg-white border border-[#EADBCE] px-3 py-1 rounded-full shadow-2xs">
            {subcategoryLessons.length} {subcategoryLessons.length === 1 ? "aula" : "aulas"}
          </span>
        </div>

        {/* Cabeçalho da Subcategoria Aberta */}
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-[#827B77]">
            <button
              onClick={handleBackToCategories}
              className="hover:underline hover:text-[#B77D82]"
            >
              Objetivos
            </button>
            <span>/</span>
            <button
              onClick={handleBackToSubcategories}
              className="hover:underline hover:text-[#B77D82]"
            >
              {currentCategoryData.name}
            </button>
            <span>/</span>
            <span className="font-semibold text-[#292321]">{currentSubcategoryData.name}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321] tracking-tight">
            {currentSubcategoryData.name}
          </h1>

          {currentSubcategoryData.description ? (
            <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed max-w-lg">
              {currentSubcategoryData.description}
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed max-w-lg">
              Práticas guiadas focadas especialmente nesta região e objetivo.
            </p>
          )}
        </header>

        {/* Lista de Aulas da Subcategoria */}
        <section aria-label={`Aulas de ${currentSubcategoryData.name}`} className="space-y-3.5 pt-1">
          {subcategoryLessons.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#EADBCE] p-8 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-[#F3EAE3] text-[#B77D82] mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#292321]">
                Nenhuma aula cadastrada neste treino
              </h3>
              <p className="text-xs text-[#827B77] max-w-sm mx-auto leading-relaxed">
                Novas aulas e práticas guiadas para o foco "{currentSubcategoryData.name}" serão publicadas em breve.
              </p>
              <div className="pt-1">
                <button
                  onClick={handleBackToSubcategories}
                  className="px-5 py-2.5 rounded-full bg-[#B77D82] text-white text-xs font-semibold shadow-xs hover:bg-[#A3676C] transition cursor-pointer"
                >
                  Escolher outro treino de {currentCategoryData.name}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {subcategoryLessons.map((lesson) => (
                <article
                  key={lesson.id}
                  className="bg-white rounded-3xl border border-[#EADBCE] overflow-hidden hover:border-[#B77D82]/50 hover:shadow-xs transition group flex flex-col sm:flex-row"
                >
                  <div className="relative sm:w-44 h-40 sm:h-auto shrink-0 bg-[#F3EAE3]">
                    <img
                      src={lesson.thumbnailUrl}
                      alt={lesson.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                    <Link
                      href={`/aluna/aula/${lesson.id}`}
                      className="absolute inset-0 flex items-center justify-center text-white"
                      aria-label={`Assistir aula ${lesson.title}`}
                    >
                      <div className="w-11 h-11 rounded-full bg-[#B77D82] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                    </Link>
                    <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                      {lesson.durationMinutes} min
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#B77D82]">
                          {currentSubcategoryData.name}
                        </span>
                        <span className="text-[#827B77]">•</span>
                        <span className="text-[10px] font-medium text-[#827B77] capitalize">
                          {lesson.format}
                        </span>
                      </div>
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
     ETAPA 2: VER TREINOS E REGIÕES DO CORPO DO OBJETIVO SELECIONADO
     ========================================================================= */
  if (currentCategoryData) {
    return (
      <div className="space-y-6 animate-fade-in py-1">
        {/* Navegação de Retorno para Todos os Objetivos */}
        <div className="pt-1">
          <button
            onClick={handleBackToCategories}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#827B77] hover:text-[#292321] transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-[#B77D82]" />
            <span>Voltar para todos os objetivos</span>
          </button>
        </div>

        {/* Card de Capa do Objetivo Escolhido */}
        <div className="relative rounded-3xl overflow-hidden border border-[#EADBCE] shadow-xs bg-[#F3EAE3]">
          {currentCategoryData.bannerUrl && (
            <img
              src={currentCategoryData.bannerUrl}
              alt={currentCategoryData.name}
              className="w-full h-40 sm:h-48 object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-5 text-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#EBD6D5]">
              Objetivo Selecionado
            </span>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl mt-0.5 tracking-tight">
              {currentCategoryData.name}
            </h1>
            {currentCategoryData.description && (
              <p className="text-xs text-white/90 line-clamp-2 max-w-lg mt-1 leading-relaxed">
                {currentCategoryData.description}
              </p>
            )}
          </div>
        </div>

        {/* Lista de Subcategorias (Treinos e Regiões do Corpo) */}
        <section aria-labelledby="subcategories-title" className="space-y-3.5 pt-1">
          <div>
            <h2 id="subcategories-title" className="text-xs font-bold uppercase tracking-wider text-[#827B77] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#B77D82]" />
              Escolha o Treino ou Região do Corpo
            </h2>
            <p className="text-xs text-[#827B77] mt-0.5">
              Toque em uma opção para ver as aulas correspondentes:
            </p>
          </div>

          {linkedSubcategories.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-[#EADBCE] p-6 text-center space-y-2.5 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-[#FAF7F2] text-[#827B77] mx-auto flex items-center justify-center">
                <Layers className="w-5 h-5 text-[#B77D82]" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#292321]">
                Nenhum treino específico cadastrado neste objetivo
              </h3>
              <p className="text-xs text-[#827B77] max-w-sm mx-auto leading-relaxed">
                Este objetivo ainda não possui divisões cadastradas.
              </p>
              <div className="pt-1">
                <Link
                  href="/admin/subcategorias"
                  className="inline-flex items-center gap-1.5 text-xs text-[#B77D82] font-semibold hover:underline"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Gerenciar no Painel Admin →
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {linkedSubcategories.map((sub) => {
                const subLessonsCount = lessons.filter(
                  (l) =>
                    l.categoryId === currentCategoryData.id &&
                    l.subcategoryId === sub.id &&
                    l.status === "publicado"
                ).length;

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleOpenSubcategory(sub.slug || sub.id)}
                    className="p-4 rounded-3xl border border-[#EADBCE] bg-white text-left transition hover:border-[#B77D82]/60 hover:shadow-2xs active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {sub.imageUrl ? (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#EADBCE] shrink-0 bg-[#FAF7F2]">
                          <img
                            src={sub.imageUrl}
                            alt={sub.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-[#F3EAE3] text-[#B77D82] flex items-center justify-center shrink-0 group-hover:bg-[#B77D82] group-hover:text-white transition">
                          <Sparkles className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0 space-y-0.5">
                        <h3 className="font-serif font-bold text-sm sm:text-base text-[#292321] group-hover:text-[#B77D82] transition-colors line-clamp-1">
                          {sub.name}
                        </h3>
                        {sub.description && (
                          <p className="text-[11px] text-[#827B77] line-clamp-1">
                            {sub.description}
                          </p>
                        )}
                        <span className="inline-block text-[10px] font-semibold text-[#827B77] bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#EADBCE]">
                          {subLessonsCount} {subLessonsCount === 1 ? "aula disponível" : "aulas disponíveis"}
                        </span>
                      </div>
                    </div>

                    <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[#827B77] flex items-center justify-center shrink-0 group-hover:bg-[#B77D82] group-hover:text-white transition-colors">
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
     ETAPA 1: SELECIONAR OBJETIVO (CATEGORIAS PRINCIPAIS EM CARDS VISUAIS)
     ========================================================================= */
  return (
    <div className="space-y-6 sm:space-y-7 animate-fade-in py-1">
      {/* Título & Subtítulo da Área Explorar */}
      <section className="space-y-1.5 pt-1">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321] tracking-tight">
          Explorar por Objetivo
        </h1>
        <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed max-w-lg">
          Selecione qual o objetivo que você deseja focar na sua prática. Em seguida, você poderá escolher o treino e a região do corpo.
        </p>
      </section>

      {/* Grid de Cards Visuais dos Objetivos Reais Cadastrados */}
      <section aria-labelledby="objectives-grid-title" className="space-y-3">
        <h2 id="objectives-grid-title" className="text-xs font-bold uppercase tracking-wider text-[#827B77] flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-[#B77D82]" />
          Objetivos Disponíveis ({publishedCategories.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {publishedCategories.map((category) => {
            const categoryLessons = lessons.filter(
              (l) => l.categoryId === category.id && l.status === "publicado"
            );
            const categorySubcategories = subcategories.filter(
              (s) => s.categoryId === category.id && s.published
            );

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleOpenCategory(category.slug)}
                className="group relative bg-white rounded-3xl border border-[#EADBCE] overflow-hidden text-left shadow-2xs hover:border-[#B77D82]/60 hover:shadow-md transition active:scale-[0.99] cursor-pointer flex flex-col justify-between"
              >
                {/* Capa com Imagem de Pilates Acolhedora */}
                <div className="relative aspect-[16/9] w-full bg-[#F3EAE3] overflow-hidden">
                  {category.bannerUrl ? (
                    <img
                      src={category.bannerUrl}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#B77D82]">
                      <Target className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                  <span className="absolute bottom-3 left-3 rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-[#292321] shadow-xs">
                    {categorySubcategories.length}{" "}
                    {categorySubcategories.length === 1 ? "foco / treino" : "focos / treinos"}
                  </span>

                  <span className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                    {categoryLessons.length} {categoryLessons.length === 1 ? "aula" : "aulas"}
                  </span>
                </div>

                {/* Conteúdo do Card do Objetivo */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-serif font-bold text-lg sm:text-xl text-[#292321] group-hover:text-[#B77D82] transition-colors leading-snug">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-xs text-[#827B77] line-clamp-2 leading-relaxed">
                        {category.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#FAF7F2] text-xs font-semibold text-[#B77D82]">
                    <span>Ver treinos e regiões</span>
                    <div className="w-8 h-8 rounded-full bg-[#FAF7F2] group-hover:bg-[#B77D82] group-hover:text-white flex items-center justify-center transition-colors">
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
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
          Carregando objetivos e treinos...
        </div>
      }
    >
      <ProgramsContent />
    </Suspense>
  );
}
