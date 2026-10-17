"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store/context";
import { Exercise, Lesson, LessonLevel, LessonFormat, LessonEquipment, LessonStatus } from "@/types";
import {
  Plus,
  Edit2,
  Trash2,
  Layers,
  Video,
  ArrowUp,
  ArrowDown,
  Play,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  Upload,
  CheckCircle2,
  HelpCircle,
  Film,
} from "lucide-react";
import ImageUploadField from "@/components/ui/ImageUploadField";

function AdminExercisesContent() {
  const searchParams = useSearchParams();
  const initialCatParam = searchParams.get("categoria");
  const initialSubParam = searchParams.get("subcategoria");

  const {
    categories,
    subcategories,
    exercises,
    setExercises,
    lessons,
    setLessons,
    addExercise,
    updateExercise,
    deleteExercise,
    addLesson,
    updateLesson,
    deleteLesson,
  } = useApp();

  // Seleção de Categoria e Subcategoria ativa
  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [selectedSubId, setSelectedSubId] = useState<string>("");

  // Modais de Exercício
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseTitle, setExerciseTitle] = useState("");
  const [exerciseDesc, setExerciseDesc] = useState("");
  const [exerciseOrder, setExerciseOrder] = useState(1);

  // Modais de Aula do Exercício
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [targetExerciseForLesson, setTargetExerciseForLesson] = useState<Exercise | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const [lessonFormData, setLessonFormData] = useState<{
    title: string;
    description: string;
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
  }>({
    title: "",
    description: "",
    durationMinutes: 15,
    level: "iniciante",
    format: "aula rápida",
    equipment: "sem equipamento",
    materials: "Tapete de Pilates (Mat)",
    thumbnailUrl: "",
    videoUrl: "",
    videoProvider: "r2",
    videoStorageKey: "",
    order: 1,
    status: "publicado",
  });

  // Estados de upload de vídeo para R2
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [migrationWarning, setMigrationWarning] = useState<string | null>(null);

  // Inicializar categoria e subcategoria selecionadas
  useEffect(() => {
    if (categories.length > 0 && !selectedCatId) {
      if (initialCatParam) {
        const found = categories.find((c) => c.slug === initialCatParam || c.id === initialCatParam);
        if (found) {
          setSelectedCatId(found.id);
          return;
        }
      }
      // Padrão: Emagrecimento e Fortalecimento ou primeira
      const defaultCat =
        categories.find((c) => c.slug.includes("emagrecimento") || c.name.toLowerCase().includes("emagrecimento")) ||
        categories[0];
      setSelectedCatId(defaultCat.id);
    }
  }, [categories, initialCatParam, selectedCatId]);

  // Subcategorias disponíveis para a categoria selecionada
  const availableSubcategories = useMemo(() => {
    return subcategories.filter((s) => s.categoryId === selectedCatId);
  }, [subcategories, selectedCatId]);

  useEffect(() => {
    if (availableSubcategories.length > 0) {
      if (initialSubParam) {
        const found = availableSubcategories.find((s) => s.slug === initialSubParam || s.id === initialSubParam);
        if (found) {
          setSelectedSubId(found.id);
          return;
        }
      }
      if (!availableSubcategories.some((s) => s.id === selectedSubId)) {
        // Padrão: "Emagrecimento" ou primeira
        const defaultSub =
          availableSubcategories.find((s) => s.name.toLowerCase() === "emagrecimento") ||
          availableSubcategories[0];
        setSelectedSubId(defaultSub.id);
      }
    } else {
      setSelectedSubId("");
    }
  }, [availableSubcategories, initialSubParam, selectedSubId]);

  // Carregar dados de exercícios do Supabase
  const loadExercisesFromApi = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/exercises");
      if (!res.ok) return;
      const data = await res.json();
      if (data.needsMigration) {
        setMigrationWarning("Aplique a migração 006_exercises_hierarchy.sql no Supabase SQL Editor para habilitar a tabela de exercícios.");
      } else {
        setMigrationWarning(null);
      }
      if (Array.isArray(data.exercises)) {
        setExercises(data.exercises);
      }
    } catch (err) {
      console.warn("Aviso ao carregar exercícios:", err);
    }
  }, [setExercises]);

  // Carregar todas as aulas do admin
  const loadLessonsFromApi = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/lessons");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.lessons)) {
        setLessons(data.lessons);
      }
    } catch (err) {
      console.warn("Aviso ao carregar aulas:", err);
    }
  }, [setLessons]);

  useEffect(() => {
    loadExercisesFromApi();
    loadLessonsFromApi();
  }, [loadExercisesFromApi, loadLessonsFromApi]);

  // Exercícios filtrados da subcategoria ativa
  const currentSubcategoryExercises = useMemo(() => {
    return exercises
      .filter((e) => e.subcategoryId === selectedSubId)
      .sort((a, b) => a.order - b.order);
  }, [exercises, selectedSubId]);

  // Obter aulas de um exercício específico
  const getLessonsForExercise = useCallback(
    (exerciseId: string) => {
      return lessons
        .filter((l) => l.exerciseId === exerciseId)
        .sort((a, b) => a.order - b.order);
    },
    [lessons]
  );

  // Abertura do modal para criar exercício
  const handleOpenCreateExercise = () => {
    if (!selectedSubId) {
      setToastMessage({ type: "error", text: "Selecione uma subcategoria primeiro." });
      return;
    }
    setEditingExercise(null);
    const nextOrder = currentSubcategoryExercises.length + 1;
    setExerciseTitle(`Exercício ${nextOrder}`);
    setExerciseDesc("");
    setExerciseOrder(nextOrder);
    setIsExerciseModalOpen(true);
  };

  // Abertura do modal para editar exercício
  const handleOpenEditExercise = (ex: Exercise) => {
    setEditingExercise(ex);
    setExerciseTitle(ex.title);
    setExerciseDesc(ex.description || "");
    setExerciseOrder(ex.order);
    setIsExerciseModalOpen(true);
  };

  // Salvar Exercício (Criar ou Atualizar)
  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseTitle.trim()) {
      setToastMessage({ type: "error", text: "Informe o título do exercício." });
      return;
    }

    setIsSaving(true);
    try {
      if (editingExercise) {
        const updated: Exercise = {
          ...editingExercise,
          title: exerciseTitle.trim(),
          description: exerciseDesc.trim() || undefined,
          order: Number(exerciseOrder),
        };

        const res = await fetch("/api/admin/exercises", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Erro ao salvar alterações no exercício.");
        }

        updateExercise(editingExercise.id, updated);
        setToastMessage({ type: "success", text: `Exercício "${updated.title}" atualizado com sucesso!` });
      } else {
        const newEx: Exercise = {
          id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          categoryId: selectedCatId,
          subcategoryId: selectedSubId,
          title: exerciseTitle.trim(),
          description: exerciseDesc.trim() || undefined,
          order: Number(exerciseOrder),
        };

        const res = await fetch("/api/admin/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEx),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Erro ao criar novo exercício.");
        }

        addExercise(newEx);
        setToastMessage({ type: "success", text: `Exercício "${newEx.title}" criado com sucesso!` });
      }

      setIsExerciseModalOpen(false);
      await loadExercisesFromApi();
    } catch (err) {
      console.error("Falha ao salvar exercício:", err);
      setToastMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao salvar exercício." });
    } finally {
      setIsSaving(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Excluir exercício
  const handleDeleteExercise = async (ex: Exercise) => {
    const exerciseLessons = getLessonsForExercise(ex.id);
    const confirmMsg =
      exerciseLessons.length > 0
        ? `Excluir o "${ex.title}"? As ${exerciseLessons.length} aulas vinculadas a ele ficarão desvinculadas deste exercício (não serão apagadas).`
        : `Tem certeza que deseja excluir o "${ex.title}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/exercises?id=${encodeURIComponent(ex.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao excluir exercício.");
      }

      deleteExercise(ex.id);
      setToastMessage({ type: "success", text: `"${ex.title}" excluído com sucesso.` });
      await loadExercisesFromApi();
      await loadLessonsFromApi();
    } catch (err) {
      console.error("Erro ao deletar:", err);
      setToastMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao excluir exercício." });
    }
  };

  // Reordenar exercício
  const handleMoveExercise = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentSubcategoryExercises.length) return;

    const list = [...currentSubcategoryExercises];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));

    try {
      await fetch("/api/admin/exercises", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reordered),
      });
      setExercises((prev) =>
        prev.map((ex) => {
          const match = reordered.find((r) => r.id === ex.id);
          return match ? { ...ex, order: match.order } : ex;
        })
      );
    } catch (err) {
      console.error("Erro ao reordenar exercícios:", err);
    }
  };

  // ==========================================
  // GERENCIAMENTO DE AULAS DO EXERCÍCIO
  // ==========================================

  // Abrir modal de criação de aula vinculada ao exercício
  const handleOpenCreateLessonForExercise = (exercise: Exercise) => {
    setTargetExerciseForLesson(exercise);
    setEditingLesson(null);
    setVideoUploadProgress(null);
    setVideoUploadError(null);

    const existingLessons = getLessonsForExercise(exercise.id);
    const lessonNumber = existingLessons.length + 1;

    setLessonFormData({
      title: `${exercise.title} - Aula ${lessonNumber}`,
      description: exercise.description || `Aula prática guiada do ${exercise.title}.`,
      durationMinutes: 15,
      level: "iniciante",
      format: "aula rápida",
      equipment: "sem equipamento",
      materials: "Tapete de Pilates (Mat)",
      thumbnailUrl: "",
      videoUrl: "",
      videoProvider: "r2",
      videoStorageKey: "",
      order: lessonNumber,
      status: "publicado",
    });

    setIsLessonModalOpen(true);
  };

  // Abrir modal de edição de aula
  const handleOpenEditLesson = (exercise: Exercise, lesson: Lesson) => {
    setTargetExerciseForLesson(exercise);
    setEditingLesson(lesson);
    setVideoUploadProgress(null);
    setVideoUploadError(null);

    setLessonFormData({
      title: lesson.title,
      description: lesson.description,
      durationMinutes: lesson.durationMinutes,
      level: lesson.level,
      format: lesson.format,
      equipment: lesson.equipment,
      materials: lesson.materials || "Tapete de Pilates (Mat)",
      thumbnailUrl: lesson.thumbnailUrl || "",
      videoUrl: lesson.videoUrl || "",
      videoProvider: lesson.videoProvider || (lesson.videoStorageKey ? "r2" : "external"),
      videoStorageKey: lesson.videoStorageKey || "",
      order: lesson.order,
      status: lesson.status,
    });

    setIsLessonModalOpen(true);
  };

  // Envio de vídeo para Cloudflare R2
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["mp4", "webm", "mov"].includes(extension)) {
      setVideoUploadError("Escolha um arquivo MP4, WebM ou MOV.");
      return;
    }

    if (file.size <= 0 || file.size > 5 * 1024 * 1024 * 1024) {
      setVideoUploadError("O vídeo deve ter até 5 GB.");
      return;
    }

    setVideoUploadError(null);
    setVideoUploadProgress(0);

    let uploadData: { key: string; uploadId: string; partSize: number; partCount: number } | null = null;
    try {
      const initiateRes = await fetch("/api/admin/video-uploads", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initiate", extension, size: file.size }),
      });

      const initResult = await initiateRes.json();
      if (!initiateRes.ok) throw new Error(initResult.error || "Não foi possível iniciar o envio para o R2.");
      uploadData = initResult;

      const activeUpload = uploadData;
      if (!activeUpload) throw new Error("Falha ao iniciar envio.");

      const parts: { ETag: string; PartNumber: number }[] = [];
      let nextPart = 1;
      let finishedParts = 0;

      const worker = async () => {
        while (true) {
          const partNumber = nextPart++;
          if (partNumber > activeUpload.partCount) return;

          const signResponse = await fetch("/api/admin/video-uploads", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "sign-part",
              key: activeUpload.key,
              uploadId: activeUpload.uploadId,
              partNumber,
              partCount: activeUpload.partCount,
            }),
          });

          const signed = await signResponse.json();
          if (!signResponse.ok || !signed.url) {
            throw new Error(signed.error || "Não foi possível assinar a parte do vídeo no R2.");
          }

          const start = (partNumber - 1) * activeUpload.partSize;
          const end = Math.min(start + activeUpload.partSize, file.size);
          const putResponse = await fetch(signed.url, { method: "PUT", body: file.slice(start, end) });

          const etag = putResponse.headers.get("ETag");
          if (!putResponse.ok || !etag) {
            throw new Error("O R2 recusou uma parte do vídeo. Confira a configuração do bucket.");
          }

          parts.push({ ETag: etag, PartNumber: partNumber });
          finishedParts++;
          setVideoUploadProgress(Math.round((finishedParts / activeUpload.partCount) * 100));
        }
      };

      await Promise.all(Array.from({ length: Math.min(3, activeUpload.partCount) }, () => worker()));

      const completeRes = await fetch("/api/admin/video-uploads", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          key: activeUpload.key,
          uploadId: activeUpload.uploadId,
          parts,
        }),
      });

      const completed = await completeRes.json();
      if (!completeRes.ok) throw new Error(completed.error || "Não foi possível finalizar o envio ao R2.");

      setLessonFormData((curr) => ({
        ...curr,
        videoProvider: "r2",
        videoStorageKey: completed.key,
        videoUrl: "",
      }));
      setVideoUploadProgress(100);
    } catch (err) {
      if (uploadData) {
        await fetch("/api/admin/video-uploads", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "abort", key: uploadData.key, uploadId: uploadData.uploadId }),
        }).catch(() => {});
      }
      setVideoUploadError(err instanceof Error ? err.message : "Falha ao enviar o vídeo para o Cloudflare R2.");
      setVideoUploadProgress(null);
    }
  };

  // Salvar aula no exercício
  const handleSaveLessonForExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetExerciseForLesson) return;

    if (!lessonFormData.title.trim()) {
      setToastMessage({ type: "error", text: "Informe o título da aula." });
      return;
    }

    if (lessonFormData.videoProvider === "r2" && !lessonFormData.videoStorageKey) {
      setToastMessage({ type: "error", text: "Envie o arquivo de vídeo ao R2 ou informe uma URL externa." });
      return;
    }

    if (lessonFormData.videoProvider === "external" && !lessonFormData.videoUrl.trim()) {
      setToastMessage({ type: "error", text: "Informe a URL do vídeo da aula." });
      return;
    }

    setIsSaving(true);
    try {
      if (editingLesson) {
        const updatedLesson: Lesson = {
          ...editingLesson,
          title: lessonFormData.title.trim(),
          description: lessonFormData.description.trim(),
          categoryId: selectedCatId,
          subcategoryId: selectedSubId,
          exerciseId: targetExerciseForLesson.id,
          durationMinutes: Number(lessonFormData.durationMinutes),
          level: lessonFormData.level,
          format: lessonFormData.format,
          equipment: lessonFormData.equipment,
          materials: lessonFormData.materials.trim() || "Tapete de Pilates (Mat)",
          thumbnailUrl: lessonFormData.thumbnailUrl.trim(),
          videoUrl: lessonFormData.videoProvider === "r2" ? "" : lessonFormData.videoUrl.trim(),
          videoProvider: lessonFormData.videoProvider,
          videoStorageKey: lessonFormData.videoProvider === "r2" ? lessonFormData.videoStorageKey : undefined,
          order: Number(lessonFormData.order),
          status: lessonFormData.status,
        };

        const res = await fetch("/api/admin/lessons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedLesson),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Erro ao atualizar aula no Supabase.");
        }

        updateLesson(editingLesson.id, updatedLesson);
        setToastMessage({ type: "success", text: `Aula "${updatedLesson.title}" atualizada com sucesso!` });
      } else {
        const newLesson: Lesson = {
          id: `les-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: lessonFormData.title.trim(),
          description: lessonFormData.description.trim(),
          categoryId: selectedCatId,
          subcategoryId: selectedSubId,
          exerciseId: targetExerciseForLesson.id,
          durationMinutes: Number(lessonFormData.durationMinutes),
          level: lessonFormData.level,
          format: lessonFormData.format,
          equipment: lessonFormData.equipment,
          materials: lessonFormData.materials.trim() || "Tapete de Pilates (Mat)",
          thumbnailUrl: lessonFormData.thumbnailUrl.trim(),
          videoUrl: lessonFormData.videoProvider === "r2" ? "" : lessonFormData.videoUrl.trim(),
          videoProvider: lessonFormData.videoProvider,
          videoStorageKey: lessonFormData.videoProvider === "r2" ? lessonFormData.videoStorageKey : undefined,
          order: Number(lessonFormData.order),
          status: lessonFormData.status,
          tags: ["exercício", targetExerciseForLesson.title.toLowerCase()],
        };

        const res = await fetch("/api/admin/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newLesson),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Erro ao salvar aula no Supabase.");
        }

        addLesson(newLesson);
        setToastMessage({ type: "success", text: `Aula "${newLesson.title}" vinculada ao ${targetExerciseForLesson.title} com sucesso!` });
      }

      setIsLessonModalOpen(false);
      await loadLessonsFromApi();
    } catch (err) {
      console.error("Falha ao salvar aula do exercício:", err);
      setToastMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao salvar aula." });
    } finally {
      setIsSaving(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Excluir aula do exercício
  const handleDeleteLesson = async (lesson: Lesson) => {
    if (!window.confirm(`Tem certeza que deseja excluir a aula "${lesson.title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/lessons?id=${encodeURIComponent(lesson.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao excluir aula.");
      }

      deleteLesson(lesson.id);
      setToastMessage({ type: "success", text: `Aula "${lesson.title}" excluída com sucesso.` });
      await loadLessonsFromApi();
    } catch (err) {
      console.error("Erro ao excluir aula:", err);
      setToastMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao excluir aula." });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Toast de Notificação */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-lg border text-xs sm:text-sm font-medium flex items-center gap-3 transition-all animate-slide-down ${
            toastMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Alerta de migração pendente, se aplicável */}
      {migrationWarning && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold font-serif text-sm">Migração de Exercícios Pendente no Banco</h3>
            <p className="leading-relaxed">
              Para persistir os exercícios no Supabase, execute o script da migração{" "}
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">
                006_exercises_hierarchy.sql
              </code>{" "}
              no SQL Editor do painel Supabase.
            </p>
          </div>
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B77D82]">
            <Layers className="w-4 h-4" />
            <span>Estrutura de Conteúdo</span>
          </div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#292321] tracking-tight mt-0.5">
            Exercícios e Aulas
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-0.5">
            Organize a hierarquia: <strong>Categoria → Subcategoria → Exercícios → Aulas</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateExercise}
          disabled={!selectedSubId}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#B77D82] text-white text-xs sm:text-sm font-semibold hover:bg-[#A3676C] transition shadow-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Adicionar exercício</span>
        </button>
      </div>

      {/* Seletor de Categoria e Subcategoria */}
      <section className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EADBCE] shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-[#292321] mb-1.5 uppercase tracking-wider">
            1. Categoria
          </label>
          <select
            value={selectedCatId}
            onChange={(e) => setSelectedCatId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs sm:text-sm text-[#292321] font-medium focus:outline-hidden focus:border-[#B77D82] transition"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.status === "hidden" ? "Oculta" : cat.status === "updating" ? "Em atualização" : "Disponível"})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#292321] mb-1.5 uppercase tracking-wider">
            2. Subcategoria (Tema)
          </label>
          <select
            value={selectedSubId}
            onChange={(e) => setSelectedSubId(e.target.value)}
            disabled={availableSubcategories.length === 0}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs sm:text-sm text-[#292321] font-medium focus:outline-hidden focus:border-[#B77D82] transition disabled:opacity-50"
          >
            {availableSubcategories.length === 0 ? (
              <option value="">Nenhuma subcategoria nesta categoria</option>
            ) : (
              availableSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))
            )}
          </select>
        </div>
      </section>

      {/* Lista de Exercícios da Subcategoria */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-bold text-lg text-[#292321] flex items-center gap-2">
            <span>Exercícios Cadastrados</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FAF7F2] border border-[#EADBCE] text-[#827B77] font-mono">
              {currentSubcategoryExercises.length}
            </span>
          </h2>
          <span className="text-xs text-[#827B77]">
            Sem limite fixo de exercícios por subcategoria
          </span>
        </div>

        {currentSubcategoryExercises.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-3xl bg-white border border-[#EADBCE] text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#B77D82] mx-auto flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-[#292321]">
              Nenhum exercício cadastrado nesta subcategoria
            </h3>
            <p className="text-xs text-[#827B77] max-w-md mx-auto leading-relaxed">
              Clique no botão <strong>“+ Adicionar exercício”</strong> acima para criar exercícios sequenciais (ex: Exercício 1, Exercício 2, ...) e vincular aulas a cada um.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenCreateExercise}
                disabled={!selectedSubId}
                className="px-5 py-2.5 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                + Adicionar primeiro exercício
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {currentSubcategoryExercises.map((exercise, index) => {
              const exerciseLessons = getLessonsForExercise(exercise.id);

              return (
                <div
                  key={exercise.id}
                  className="rounded-2xl sm:rounded-3xl bg-white border border-[#EADBCE] shadow-2xs overflow-hidden transition-all hover:border-[#B77D82]/50"
                >
                  {/* Barra Superior do Exercício */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-[#FAF7F2] via-white to-white border-b border-[#EADBCE]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Ícone de play do exercício */}
                      <div className="w-10 h-10 rounded-full bg-[#FAF7F2] text-[#B77D82] border border-[#EADBCE] flex items-center justify-center shrink-0 shadow-2xs">
                        <Play className="w-4 h-4 fill-[#B77D82] ml-0.5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B77D82] bg-[#F7EEEE] px-2 py-0.5 rounded-md">
                            Posição #{exercise.order}
                          </span>
                          <h3 className="font-serif font-bold text-base sm:text-lg text-[#292321]">
                            {exercise.title}
                          </h3>
                        </div>
                        {exercise.description && (
                          <p className="text-xs text-[#827B77] mt-0.5 line-clamp-1">
                            {exercise.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ações do Exercício (Reordenar, Editar, Excluir) */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleMoveExercise(index, "up")}
                        disabled={index === 0}
                        title="Subir na ordem"
                        className="p-1.5 rounded-lg border border-[#EADBCE] text-[#827B77] hover:bg-white hover:text-[#292321] transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveExercise(index, "down")}
                        disabled={index === currentSubcategoryExercises.length - 1}
                        title="Descer na ordem"
                        className="p-1.5 rounded-lg border border-[#EADBCE] text-[#827B77] hover:bg-white hover:text-[#292321] transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditExercise(exercise)}
                        title="Editar exercício"
                        className="p-1.5 rounded-lg border border-[#EADBCE] text-[#827B77] hover:bg-white hover:text-[#B77D82] transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExercise(exercise)}
                        title="Excluir exercício"
                        className="p-1.5 rounded-lg border border-[#EADBCE] text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Corpo: Aulas do Exercício */}
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
                        Aulas de {exercise.title} ({exerciseLessons.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleOpenCreateLessonForExercise(exercise)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B77D82] hover:text-[#A3676C] bg-[#FAF7F2] hover:bg-[#F7EEEE] px-3 py-1.5 rounded-full border border-[#EADBCE] transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar aula a este exercício</span>
                      </button>
                    </div>

                    {exerciseLessons.length === 0 ? (
                      <div className="py-6 px-4 rounded-xl border border-dashed border-[#EADBCE] bg-[#FAF7F2]/50 text-center space-y-1.5">
                        <p className="text-xs text-[#827B77]">
                          Nenhuma aula cadastrada ainda para o <strong>{exercise.title}</strong>.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateLessonForExercise(exercise)}
                          className="text-xs font-semibold text-[#B77D82] hover:underline"
                        >
                          + Adicionar primeira aula com vídeo do R2
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {exerciseLessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            className="p-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] flex flex-col justify-between space-y-2 group"
                          >
                            <div className="flex items-start gap-2.5">
                              {lesson.thumbnailUrl ? (
                                <img
                                  src={lesson.thumbnailUrl}
                                  alt={lesson.title}
                                  className="w-12 h-12 rounded-lg object-cover border border-[#EADBCE] shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-white text-[#B77D82] border border-[#EADBCE] flex items-center justify-center shrink-0">
                                  <Video className="w-5 h-5 opacity-70" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h5 className="font-serif font-bold text-xs sm:text-sm text-[#292321] line-clamp-1">
                                  {lesson.title}
                                </h5>
                                <div className="flex items-center gap-2 text-[10px] text-[#827B77] mt-0.5">
                                  <span>{lesson.durationMinutes} min</span>
                                  <span>•</span>
                                  <span className="capitalize">{lesson.level}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span
                                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                                      lesson.videoProvider === "r2"
                                        ? "bg-sky-50 text-sky-800 border border-sky-200"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {lesson.videoProvider === "r2" ? "Cloudflare R2" : "Externo"}
                                  </span>
                                  {lesson.status === "rascunho" && (
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                      Rascunho
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-[#EADBCE]/50">
                              <button
                                type="button"
                                onClick={() => handleOpenEditLesson(exercise, lesson)}
                                title="Editar aula"
                                className="p-1 rounded-md text-[#827B77] hover:text-[#B77D82] hover:bg-white transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLesson(lesson)}
                                title="Excluir aula"
                                className="p-1 rounded-md text-rose-600 hover:bg-rose-50 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================
          MODAL: ADICIONAR / EDITAR EXERCÍCIO
          ======================================================== */}
      {isExerciseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EADBCE] shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#EADBCE] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#292321]">
                {editingExercise ? "Editar Exercício" : "Novo Exercício"}
              </h3>
              <button
                type="button"
                onClick={() => setIsExerciseModalOpen(false)}
                className="text-[#827B77] hover:text-[#292321] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExercise} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#292321] mb-1">
                  Título do Exercício *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Exercício 1, Exercício 2..."
                  value={exerciseTitle}
                  onChange={(e) => setExerciseTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADBCE] text-xs sm:text-sm text-[#292321] focus:outline-hidden focus:border-[#B77D82]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292321] mb-1">
                  Descrição ou Foco (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Aquecimento e mobilidade pélvica..."
                  value={exerciseDesc}
                  onChange={(e) => setExerciseDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] text-xs sm:text-sm text-[#292321] focus:outline-hidden focus:border-[#B77D82]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292321] mb-1">
                  Ordem de Exibição
                </label>
                <input
                  type="number"
                  min={1}
                  value={exerciseOrder}
                  onChange={(e) => setExerciseOrder(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] text-xs sm:text-sm text-[#292321] focus:outline-hidden focus:border-[#B77D82]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExerciseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#827B77] hover:bg-[#FAF7F2] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Salvando..." : editingExercise ? "Salvar Alterações" : "Criar Exercício"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADICIONAR / EDITAR AULA DE UM EXERCÍCIO
          ======================================================== */}
      {isLessonModalOpen && targetExerciseForLesson && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#EADBCE] shadow-xl max-w-xl w-full p-6 space-y-4 my-8 animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#EADBCE] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B77D82]">
                  {targetExerciseForLesson.title}
                </span>
                <h3 className="font-serif font-bold text-lg text-[#292321]">
                  {editingLesson ? "Editar Aula" : "Adicionar Aula ao Exercício"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLessonModalOpen(false)}
                className="text-[#827B77] hover:text-[#292321] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLessonForExercise} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#292321] mb-1">
                  Título da Aula *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aula prática completa..."
                  value={lessonFormData.title}
                  onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADBCE] text-xs sm:text-sm text-[#292321] focus:outline-hidden focus:border-[#B77D82]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292321] mb-1">
                  Descrição da Prática
                </label>
                <textarea
                  rows={2}
                  placeholder="Orientações e benefícios desta aula..."
                  value={lessonFormData.description}
                  onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] text-xs sm:text-sm text-[#292321] focus:outline-hidden focus:border-[#B77D82]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#292321] mb-1">
                    Duração (minutos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={lessonFormData.durationMinutes}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] text-xs sm:text-sm text-[#292321]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#292321] mb-1">
                    Nível de Dificuldade
                  </label>
                  <select
                    value={lessonFormData.level}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, level: e.target.value as LessonLevel })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] text-xs sm:text-sm text-[#292321] bg-white"
                  >
                    <option value="iniciante">Iniciante</option>
                    <option value="intermediário">Intermediário</option>
                    <option value="avançado">Avançado</option>
                  </select>
                </div>
              </div>

              {/* Upload de Imagem de Capa (Thumbnail) */}
              <div>
                <ImageUploadField
                  label="Capa da Aula (Thumbnail)"
                  value={lessonFormData.thumbnailUrl}
                  onChange={(url) => setLessonFormData({ ...lessonFormData, thumbnailUrl: url })}
                />
              </div>

              {/* SEÇÃO DO VÍDEO (CLOUDFLARE R2 OU EXTERNO) */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#292321] uppercase tracking-wider flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-[#B77D82]" />
                    <span>Hospedagem do Vídeo</span>
                  </label>
                  <div className="flex rounded-lg p-0.5 bg-white border border-[#EADBCE]">
                    <button
                      type="button"
                      onClick={() => setLessonFormData({ ...lessonFormData, videoProvider: "r2" })}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                        lessonFormData.videoProvider === "r2"
                          ? "bg-[#B77D82] text-white shadow-xs"
                          : "text-[#827B77] hover:text-[#292321]"
                      }`}
                    >
                      Cloudflare R2
                    </button>
                    <button
                      type="button"
                      onClick={() => setLessonFormData({ ...lessonFormData, videoProvider: "external" })}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                        lessonFormData.videoProvider === "external"
                          ? "bg-[#B77D82] text-white shadow-xs"
                          : "text-[#827B77] hover:text-[#292321]"
                      }`}
                    >
                      URL Externa
                    </button>
                  </div>
                </div>

                {lessonFormData.videoProvider === "r2" ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#827B77] leading-relaxed">
                      Envio seguro e direto para o bucket privado Cloudflare R2 (MP4, WebM ou MOV até 5 GB).
                    </p>

                    <label className="block p-4 rounded-xl border border-dashed border-[#B77D82] bg-white text-center cursor-pointer hover:bg-[#F7EEEE] transition">
                      <Upload className="w-6 h-6 text-[#B77D82] mx-auto mb-1" />
                      <span className="text-xs font-semibold text-[#292321] block">
                        Clique para selecionar o vídeo no seu computador
                      </span>
                      <span className="text-[10px] text-[#827B77]">
                        Upload em partes paralelas diretamente para o R2
                      </span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handleVideoFileChange}
                        className="hidden"
                      />
                    </label>

                    {videoUploadProgress !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-[#292321]">
                          <span>Enviando para o R2...</span>
                          <span>{videoUploadProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#EADBCE] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#B77D82] transition-all duration-300"
                            style={{ width: `${videoUploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {lessonFormData.videoStorageKey && (
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-[11px] truncate">
                          Chave no R2: {lessonFormData.videoStorageKey}
                        </span>
                      </div>
                    )}

                    {videoUploadError && (
                      <p className="text-xs text-rose-600 font-medium">{videoUploadError}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-[#292321] mb-1">
                      URL Direta do Vídeo
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={lessonFormData.videoUrl}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, videoUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#EADBCE] text-xs sm:text-sm text-[#292321] bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Status da Aula */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#292321] mb-1">
                    Status de Publicação
                  </label>
                  <select
                    value={lessonFormData.status}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, status: e.target.value as LessonStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-[#EADBCE] text-xs sm:text-sm text-[#292321] bg-white"
                  >
                    <option value="publicado">Publicado (Liberado)</option>
                    <option value="rascunho">Rascunho (Oculto)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#292321] mb-1">
                    Ordem no Exercício
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={lessonFormData.order}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#EADBCE] text-xs sm:text-sm text-[#292321]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#827B77] hover:bg-[#FAF7F2] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || (videoUploadProgress !== null && videoUploadProgress < 100)}
                  className="px-5 py-2 rounded-xl bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Salvando..." : editingLesson ? "Salvar Aula" : "Vincular Aula ao Exercício"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminExercisesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#827B77]">Carregando exercícios...</div>}>
      <AdminExercisesContent />
    </Suspense>
  );
}
