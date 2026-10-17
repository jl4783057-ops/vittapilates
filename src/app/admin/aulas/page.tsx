"use client";

import React, { useState, useCallback } from "react";
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

export default function AdminLessonsPage() {
  const { lessons, setLessons, categories, subcategories, exercises } = useApp();

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("todas");
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);

  // Carregar todas as aulas do Supabase (inclusive rascunhos) com permissão administrativa
  const fetchAdminLessons = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/lessons");
      if (!res.ok) return;
      const data = await res.json();
      if (data.lessons && Array.isArray(data.lessons)) {
        setLessons(data.lessons);
      }
    } catch (err) {
      console.warn("Aviso ao carregar aulas no painel administrativo:", err);
    } finally {
      setIsLoading(false);
    }
  }, [setLessons]);

  React.useEffect(() => {
    fetchAdminLessons();
  }, [fetchAdminLessons]);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    categoryId: string;
    subcategoryId: string;
    exerciseId?: string;
    durationMinutes: number;
    level: LessonLevel;
    format: LessonFormat;
    equipment: LessonEquipment;
    materials: string;
    thumbnailUrl: string;
    videoUrl: string;
    videoProvider: "external" | "r2";
    videoStorageKey: string;
    order: number;
    status: LessonStatus;
    tagsString: string;
    showCategory: boolean;
    showDescription: boolean;
    showCompletion: boolean;
  }>({
    title: "",
    description: "",
    categoryId: categories[0]?.id || "cat-1",
    subcategoryId: subcategories[0]?.id || "sub-1-1",
    exerciseId: undefined,
    durationMinutes: 15,
    level: "iniciante",
    format: "aula rápida",
    equipment: "sem equipamento",
    materials: "Tapete de Pilates (Mat)",
    thumbnailUrl: "",
    videoUrl: "",
    videoProvider: "external",
    videoStorageKey: "",
    order: 1,
    status: "publicado",
    tagsString: "postura, rotina da manhã",
    showCategory: true,
    showDescription: true,
    showCompletion: true,
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
    setModalError(null);
    setVideoUploadProgress(null);
    setVideoUploadError(null);
    setFormData({
      title: "",
      description: "",
      categoryId: firstCat,
      subcategoryId: firstSub,
      exerciseId: undefined,
      durationMinutes: 15,
      level: "iniciante",
      format: "aula rápida",
      equipment: "sem equipamento",
      materials: "Tapete de Pilates (Mat)",
      thumbnailUrl: "",
      videoUrl: "",
      videoProvider: "external",
      videoStorageKey: "",
      order: lessons.length + 1,
      status: "publicado",
      tagsString: "",
      showCategory: true,
      showDescription: true,
      showCompletion: true,
    });
    setIsCreating(true);
  };

  const handleOpenEdit = (lesson: Lesson) => {
    setModalError(null);
    setVideoUploadProgress(null);
    setVideoUploadError(null);
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      description: lesson.description || "",
      categoryId: lesson.categoryId,
      subcategoryId: lesson.subcategoryId,
      exerciseId: lesson.exerciseId || undefined,
      durationMinutes: lesson.durationMinutes ?? 15,
      level: lesson.level || "iniciante",
      format: lesson.format || "aula rápida",
      equipment: lesson.equipment || "sem equipamento",
      materials: lesson.materials || "Tapete de Pilates (Mat)",
      thumbnailUrl: lesson.thumbnailUrl || "",
      videoUrl: lesson.videoUrl || "",
      videoProvider: lesson.videoProvider || (lesson.videoStorageKey ? "r2" : "external"),
      videoStorageKey: lesson.videoStorageKey || "",
      order: lesson.order ?? 1,
      status: lesson.status,
      tagsString: lesson.tags?.join(", ") || "",
      showCategory: lesson.showCategory !== false,
      showDescription: lesson.showDescription !== false,
      showCompletion: lesson.showCompletion !== false,
    });
  };

  const uploadVideoToR2 = async (file: File) => {
    setVideoUploadError(null);
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!("mp4 webm mov".split(" ").includes(extension))) {
      setVideoUploadError("Escolha um arquivo MP4, WebM ou MOV.");
      return;
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024 * 1024) {
      setVideoUploadError("O vídeo deve ter até 5 GB.");
      return;
    }

    let upload: { key: string; uploadId: string; partSize: number; partCount: number } | null = null;
    try {
      setVideoUploadProgress(0);
      const initiate = await fetch("/api/admin/video-uploads", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initiate", extension, size: file.size }),
      });
      const initResult = await initiate.json();
      if (!initiate.ok) throw new Error(initResult.error || "Não foi possível iniciar o envio.");
      upload = initResult;
      const activeUpload = upload;
      if (!activeUpload) throw new Error("Não foi possível iniciar o envio.");

      const parts: { ETag: string; PartNumber: number }[] = [];
      let nextPart = 1;
      let finishedParts = 0;
      const worker = async () => {
        while (true) {
          const partNumber = nextPart++;
          if (partNumber > activeUpload.partCount) return;
          const signResponse = await fetch("/api/admin/video-uploads", {
            method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "sign-part", key: activeUpload.key, uploadId: activeUpload.uploadId, partNumber, partCount: activeUpload.partCount }),
          });
          const signed = await signResponse.json();
          if (!signResponse.ok || !signed.url) throw new Error(signed.error || "Não foi possível preparar uma parte do vídeo.");
          const start = (partNumber - 1) * activeUpload.partSize;
          const end = Math.min(start + activeUpload.partSize, file.size);

          let putResponse: Response;
          try {
            putResponse = await fetch(signed.url, { method: "PUT", body: file.slice(start, end) });
          } catch (fetchErr) {
            const cleanOrigin = (() => {
              try { return new URL(signed.url).origin; } catch { return "R2"; }
            })();
            console.error(`[Upload R2] Falha de conexão/CSP para ${cleanOrigin}:`, fetchErr);
            throw new Error(`Falha de rede ao conectar ao R2 (${cleanOrigin}). Verifique se a origem está liberada no CSP/CORS.`);
          }

          const etag = putResponse.headers.get("ETag") || putResponse.headers.get("etag");
          if (!putResponse.ok) {
            console.error(`[Upload R2] Erro HTTP ${putResponse.status} do R2 ao enviar parte ${partNumber}.`);
            throw new Error(`O Cloudflare R2 retornou status ${putResponse.status}. Confira as permissões do bucket.`);
          }
          if (!etag) {
            console.error("[Upload R2] Header ETag ausente na resposta do R2 (ExposeHeaders no CORS).");
            throw new Error("O R2 aceitou o envio da parte, mas o cabeçalho 'ETag' não foi exposto pelo navegador. Adicione 'ETag' em ExposeHeaders nas regras de CORS do bucket R2.");
          }

          parts.push({ ETag: etag, PartNumber: partNumber });
          finishedParts++;
          setVideoUploadProgress(Math.round((finishedParts / activeUpload.partCount) * 100));
        }
      };
      await Promise.all(Array.from({ length: Math.min(3, activeUpload.partCount) }, () => worker()));

      const complete = await fetch("/api/admin/video-uploads", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", key: activeUpload.key, uploadId: activeUpload.uploadId, parts }),
      });
      const completed = await complete.json();
      if (!complete.ok) throw new Error(completed.error || "Não foi possível finalizar o envio.");
      setFormData((current) => ({ ...current, videoProvider: "r2", videoStorageKey: completed.key, videoUrl: "" }));
      setVideoUploadProgress(100);
    } catch (error) {
      if (upload) {
        await fetch("/api/admin/video-uploads", {
          method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "abort", key: upload.key, uploadId: upload.uploadId }),
        }).catch(() => undefined);
      }
      setVideoUploadError(error instanceof Error ? error.message : "Falha ao enviar o vídeo.");
      setVideoUploadProgress(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.videoProvider === "r2" && !formData.videoStorageKey) {
      setModalError("Envie o vídeo ao R2 antes de salvar esta aula.");
      return;
    }
    setIsSaving(true);
    setModalError(null);

    const tags = formData.tagsString
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const lessonPayload: Lesson = {
      id: isCreating ? `les-${Date.now()}` : editingLesson!.id,
      title: formData.title.trim(),
      description: formData.description.trim(),
      categoryId: formData.categoryId,
      subcategoryId: formData.subcategoryId || (subcategories.find((s) => s.categoryId === formData.categoryId)?.id || "sub-1-1"),
      exerciseId: formData.exerciseId || undefined,
      durationMinutes: 15,
      level: "iniciante",
      format: "aula rápida",
      equipment: "sem equipamento",
      materials: "",
      thumbnailUrl: "",
      videoUrl: formData.videoUrl,
      videoProvider: formData.videoProvider,
      videoStorageKey: formData.videoStorageKey,
      order: Number(formData.order),
      status: formData.status,
      showCategory: formData.showCategory,
      showDescription: formData.showDescription,
      showCompletion: formData.showCompletion,
      tags,
      viewsCount: editingLesson ? (editingLesson.viewsCount ?? 0) : 0,
      completionsCount: editingLesson ? (editingLesson.completionsCount ?? 0) : 0,
    };

    try {
      const res = await fetch("/api/admin/lessons", {
        method: isCreating ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lessonPayload),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || "Erro ao salvar aula no banco de dados.");
      }

      const savedLesson: Lesson = result.lesson || lessonPayload;

      if (isCreating) {
        setLessons((prev) => [savedLesson, ...prev]);
      } else {
        setLessons((prev) => prev.map((l) => (l.id === savedLesson.id ? savedLesson : l)));
      }

      setIsCreating(false);
      setEditingLesson(null);
      setFeedbackMessage({ type: "success", text: `Aula "${savedLesson.title}" salva com sucesso no Supabase!` });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Erro ao salvar aula.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (lesson: Lesson) => {
    const nextStatus: LessonStatus = lesson.status === "publicado" ? "rascunho" : "publicado";
    try {
      const updated = { ...lesson, status: nextStatus };
      const res = await fetch("/api/admin/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status.");
      setLessons((prev) => prev.map((l) => (l.id === lesson.id ? updated : l)));
      setFeedbackMessage({ type: "success", text: `Status da aula alterado para "${nextStatus}".` });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch {
      setFeedbackMessage({ type: "error", text: "Não foi possível atualizar o status da aula." });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleDelete = async (lesson: Lesson) => {
    if (!confirm(`Excluir a aula "${lesson.title}" permanentemente do Supabase?`)) return;
    try {
      const res = await fetch(`/api/admin/lessons?id=${encodeURIComponent(lesson.id)}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Erro ao excluir aula.");
      setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
      setFeedbackMessage({ type: "success", text: `Aula "${lesson.title}" excluída com sucesso.` });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err: unknown) {
      setFeedbackMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao excluir aula." });
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2 transition ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMessage.text}</span>
        </div>
      )}

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
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
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
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-xs text-[#827B77] bg-white rounded-3xl border border-[#EADBCE] flex flex-col items-center justify-center gap-2">
            <Clock className="w-5 h-5 animate-spin text-[#B77D82]" />
            <span>Consultando catálogo de aulas no Supabase...</span>
          </div>
        ) : lessons.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-[#EADBCE] space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#EADBCE] flex items-center justify-center mx-auto text-[#B77D82]">
              <Video className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-serif font-bold text-base text-[#292321]">
                Nenhuma aula cadastrada ainda
              </h3>
              <p className="text-xs text-[#827B77] leading-relaxed">
                Todas as aulas reais que você cadastrar serão salvas de forma permanente no Supabase, vinculadas às categorias e subcategorias.
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Primeira Aula
            </button>
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-[#EADBCE] space-y-2 shadow-2xs">
            <p className="font-serif font-bold text-base text-[#292321]">
              Nenhuma aula encontrada para os filtros selecionados.
            </p>
            <p className="text-xs text-[#827B77]">Tente alterar a categoria ou o termo de busca.</p>
          </div>
        ) : (
          filteredLessons
            .sort((a, b) => a.order - b.order)
            .map((les) => {
              const cat = categories.find((c) => c.id === les.categoryId);
              const sub = subcategories.find((s) => s.id === les.subcategoryId);

              return (
                <div
                  key={les.id}
                  className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] overflow-hidden shadow-2xs flex flex-col justify-between hover:border-[#B77D82]/50 transition group"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-[#FAF7F2] border border-[#EADBCE] px-2.5 py-1 rounded-full text-[10px] font-bold text-[#292321]">
                        {cat?.name || "Pilates"} {sub ? `• ${sub.name}` : ""}
                      </span>
                      <span className="text-[11px] font-mono text-[#827B77] bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#EADBCE]">
                        Ordem #{les.order}
                      </span>
                    </div>

                    <div>
                      {les.exerciseId && (
                        <span className="text-[10px] text-[#B77D82] font-semibold uppercase tracking-wider block mb-0.5">
                          {exercises.find((ex) => ex.id === les.exerciseId)?.title || "Exercício"}
                        </span>
                      )}
                      <h3 className="font-serif font-bold text-base text-[#292321]">
                        {les.title}
                      </h3>
                      {les.description && (
                        <p className="text-xs text-[#827B77] line-clamp-2 leading-relaxed mt-1">
                          {les.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full border ${
                        les.videoStorageKey
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : les.videoUrl
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {les.videoStorageKey ? "Vídeo R2 Privado" : les.videoUrl ? "Vídeo Externo" : "Sem Vídeo"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border ${les.showCategory !== false ? "bg-[#FAF7F2] text-[#827B77] border-[#EADBCE]" : "bg-zinc-100 text-zinc-500 border-zinc-200 line-through"}`}>
                        Cat./Subcat.
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border ${les.showDescription !== false ? "bg-[#FAF7F2] text-[#827B77] border-[#EADBCE]" : "bg-zinc-100 text-zinc-500 border-zinc-200 line-through"}`}>
                        Descrição
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border ${les.showCompletion !== false ? "bg-[#FAF7F2] text-[#827B77] border-[#EADBCE]" : "bg-zinc-100 text-zinc-500 border-zinc-200 line-through"}`}>
                        Conclusão
                      </span>
                    </div>
                  </div>

                  <div className="p-4 pt-2 border-t border-[#FAF7F2] flex items-center justify-between">
                    <button
                      onClick={() => toggleStatus(les)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
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
                        className="p-1.5 rounded-lg text-[#827B77] hover:text-[#292321] hover:bg-[#FAF7F2] cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(les)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
        )}
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
              {modalError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

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
                    onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value, exerciseId: undefined })}
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

              {/* Vínculo de Exercício Opcional */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Exercício (Opcional)
                </label>
                <select
                  value={formData.exerciseId || ""}
                  onChange={(e) => setFormData({ ...formData, exerciseId: e.target.value || undefined })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                >
                  <option value="">Nenhum exercício vinculado (aula avulsa no tema)</option>
                  {exercises
                    .filter((ex) => ex.subcategoryId === formData.subcategoryId)
                    .map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} (Posição #{ex.order})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                    Status da Aula
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

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  />
                </div>
              </div>

              {/* Opções de Visibilidade na Área da Aluna */}
              <div className="space-y-2 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] p-4">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Visibilidade na Área da Aluna
                </label>
                <div className="space-y-2 text-xs text-[#292321]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showCategory}
                      onChange={(e) => setFormData({ ...formData, showCategory: e.target.checked })}
                      className="rounded border-[#EADBCE] text-[#B77D82] focus:ring-[#B77D82]"
                    />
                    <span>Exibir etiqueta de Categoria e Subcategoria</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showDescription}
                      onChange={(e) => setFormData({ ...formData, showDescription: e.target.checked })}
                      className="rounded border-[#EADBCE] text-[#B77D82] focus:ring-[#B77D82]"
                    />
                    <span>Exibir descrição da aula</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showCompletion}
                      onChange={(e) => setFormData({ ...formData, showCompletion: e.target.checked })}
                      className="rounded border-[#EADBCE] text-[#B77D82] focus:ring-[#B77D82]"
                    />
                    <span>Exibir controle e status de conclusão</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] p-4">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">Vídeo da aula</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setFormData({ ...formData, videoProvider: "r2", videoUrl: "" })} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${formData.videoProvider === "r2" ? "border-[#B77D82] bg-white text-[#9C6268]" : "border-[#EADBCE] text-[#827B77]"}`}>
                    Enviar vídeo privado ao R2
                  </button>
                  <button type="button" onClick={() => setFormData({ ...formData, videoProvider: "external", videoStorageKey: "" })} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${formData.videoProvider === "external" ? "border-[#B77D82] bg-white text-[#9C6268]" : "border-[#EADBCE] text-[#827B77]"}`}>
                    Usar link externo
                  </button>
                </div>
                {formData.videoProvider === "r2" ? (
                  <div className="space-y-2">
                    <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" disabled={videoUploadProgress !== null && videoUploadProgress < 100} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadVideoToR2(file); event.currentTarget.value = ""; }} className="block w-full text-xs text-[#827B77] file:mr-3 file:rounded-full file:border-0 file:bg-[#B77D82] file:px-4 file:py-2 file:font-semibold file:text-white" />
                    {formData.videoStorageKey ? <p className="text-[10px] text-emerald-800">Vídeo privado pronto: {formData.videoStorageKey.split("/").pop()}</p> : <p className="text-[10px] text-[#827B77]">MP4, WebM ou MOV, até 5 GB. O arquivo permanece privado e só toca para alunas com acesso ativo.</p>}
                    {videoUploadProgress !== null && <div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-white"><div className="h-full bg-[#B77D82] transition-all" style={{ width: `${videoUploadProgress}%` }} /></div><p className="text-[10px] text-[#827B77]">{videoUploadProgress === 100 ? "Envio concluído. Salve a aula para publicar a alteração." : `Enviando vídeo: ${videoUploadProgress}%`}</p></div>}
                    {videoUploadError && <p role="alert" className="text-xs text-red-700">{videoUploadError}</p>}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input type="url" value={formData.videoUrl} onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })} placeholder="https://..." className="w-full rounded-xl border border-[#EADBCE] bg-white px-3.5 py-2 text-xs text-[#292321]" required />
                    <p className="text-[10px] text-[#827B77]">Links externos existentes continuam funcionando normalmente.</p>
                  </div>
                )}
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
                disabled={isSaving || (videoUploadProgress !== null && videoUploadProgress < 100)}
                className="w-full py-3 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Salvando aula no Supabase...</span>
                  </>
                ) : (
                  <span>Salvar Aula</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
