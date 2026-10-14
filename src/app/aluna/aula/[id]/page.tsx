"use client";

import React, { useState, Suspense } from "react";
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

  const lesson = lessons.find((l) => l.id === lessonId) || lessons[0];
  const category = categories.find((c) => c.id === lesson?.categoryId);
  const subcategory = subcategories.find((s) => s.id === lesson?.subcategoryId);

  const isCompleted = currentUser?.completedLessonIds?.includes(lesson?.id || "") || false;

  // Próxima aula na ordem da categoria ou catálogo
  const currentIndex = lessons.findIndex((l) => l.id === lesson?.id);
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

  if (!lesson) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-sm text-[#827B77]">Aula não encontrada.</p>
        <Link
          href="/aluna/programas"
          className="text-xs font-semibold text-[#B77D82] underline"
        >
          Voltar para a biblioteca
        </Link>
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
        <video
          key={lesson.videoUrl}
          src={lesson.videoUrl}
          controls
          poster={lesson.thumbnailUrl}
          playsInline
          className="w-full h-full object-contain"
        >
          Seu navegador não suporta a reprodução deste vídeo.
        </video>
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
