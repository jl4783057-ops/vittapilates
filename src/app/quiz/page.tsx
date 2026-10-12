"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/context";
import { QuizAnswers, QuizPlanResult, Lesson } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  Play,
  RotateCcw,
  Compass,
  HeartHandshake,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function QuizFlowPage() {
  const router = useRouter();
  const { quizQuestions, lessons, categories, saveQuizPlan, currentUser } = useApp();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    name: currentUser?.name || "",
    birthDate: "",
    mainGoal: "Melhorar a postura e cuidar da coluna",
    experience: "iniciante",
    weeklyDays: 3,
    durationMinutes: 15,
    preferredFormat: "aula rápida",
    equipment: "sem equipamento",
    physicalAdaptation: "nenhuma",
  });
  const [validationError, setValidationError] = useState("");

  // Fases do fluxo pós-respostas:
  // 'answering' -> 'analyzing' -> 'plan_ready'
  const [flowState, setFlowState] = useState<"answering" | "analyzing" | "plan_ready">("answering");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisPhaseText, setAnalysisPhaseText] = useState("Avaliando suas preferências de tempo...");
  const [generatedPlan, setGeneratedPlan] = useState<QuizPlanResult | null>(null);

  const activeQuestions = quizQuestions;
  const currentQuestion = activeQuestions[currentStepIndex];
  const isLastQuestion = currentStepIndex === activeQuestions.length - 1;

  // Barra de progresso do quiz
  const progressPercent = Math.round(
    ((currentStepIndex + 1) / activeQuestions.length) * 100
  );

  const handleNext = () => {
    setValidationError("");

    // Validações específicas por pergunta
    if (currentQuestion.type === "text" && currentQuestion.required) {
      if (!answers.name || answers.name.trim().length < 2) {
        setValidationError("Por favor, informe seu nome.");
        return;
      }
    }

    if (currentQuestion.type === "date" && currentQuestion.required) {
      if (!answers.birthDate) {
        setValidationError("Por favor, selecione sua data de nascimento.");
        return;
      }
      // Validar idade mínima (ex: pelo menos 14 anos)
      const birthYear = new Date(answers.birthDate).getFullYear();
      const currentYear = new Date().getFullYear();
      if (currentYear - birthYear < 14) {
        setValidationError("A plataforma é voltada para usuárias a partir de 14 anos.");
        return;
      }
    }

    if (isLastQuestion) {
      // Iniciar análise e geração do plano
      startAnalysisAndPlanGeneration();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setValidationError("");
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      router.push("/login");
    }
  };

  const startAnalysisAndPlanGeneration = () => {
    setFlowState("analyzing");
    setAnalysisProgress(10);

    // Etapas da análise breve
    setTimeout(() => {
      setAnalysisProgress(40);
      setAnalysisPhaseText("Mapeando aulas ideais no catálogo oficial...");
    }, 800);

    setTimeout(() => {
      setAnalysisProgress(75);
      setAnalysisPhaseText("Equilibrando frequência, duração e dias de descanso...");
    }, 1600);

    setTimeout(() => {
      setAnalysisProgress(100);
      buildFinalPlan();
    }, 2400);
  };

  const buildFinalPlan = () => {
    const weeklyDays = Number(answers.weeklyDays) || 3;
    const duration = Number(answers.durationMinutes) || 15;
    const goal = answers.mainGoal || "postura";

    // Buscar aulas publicadas correspondentes no catálogo real
    const publishedLessons = lessons.filter((l) => l.status === "publicado");

    // Filtrar aulas mais afins
    let matchedLessons = publishedLessons.filter((l) => {
      const matchDuration = Math.abs(l.durationMinutes - duration) <= 10;
      return matchDuration;
    });

    if (matchedLessons.length === 0) {
      matchedLessons = publishedLessons;
    }

    const recommendedLessons = matchedLessons.slice(0, Math.min(weeklyDays, 4));

    // Dias da semana sugeridos
    const daysMap = ["Segunda-feira", "Quarta-feira", "Sexta-feira", "Sábado", "Terça-feira"];
    const scheduleWeek = recommendedLessons.map((les, idx) => ({
      day: daysMap[idx % daysMap.length],
      focus: les.title,
      lessonId: les.id,
    }));

    // Categorias recomendadas
    const catNames = Array.from(
      new Set(
        recommendedLessons.map((l) => {
          const cat = categories.find((c) => c.id === l.categoryId);
          return cat ? cat.name : "Pilates Geral";
        })
      )
    );

    const monthlyEstimatedHours = Number(((weeklyDays * duration * 4.3) / 60).toFixed(1));
    const estimatedSessionsQuarter = weeklyDays * 12;

    const plan: QuizPlanResult = {
      id: `plan-${Date.now()}`,
      userName: answers.name || "Aluna",
      mainGoal: answers.mainGoal || "Bem-estar e equilíbrio corporal",
      weeklyDays,
      durationMinutes: duration,
      experience: answers.experience || "iniciante",
      consistencyForecast: {
        monthlyHours: monthlyEstimatedHours,
        estimatedSessionsQuarter,
        disclaimer:
          "Esta previsão é uma estimativa de planejamento e consistência para sua rotina, não uma garantia ou promessa de resultado corporal.",
      },
      recommendedCategoryNames: catNames,
      recommendedLessonIds: recommendedLessons.map((l) => l.id),
      scheduleWeek,
      createdAt: new Date().toISOString(),
    };

    setGeneratedPlan(plan);
    saveQuizPlan(plan);
    setFlowState("plan_ready");

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#B77D82", "#EBD6D5", "#FAF7F2"],
      });
    } catch (e) {
      // Ignorar fallback
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar com Navegação */}
      <header className="max-w-lg mx-auto w-full flex items-center justify-between pb-2">
        {flowState === "answering" ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs text-[#827B77] hover:text-[#292321] transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStepIndex === 0 ? "Voltar ao Login" : "Pergunta anterior"}
          </button>
        ) : (
          <Link
            href="/aluna"
            className="flex items-center gap-1.5 text-xs text-[#827B77] hover:text-[#292321] transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Ir para Meu Dashboard
          </Link>
        )}

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#B77D82] text-white flex items-center justify-center font-serif font-bold text-xs">
            P
          </div>
          <span className="font-serif font-bold text-xs text-[#292321]">
            Plano Personalizado
          </span>
        </div>
      </header>

      {/* Container Principal */}
      <main className="max-w-lg mx-auto w-full my-auto">
        {/* ============================================================== */}
        {/* ESTADO 1: RESPONDENDO AO QUIZ */}
        {/* ============================================================== */}
        {flowState === "answering" && currentQuestion && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.06)] p-6 sm:p-8 space-y-6 animate-fade-in">
            {/* Barra de Progresso */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-[#827B77]">
                <span>
                  Etapa <strong>{currentStepIndex + 1}</strong> de {activeQuestions.length}
                </span>
                <span className="font-semibold text-[#B77D82]">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-[#F3EAE3] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#B77D82] rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Enunciado e Texto Auxiliar */}
            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#292321] leading-snug">
                {currentQuestion.title}
              </h1>
              {currentQuestion.helperText && (
                <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed">
                  {currentQuestion.helperText}
                </p>
              )}
            </div>

            {validationError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl">
                {validationError}
              </div>
            )}

            {/* Renderização da Resposta por Tipo */}
            <div className="space-y-2.5">
              {/* Tipo Texto (Nome) */}
              {currentQuestion.type === "text" && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={answers.name || ""}
                    onChange={(e) => setAnswers({ ...answers, name: e.target.value })}
                    placeholder="Seu primeiro nome"
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] placeholder:text-[#827B77]/60 focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50"
                    autoFocus
                  />
                </div>
              )}

              {/* Tipo Data (Data de Nascimento com aviso de privacidade e idade) */}
              {currentQuestion.type === "date" && (
                <div className="space-y-3">
                  <input
                    type="date"
                    value={answers.birthDate || ""}
                    onChange={(e) => setAnswers({ ...answers, birthDate: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50"
                    max={new Date().toISOString().split("T")[0]}
                  />
                  {currentQuestion.privacyNotice && (
                    <div className="flex items-start gap-2 bg-[#FAF7F2] p-3 rounded-2xl border border-[#EADBCE] text-[11px] text-[#827B77]">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p>{currentQuestion.privacyNotice}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tipo Opções Únicas / Frequência / Duração */}
              {["single", "frequency", "duration"].includes(currentQuestion.type) && (
                <div className="space-y-2">
                  {currentQuestion.options.map((opt) => {
                    const fieldKey =
                      currentQuestion.type === "frequency"
                        ? "weeklyDays"
                        : currentQuestion.type === "duration"
                        ? "durationMinutes"
                        : currentQuestion.id === "q-3"
                        ? "mainGoal"
                        : currentQuestion.id === "q-4"
                        ? "experience"
                        : currentQuestion.id === "q-7"
                        ? "preferredFormat"
                        : currentQuestion.id === "q-8"
                        ? "equipment"
                        : "physicalAdaptation";

                    const isSelected = String(answers[fieldKey]) === String(opt.value);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setAnswers({ ...answers, [fieldKey]: opt.value });
                          setValidationError("");
                        }}
                        className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-[#F7EEEE] border-[#B77D82] shadow-xs"
                            : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p
                            className={`text-sm font-semibold ${
                              isSelected ? "text-[#B77D82]" : "text-[#292321]"
                            }`}
                          >
                            {opt.label}
                          </p>
                          {opt.helperText && (
                            <p className="text-xs text-[#827B77]">
                              {opt.helperText}
                            </p>
                          )}
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? "border-[#B77D82] bg-[#B77D82] text-white"
                              : "border-[#EADBCE]"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4 fill-white text-[#B77D82]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Botão de Avançar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-sm tracking-wide shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isLastQuestion ? "CONCLUIR E GERAR MEU PLANO" : "AVANÇAR"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ESTADO 2: ANÁLISE E CRIAÇÃO DO PLANO COM PROGRESSO VISUAL */}
        {/* ============================================================== */}
        {flowState === "analyzing" && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.06)] p-8 text-center space-y-6 animate-fade-in">
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-full h-full rounded-full border-4 border-[#F3EAE3] border-t-[#B77D82] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#B77D82] animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Montando seu Plano de Pilates...
              </h2>
              <p className="text-xs sm:text-sm text-[#827B77] min-h-[2.5rem]">
                {analysisPhaseText}
              </p>
            </div>

            {/* Barra de progresso da análise */}
            <div className="w-full h-2.5 bg-[#F3EAE3] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#B77D82] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ESTADO 3: PLANO PERSONALIZADO PRONTO (Item 16) */}
        {/* ============================================================== */}
        {flowState === "plan_ready" && generatedPlan && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.06)] p-6 sm:p-8 space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#F7EEEE] text-[#B77D82] mb-1">
                <Sparkles className="w-6 h-6 fill-[#B77D82]/20" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
                Seu plano personalizado está pronto! 🌸
              </h1>
              <p className="text-xs sm:text-sm text-[#827B77] max-w-sm mx-auto">
                Preparado com carinho para <strong>{generatedPlan.userName}</strong>, respeitando o seu tempo e o momento do seu corpo.
              </p>
            </div>

            {/* Resumo dos Pilares Escolhidos */}
            <div className="grid grid-cols-2 gap-2.5 p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs">
              <div>
                <span className="text-[#827B77] text-[11px] block">Objetivo Principal:</span>
                <p className="font-semibold text-[#292321] capitalize">
                  {generatedPlan.mainGoal}
                </p>
              </div>
              <div>
                <span className="text-[#827B77] text-[11px] block">Frequência Sugerida:</span>
                <p className="font-semibold text-[#292321]">
                  {generatedPlan.weeklyDays} dias por semana
                </p>
              </div>
              <div>
                <span className="text-[#827B77] text-[11px] block">Duração Média:</span>
                <p className="font-semibold text-[#292321]">
                  {generatedPlan.durationMinutes} minutos por aula
                </p>
              </div>
              <div>
                <span className="text-[#827B77] text-[11px] block">Nível de Partida:</span>
                <p className="font-semibold text-[#292321] capitalize">
                  {generatedPlan.experience}
                </p>
              </div>
            </div>

            {/* Previsão de Rotina e Consistência (Item 16) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FAF7F2] to-[#F7EEEE] border border-[#EBD6D5] space-y-2">
              <div className="flex items-center gap-2 text-[#B77D82]">
                <Calendar className="w-4 h-4" />
                <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-[#292321]">
                  Previsão de Consistência e Rotina
                </h3>
              </div>
              <p className="text-xs text-[#292321] leading-relaxed">
                Praticando <strong>{generatedPlan.weeklyDays}x por semana</strong> por <strong>{generatedPlan.durationMinutes} min</strong>, você dedicará cerca de <strong>{generatedPlan.consistencyForecast.monthlyHours} horas mensais</strong> ao seu autocuidado e acumulará aproximadamente <strong>{generatedPlan.consistencyForecast.estimatedSessionsQuarter} práticas no próximo trimestre</strong>!
              </p>
              <p className="text-[10px] text-[#827B77] italic leading-tight pt-1">
                * {generatedPlan.consistencyForecast.disclaimer}
              </p>
            </div>

            {/* Sequência Sugerida de Aulas do Catálogo Real */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#292321]">
                Sua Primeira Sequência Semanal Recomendada:
              </h3>

              <div className="space-y-2">
                {generatedPlan.scheduleWeek.map((item, idx) => {
                  const lessonObj = lessons.find((l) => l.id === item.lessonId);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-[#EADBCE] bg-[#FFFFFF] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#F3EAE3] text-[#B77D82] font-semibold flex items-center justify-center shrink-0 text-xs">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-[#827B77] block">
                            {item.day}
                          </span>
                          <p className="font-medium text-[#292321] truncate">
                            {lessonObj?.title || item.focus}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] text-[#827B77] shrink-0">
                        {lessonObj?.durationMinutes || generatedPlan.durationMinutes} min
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botão de Começar a Primeira Aula (Item 16) */}
            <div className="pt-2 space-y-2">
              <Link
                href={`/aluna/aula/${generatedPlan.recommendedLessonIds[0] || "les-1"}`}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-sm tracking-wide shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer group"
              >
                <Play className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" />
                <span>COMEÇAR MINHA PRIMEIRA AULA AGORA</span>
              </Link>

              <Link
                href="/aluna"
                className="block text-center py-2.5 text-xs text-[#827B77] hover:text-[#292321] transition"
              >
                Ver Meu Painel de Aluna
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-lg mx-auto w-full text-center py-2 text-[11px] text-[#827B77]">
        Respeitamos sua privacidade e autonomia corporal. Pratique sempre no seu ritmo.
      </footer>
    </div>
  );
}
