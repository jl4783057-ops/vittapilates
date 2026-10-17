"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/store/context";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  ChevronRight,
} from "lucide-react";
import confetti from "canvas-confetti";

function LessonPlayerContent() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params?.id as string;

  const { lessons, categories, subcategories, currentUser, toggleLessonCompletion } = useApp();
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [playbackError, setPlaybackError] = useState("");
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);
  const [playbackRetry, setPlaybackRetry] = useState(0);

  const lesson = lessons.find((l) => l.id === lessonId);
  const category = categories.find((c) => c.id === lesson?.categoryId);
  const subcategory = subcategories.find((s) => s.id === lesson?.subcategoryId);

  const isAvailable = Boolean(
    lesson &&
    (!category || category.published) &&
    (!subcategory || subcategory.published)
  );

  const isCompleted = currentUser?.completedLessonIds?.includes(lesson?.id || "") || false;

  useEffect(() => {
    if (!lesson || lesson.videoProvider !== "r2") {
      setPlaybackUrl(lesson?.videoUrl || "");
      setPlaybackError("");
      setIsLoadingPlayback(false);
      return;
    }
    const controller = new AbortController();
    setPlaybackUrl("");
    setPlaybackError("");
    setIsLoadingPlayback(true);
    fetch(`/api/aluna/lessons/${encodeURIComponent(lesson.id)}/playback`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Não foi possível liberar o vídeo.");
        setPlaybackUrl(result.url);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setPlaybackError(error instanceof Error ? error.message : "Não foi possível carregar o vídeo.");
      })
      .finally(() => setIsLoadingPlayback(false));
    return () => controller.abort();
  }, [lesson?.id, lesson?.videoProvider, lesson?.videoUrl, playbackRetry]);

  // Próxima aula disponível na ordem da categoria ou catálogo
  const currentIndex = lesson ? lessons.findIndex((l) => l.id === lesson.id) : -1;
  const nextLesson =
    lessons.slice(currentIndex + 1).find((l) => l.status === "publicado") ||
    lessons.find((l) => l.id !== lesson?.id && l.status === "publicado");

  const handleToggleComplete = () => {
    if (!lesson) return;
    toggleLessonCompletion(lesson.id);

    if (!isCompleted) {
      // Disparar confetes elegantes
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#B77D82", "#EBD6D5", "#F3EAE3"],
        });
      } catch (e) {
        // Fallback gracioso
      }
    }
  };

  if (!lesson || !isAvailable) {
    return (
      <div className="py-12 px-4 text-center space-y-4 max-w-md mx-auto animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-white text-[#B77D82] mx-auto flex items-center justify-center border border-[#EADBCE] shadow-xs">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-serif font-bold text-xl text-[#292321]">
            Aula em atualização
          </h2>
          <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed">
            Esta aula pertence a uma categoria ou tema que está temporariamente em atualização. Em breve o conteúdo estará disponível para você.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/aluna/programas"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition shadow-xs"
          >
            Voltar para a biblioteca
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Botão de Voltar */}
      <div className="flex items-center justify-between pt-1">
        <Link
          href="/aluna/programas"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#827B77] hover:text-[#292321] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar à Biblioteca
        </Link>
        <div className="flex items-center gap-2 text-[11px] text-[#827B77]">
          <span>{category?.name}</span>
          <span>•</span>
          <span className="capitalize">{lesson.level}</span>
        </div>
      </div>

      {/* Container do Player de Vídeo */}
      <section aria-label="Player de vídeo" className="relative rounded-3xl overflow-hidden bg-black aspect-video shadow-md border border-[#EADBCE]">
        {isLoadingPlayback ? (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm">Preparando sua aula…</div>
        ) : playbackError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center text-white text-sm">
            <span>{playbackError}</span>
            <button onClick={() => setPlaybackRetry((value) => value + 1)} className="rounded-full bg-white/15 px-4 py-2">Tentar novamente</button>
          </div>
        ) : playbackUrl ? (
          <video
            key={playbackUrl}
            src={playbackUrl}
            controls
            poster={lesson.thumbnailUrl}
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
          >
            Seu navegador não suporta a reprodução deste vídeo.
          </video>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm">O vídeo desta aula ainda não foi configurado.</div>
        )}
      </section>

      {/* Ações e Conclusão */}
      <div className="flex items-center justify-between gap-3 bg-[#FFFFFF] p-4 rounded-2xl border border-[#EADBCE] shadow-2xs">
        <div>
          <p className="text-xs font-medium text-[#827B77]">Status desta prática:</p>
          <p className="text-sm font-serif font-bold text-[#292321]">
            {isCompleted ? "Aula concluída!" : "Ainda em andamento"}
          </p>
        </div>

        <button
          onClick={handleToggleComplete}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition shadow-xs ${
            isCompleted
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              : "bg-[#B77D82] text-white hover:bg-[#A3676C]"
          }`}
        >
          {isCompleted ? (
            <>
              <Check className="w-4 h-4 stroke-[2.5]" />
              Concluída (Desmarcar)
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Marcar como Concluída
            </>
          )}
        </button>
      </div>

      {/* Detalhes da Aula */}
      <section className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EADBCE] space-y-4 shadow-2xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-[#F7EEEE] text-[#B77D82] font-semibold text-[11px]">
              {category?.name}
            </span>
            {subcategory && (
              <span className="text-[11px] text-[#827B77]">
                / {subcategory.name}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
            {lesson.title}
          </h1>
        </div>

        {/* Metadados */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#FAF7F2] text-center">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-[#827B77] block">
              Duração
            </span>
            <p className="text-xs font-semibold text-[#292321]">
              {lesson.durationMinutes} minutos
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-[#827B77] block">
              Nível
            </span>
            <p className="text-xs font-semibold text-[#292321] capitalize">
              {lesson.level}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-[#827B77] block">
              Formato
            </span>
            <p className="text-xs font-semibold text-[#292321] capitalize">
              {lesson.format}
            </p>
          </div>
        </div>

        {/* Descrição */}
        <div className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
            Sobre esta prática
          </h2>
          <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed">
            {lesson.description}
          </p>
        </div>

        {/* Materiais Necessários */}
        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-1">
          <h3 className="text-xs font-bold text-[#292321] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#B77D82]" />
            Materiais e Acessórios
          </h3>
          <p className="text-xs text-[#827B77]">
            {lesson.materials || "Tapete de Pilates (Mat) ou uma superfície macia e confortável."}
          </p>
        </div>

        {/* Tags */}
        {lesson.tags && lesson.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {lesson.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-[#FAF7F2] border border-[#EADBCE] text-[#827B77] px-2.5 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Próxima Aula */}
      {nextLesson && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
            Próxima aula recomendada
          </h2>
          <Link
            href={`/aluna/aula/${nextLesson.id}`}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#EADBCE] hover:border-[#B77D82] transition group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-16 h-12 rounded-xl overflow-hidden bg-[#F3EAE3] shrink-0">
                <img
                  src={nextLesson.thumbnailUrl}
                  alt={nextLesson.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-[#B77D82] uppercase">
                  A seguir
                </p>
                <h3 className="font-serif font-bold text-xs text-[#292321] line-clamp-1 group-hover:text-[#B77D82] transition">
                  {nextLesson.title}
                </h3>
                <span className="text-[11px] text-[#827B77]">
                  {nextLesson.durationMinutes} min • {nextLesson.level}
                </span>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-[#827B77] group-hover:text-[#B77D82] group-hover:translate-x-0.5 transition" />
          </Link>
        </section>
      )}
    </div>
  );
}

export default function LessonPlayerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#827B77]">Carregando aula...</div>}>
      <LessonPlayerContent />
    </Suspense>
  );
}
