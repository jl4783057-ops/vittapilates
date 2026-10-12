"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store/context";
import {
  Search,
  Filter,
  Clock,
  Play,
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  X,
  Layers,
} from "lucide-react";

function ProgramsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("categoria");

  const { categories, subcategories, lessons, currentUser } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    categoryParam || "todas"
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<string>("todos");
  const [selectedLevel, setSelectedLevel] = useState<string>("todos");
  const [selectedFormat, setSelectedFormat] = useState<string>("todos");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("todos");
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Subcategorias disponíveis para a categoria selecionada
  const availableSubcategories = useMemo(() => {
    if (selectedCategory === "todas") return [];
    const cat = categories.find((c) => c.slug === selectedCategory || c.id === selectedCategory);
    if (!cat) return [];
    return subcategories.filter((s) => s.categoryId === cat.id && s.published);
  }, [categories, subcategories, selectedCategory]);

  // Filtragem estrita e dinâmica
  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      // Regra de segurança: apenas publicadas
      if (lesson.status !== "publicado") return false;

      // Categoria
      if (selectedCategory !== "todas") {
        const cat = categories.find((c) => c.slug === selectedCategory || c.id === selectedCategory);
        if (cat && lesson.categoryId !== cat.id) return false;
      }

      // Subcategoria
      if (selectedSubcategory !== "todas" && lesson.subcategoryId !== selectedSubcategory) {
        return false;
      }

      // Duração (5, 10, 15, 20, 30 min ou mais)
      if (selectedDuration !== "todos") {
        const dur = lesson.durationMinutes;
        if (selectedDuration === "5" && dur > 5) return false;
        if (selectedDuration === "10" && (dur <= 5 || dur > 10)) return false;
        if (selectedDuration === "15" && (dur <= 10 || dur > 15)) return false;
        if (selectedDuration === "20" && (dur <= 15 || dur > 20)) return false;
        if (selectedDuration === "30+" && dur < 30) return false;
      }

      // Nível
      if (selectedLevel !== "todos" && lesson.level !== selectedLevel) {
        return false;
      }

      // Formato
      if (selectedFormat !== "todos" && lesson.format !== selectedFormat) {
        return false;
      }

      // Equipamento
      if (selectedEquipment !== "todos" && lesson.equipment !== selectedEquipment) {
        return false;
      }

      // Busca textual
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = lesson.title.toLowerCase().includes(query);
        const matchesDesc = lesson.description.toLowerCase().includes(query);
        const matchesTags = lesson.tags?.some((t) => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesTags) return false;
      }

      return true;
    });
  }, [
    lessons,
    categories,
    selectedCategory,
    selectedSubcategory,
    selectedDuration,
    selectedLevel,
    selectedFormat,
    selectedEquipment,
    searchQuery,
  ]);

  const activeFiltersCount = [
    selectedDuration !== "todos",
    selectedLevel !== "todos",
    selectedFormat !== "todos",
    selectedEquipment !== "todos",
  ].filter(Boolean).length;

  const currentCategoryData = categories.find(
    (c) => c.slug === selectedCategory || c.id === selectedCategory
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título & Busca */}
      <section className="space-y-3 pt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Biblioteca de Pilates
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Escolha seu objetivo ou filtre pelas suas preferências de tempo e intensidade.
          </p>
        </div>

        {/* Input de Busca */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#827B77]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por postura, pernas, respiração, 5 min..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#EADBCE] bg-[#FFFFFF] text-xs text-[#292321] placeholder:text-[#827B77]/60 focus:outline-none focus:ring-2 focus:ring-[#B77D82]/40 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#827B77] hover:text-[#292321]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFiltersModal(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border text-xs font-semibold transition ${
              activeFiltersCount > 0
                ? "bg-[#B77D82] text-white border-[#B77D82]"
                : "bg-[#FFFFFF] text-[#292321] border-[#EADBCE] hover:bg-[#FAF7F2]"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-[#B77D82] text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Tags de Acesso Rápido Populares */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <span className="text-[#827B77] font-medium shrink-0">Destaques:</span>
          {[
            { label: "Home Office", query: "home office" },
            { label: "Muito Tempo Sentado", query: "muito tempo sentado" },
            { label: "Rotina da Manhã", query: "rotina da manhã" },
            { label: "5 Minutos Express", query: "5 minutos" },
            { label: "Postura & Coluna", query: "postura" },
          ].map((tag) => (
            <button
              key={tag.label}
              onClick={() => setSearchQuery(tag.query)}
              className="shrink-0 px-2.5 py-1 rounded-full bg-[#FFFFFF] border border-[#EADBCE] text-[#827B77] hover:text-[#B77D82] hover:border-[#B77D82] transition"
            >
              {tag.label}
            </button>
          ))}
        </div>
      </section>

      {/* Carrossel de Categorias Principais */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
            Categorias Principais
          </h2>
          {selectedCategory !== "todas" && (
            <button
              onClick={() => {
                setSelectedCategory("todas");
                setSelectedSubcategory("todas");
              }}
              className="text-xs text-[#B77D82] font-semibold hover:underline"
            >
              Ver Todas
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => {
              setSelectedCategory("todas");
              setSelectedSubcategory("todas");
            }}
            className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-semibold transition ${
              selectedCategory === "todas"
                ? "bg-[#B77D82] text-white shadow-xs"
                : "bg-[#FFFFFF] text-[#827B77] border border-[#EADBCE] hover:text-[#292321]"
            }`}
          >
            Todas as Aulas
          </button>

          {categories
            .filter((c) => c.published)
            .map((cat) => {
              const isSelected = selectedCategory === cat.slug || selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.slug);
                    setSelectedSubcategory("todas");
                  }}
                  className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#B77D82] text-white shadow-xs"
                      : "bg-[#FFFFFF] text-[#827B77] border border-[#EADBCE] hover:text-[#292321]"
                  }`}
                >
                  <span>{cat.name}</span>
                </button>
              );
            })}
        </div>
      </section>

      {/* Banner da Categoria Selecionada */}
      {currentCategoryData && currentCategoryData.bannerUrl && (
        <div className="relative rounded-3xl overflow-hidden border border-[#EADBCE] shadow-xs">
          <img
            src={currentCategoryData.bannerUrl}
            alt={currentCategoryData.name}
            className="w-full h-36 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-4 text-white">
            <h2 className="font-serif font-bold text-lg">{currentCategoryData.name}</h2>
            <p className="text-xs text-white/80 line-clamp-2 max-w-md">
              {currentCategoryData.description}
            </p>
          </div>
        </div>
      )}

      {/* Pílulas de Subcategorias da Categoria Selecionada */}
      {availableSubcategories.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-[#827B77] uppercase tracking-wider block">
            Subcategorias de {currentCategoryData?.name}:
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedSubcategory("todas")}
              className={`shrink-0 px-3 py-1 rounded-xl text-xs font-medium transition ${
                selectedSubcategory === "todas"
                  ? "bg-[#292321] text-white"
                  : "bg-[#FFFFFF] text-[#827B77] border border-[#EADBCE]"
              }`}
            >
              Todas
            </button>
            {availableSubcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubcategory(sub.id)}
                className={`shrink-0 px-3 py-1 rounded-xl text-xs font-medium transition ${
                  selectedSubcategory === sub.id
                    ? "bg-[#292321] text-white"
                    : "bg-[#FFFFFF] text-[#827B77] border border-[#EADBCE] hover:text-[#292321]"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid de Aulas da Biblioteca */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[#827B77]">
          <span>
            Exibindo <strong>{filteredLessons.length}</strong> {filteredLessons.length === 1 ? "aula" : "aulas"}
          </span>
          {(activeFiltersCount > 0 || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDuration("todos");
                setSelectedLevel("todos");
                setSelectedFormat("todos");
                setSelectedEquipment("todos");
                setSearchQuery("");
                setSelectedSubcategory("todas");
              }}
              className="text-[#B77D82] font-semibold hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {filteredLessons.length === 0 ? (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#F3EAE3] text-[#B77D82] mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-[#292321]">
              Nenhuma aula encontrada com esses filtros
            </h3>
            <p className="text-xs text-[#827B77] max-w-sm mx-auto">
              Experimente remover alguns filtros ou buscar por outro termo como "iniciante", "postura" ou "express".
            </p>
            <button
              onClick={() => {
                setSelectedCategory("todas");
                setSelectedSubcategory("todas");
                setSelectedDuration("todos");
                setSelectedLevel("todos");
                setSelectedFormat("todos");
                setSelectedEquipment("todos");
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-full bg-[#B77D82] text-white text-xs font-semibold shadow-xs"
            >
              Ver Todas as Aulas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredLessons.map((lesson) => {
              const isCompleted = currentUser?.completedLessonIds?.includes(lesson.id);
              const cat = categories.find((c) => c.id === lesson.categoryId);

              return (
                <div
                  key={lesson.id}
                  className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] overflow-hidden hover:border-[#B77D82]/50 hover:shadow-xs transition group flex flex-col sm:flex-row"
                >
                  <div className="relative sm:w-44 h-40 sm:h-auto shrink-0 bg-[#F3EAE3]">
                    <img
                      src={lesson.thumbnailUrl}
                      alt={lesson.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/15" />
                    {isCompleted && (
                      <div className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        Concluída
                      </div>
                    )}
                    <Link
                      href={`/aluna/aula/${lesson.id}`}
                      className="absolute inset-0 flex items-center justify-center"
                      aria-label="Abrir aula"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#B77D82] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                    </Link>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#B77D82]">
                          {cat?.name || "Pilates"}
                        </span>
                        <span className="text-[#827B77]">•</span>
                        <span className="text-[10px] font-medium text-[#827B77] capitalize">
                          {lesson.format}
                        </span>
                      </div>
                      <h3 className="font-serif font-bold text-base text-[#292321] line-clamp-1 group-hover:text-[#B77D82] transition-colors">
                        {lesson.title}
                      </h3>
                      <p className="text-xs text-[#827B77] line-clamp-2 leading-relaxed">
                        {lesson.description}
                      </p>
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
                        <span className="capitalize text-[11px] hidden xs:inline text-[#827B77]">
                          {lesson.equipment}
                        </span>
                      </div>

                      <Link
                        href={`/aluna/aula/${lesson.id}`}
                        className="text-xs font-semibold text-[#B77D82] hover:underline"
                      >
                        Assistir Aula →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal / Gaveta de Filtros Avançados */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[#EADBCE] p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EADBCE]">
              <h3 className="font-serif font-bold text-lg text-[#292321]">
                Filtros da Biblioteca
              </h3>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="p-1 rounded-lg text-[#827B77] hover:bg-[#FAF7F2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Duração */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#827B77] block">
                Duração da Aula
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { label: "Todas", val: "todos" },
                  { label: "Até 5 min", val: "5" },
                  { label: "10 min", val: "10" },
                  { label: "15 min", val: "15" },
                  { label: "20 min", val: "20" },
                  { label: "30+ min", val: "30+" },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setSelectedDuration(item.val)}
                    className={`py-2 rounded-xl font-medium transition ${
                      selectedDuration === item.val
                        ? "bg-[#B77D82] text-white"
                        : "bg-[#FAF7F2] text-[#292321] border border-[#EADBCE]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nível */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#827B77] block">
                Nível de Prática
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[
                  { label: "Todos", val: "todos" },
                  { label: "Iniciante", val: "iniciante" },
                  { label: "Interm.", val: "intermediário" },
                  { label: "Avançado", val: "avançado" },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setSelectedLevel(item.val)}
                    className={`py-2 rounded-xl font-medium transition ${
                      selectedLevel === item.val
                        ? "bg-[#B77D82] text-white"
                        : "bg-[#FAF7F2] text-[#292321] border border-[#EADBCE]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Formato */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#827B77] block">
                Formato da Aula
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: "Todos os formatos", val: "todos" },
                  { label: "Aula Rápida", val: "aula rápida" },
                  { label: "Aula Completa", val: "aula completa" },
                  { label: "Programa por Dias", val: "programa por dias" },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setSelectedFormat(item.val)}
                    className={`py-2 px-3 rounded-xl font-medium transition text-left ${
                      selectedFormat === item.val
                        ? "bg-[#B77D82] text-white"
                        : "bg-[#FAF7F2] text-[#292321] border border-[#EADBCE]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Equipamento */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#827B77] block">
                Equipamento Necessário
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { label: "Todos", val: "todos" },
                  { label: "Sem Equipamento", val: "sem equipamento" },
                  { label: "Com Acessórios", val: "com acessórios" },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setSelectedEquipment(item.val)}
                    className={`py-2 rounded-xl font-medium transition ${
                      selectedEquipment === item.val
                        ? "bg-[#B77D82] text-white"
                        : "bg-[#FAF7F2] text-[#292321] border border-[#EADBCE]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {
                  setSelectedDuration("todos");
                  setSelectedLevel("todos");
                  setSelectedFormat("todos");
                  setSelectedEquipment("todos");
                }}
                className="flex-1 py-3 rounded-full border border-[#EADBCE] text-xs font-semibold text-[#827B77] hover:bg-[#FAF7F2]"
              >
                Limpar Todos
              </button>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="flex-1 py-3 rounded-full bg-[#B77D82] text-white text-xs font-semibold shadow-xs"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentProgramsLibraryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#827B77]">Carregando biblioteca...</div>}>
      <ProgramsContent />
    </Suspense>
  );
}
