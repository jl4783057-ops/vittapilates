"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/store/context";
import { Lesson, LessonLevel, LessonFormat, LessonEquipment, LessonStatus } from "@/types";
import {
  Video,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Play,
  Layers,
  Search,
  X,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import ImageUploadField from "@/components/ui/ImageUploadField";

export default function AdminLessonsPage() {
  const { lessons, setLessons, categories, subcategories, addLesson, updateLesson, deleteLesson } = useApp();

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("todas");
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Carregar todas as aulas do Supabase (inclusive rascunhos) com permissão administrativa
  React.useEffect(() => {
    let isCancelled = false;
    async function fetchAdminLessons() {
      try {
        const res = await fetch("/api/admin/lessons");
        if (!res.ok) return;
        const data = await res.json();
        if (!isCancelled && data.lessons && Array.isArray(data.lessons)) {
          setLessons(data.lessons);
        }
      } catch (err) {
        console.warn("Aviso ao carregar aulas no painel administrativo:", err);
      }
    }
    fetchAdminLessons();
    return () => {
      isCancelled = true;
    };
  }, [setLessons]);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    categoryId: string;
    subcategoryId: string;
    durationMinutes: number;
    level: LessonLevel;
    format: LessonFormat;
    equipment: LessonEquipment;
    materials: string;
    thumbnailUrl: string;
    videoUrl: string;
    order: number;
    status: LessonStatus;
    tagsString: string;
  }>({
    title: "",
    description: "",
    categoryId: categories[0]?.id || "cat-1",
    subcategoryId: subcategories[0]?.id || "sub-1-1",
    durationMinutes: 15,
    level: "iniciante",
    format: "aula rápida",
    equipment: "sem equipamento",
    materials: "Tapete de Pilates (Mat)",
    thumbnailUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    order: 1,
    status: "publicado",
    tagsString: "postura, rotina da manhã",
  });

  const filteredLessons = lessons.filter((l) => {
    if (filterCat !== "todas" && l.categoryId !== filterCat) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q);
    }
    return true;
  });

  const availableSubs = subcategories.filter((s) => s.categoryId === formData.categoryId);

  const handleOpenCreate = () => {
    const firstCat = categories[0]?.id || "cat-1";
    const firstSub = subcategories.find((s) => s.categoryId === firstCat)?.id || "";
    setFormData({
      title: "",
      description: "",
      categoryId: firstCat,
      subcategoryId: firstSub,
      durationMinutes: 15,
      level: "iniciante",
      format: "aula rápida",
      equipment: "sem equipamento",
      materials: "Tapete de Pilates (Mat)",
      thumbnailUrl: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      order: lessons.length + 1,
      status: "publicado",
      tagsString: "postura, bem-estar",
    });
    setIsCreating(true);
  };

  const handleOpenEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      description: lesson.description,
      categoryId: lesson.categoryId,
      subcategoryId: lesson.subcategoryId,
      durationMinutes: lesson.durationMinutes,
      level: lesson.level,
      format: lesson.format,
      equipment: lesson.equipment,
      materials: lesson.materials,
      thumbnailUrl: lesson.thumbnailUrl,
      videoUrl: lesson.videoUrl,
      order: lesson.order,
      status: lesson.status,
      tagsString: lesson.tags?.join(", ") || "",
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = formData.tagsString
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (isCreating) {
      const newLesson: Lesson = {
        id: `les-${Date.now()}`,
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        subcategoryId: formData.subcategoryId || subcategories[0]?.id || "sub-1-1",
        durationMinutes: Number(formData.durationMinutes),
        level: formData.level,
        format: formData.format,
        equipment: formData.equipment,
        materials: formData.materials,
        thumbnailUrl: formData.thumbnailUrl,
        videoUrl: formData.videoUrl,
        order: Number(formData.order),
        status: formData.status,
        tags,
        viewsCount: 0,
        completionsCount: 0,
      };
      addLesson(newLesson);
      setIsCreating(false);
    } else if (editingLesson) {
      updateLesson(editingLesson.id, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        subcategoryId: formData.subcategoryId,
        durationMinutes: Number(formData.durationMinutes),
        level: formData.level,
        format: formData.format,
        equipment: formData.equipment,
        materials: formData.materials,
        thumbnailUrl: formData.thumbnailUrl,
        videoUrl: formData.videoUrl,
        order: Number(formData.order),
        status: formData.status,
        tags,
      });
      setEditingLesson(null);
    }
  };

  const toggleStatus = (lesson: Lesson) => {
    const nextStatus: LessonStatus = lesson.status === "publicado" ? "rascunho" : "publicado";
    updateLesson(lesson.id, { status: nextStatus });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EADBCE]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Gestão de Aulas e Vídeos
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Cadastre, organize entre subcategorias, configure durações, níveis e status.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Nova Aula
        </button>
      </div>

      {/* Busca e Filtro de Categoria */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#827B77]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou descrição da aula..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#EADBCE] bg-[#FFFFFF] text-xs text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterCat("todas")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition ${
              filterCat === "todas"
                ? "bg-[#B77D82] text-white"
                : "bg-[#FFFFFF] text-[#827B77] border border-[#EADBCE]"
            }`}
          >
            Todas ({lessons.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition ${
                filterCat === c.id
                  ? "bg-[#B77D82] text-white"
                  : "bg-[#FFFFFF] text-[#827B77] border border-[#EADBCE] hover:text-[#292321]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Aulas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLessons
          .sort((a, b) => a.order - b.order)
          .map((les) => {
            const cat = categories.find((c) => c.id === les.categoryId);
            const sub = subcategories.find((s) => s.id === les.subcategoryId);

            return (
              <div
                key={les.id}
                className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] overflow-hidden shadow-2xs flex flex-col justify-between hover:border-[#B77D82]/50 transition group"
              >
                <div>
                  <div className="relative h-40 w-full bg-[#F3EAE3] overflow-hidden">
                    <img
                      src={les.thumbnailUrl}
                      alt={les.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute top-2.5 left-2.5 bg-white/95 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#292321] shadow-xs">
                      {cat?.name || "Pilates"}
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 bg-black/70 text-white px-2 py-0.5 rounded-full text-[11px] font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#EBD6D5]" />
                      {les.durationMinutes} min
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <span className="text-[10px] text-[#827B77] font-semibold uppercase tracking-wider block">
                      Subcategoria: {sub?.name || "Geral"}
                    </span>
                    <h3 className="font-serif font-bold text-sm text-[#292321] line-clamp-1">
                      {les.title}
                    </h3>
                    <p className="text-xs text-[#827B77] line-clamp-2 leading-relaxed">
                      {les.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                      <span className="capitalize px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#EADBCE] text-[#827B77]">
                        {les.level}
                      </span>
                      <span className="capitalize px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#EADBCE] text-[#827B77]">
                        {les.format}
                      </span>
                      <span className="capitalize px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#EADBCE] text-[#827B77]">
                        {les.equipment}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-2 border-t border-[#FAF7F2] flex items-center justify-between">
                  <button
                    onClick={() => toggleStatus(les)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                      les.status === "publicado"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {les.status === "publicado" ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Publicado
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        Rascunho
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(les)}
                      className="p-1.5 rounded-lg text-[#827B77] hover:text-[#292321] hover:bg-[#FAF7F2]"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir a aula "${les.title}"?`)) {
                          deleteLesson(les.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Modal de Criação / Edição de Aula */}
      {(isCreating || editingLesson) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-6 max-w-lg w-full space-y-4 shadow-xl animate-fade-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EADBCE]">
              <h3 className="font-serif font-bold text-lg text-[#292321]">
                {isCreating ? "Cadastrar Nova Aula" : "Editar Aula"}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingLesson(null);
                }}
                className="text-[#827B77] hover:text-[#292321]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Título da Aula
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Despertar Postural e Conexão do Core"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                    Categoria
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      const newSubs = subcategories.filter((s) => s.categoryId === newCat);
                      setFormData({
                        ...formData,
                        categoryId: newCat,
                        subcategoryId: newSubs[0]?.id || "",
                      });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                    Subcategoria
                  </label>
                  <select
                    value={formData.subcategoryId}
                    onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  >
                    {availableSubs.length === 0 ? (
                      <option value="">Sem subcategorias cadastradas</option>
                    ) : (
                      availableSubs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                    Duração (min)
                  </label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                    Nível
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as LessonLevel })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  >
                    <option value="iniciante">Iniciante</option>
                    <option value="intermediário">Intermediário</option>
                    <option value="avançado">Avançado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                    Formato
                  </label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value as LessonFormat })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  >
                    <option value="aula rápida">Aula Rápida</option>
                    <option value="aula completa">Aula Completa</option>
                    <option value="sequência guiada">Sequência Guiada</option>
                    <option value="programa por dias">Programa por Dias</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                    Equipamento
                  </label>
                  <select
                    value={formData.equipment}
                    onChange={(e) => setFormData({ ...formData, equipment: e.target.value as LessonEquipment })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  >
                    <option value="sem equipamento">Sem Equipamento</option>
                    <option value="com acessórios">Com Acessórios</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LessonStatus })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  >
                    <option value="publicado">Publicado</option>
                    <option value="rascunho">Rascunho</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Materiais Necessários
                </label>
                <input
                  type="text"
                  value={formData.materials}
                  onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                  placeholder="Ex: Tapete de Pilates (Mat), faixa elástica opcional"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                />
              </div>

              <ImageUploadField
                label="Imagem de Capa (Thumbnail)"
                value={formData.thumbnailUrl}
                onChange={(url) => setFormData({ ...formData, thumbnailUrl: url })}
                aspectRatio="video"
                helperText="Clique em 'Enviar imagem' para selecionar a capa da aula do seu Mac ou Windows (JPG, PNG ou WebP até 5 MB)."
              />

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  URL do Vídeo (Streaming Seguro / Cloudflare Stream)
                </label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  required
                />
                <p className="text-[10px] text-[#827B77]">
                  Vídeos hospedados em serviço dedicado (Cloudflare Stream, Vimeo, CDN). Nunca guardados no banco PostgreSQL.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.tagsString}
                  onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })}
                  placeholder="postura, home office, coluna"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C]"
              >
                Salvar Aula
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
