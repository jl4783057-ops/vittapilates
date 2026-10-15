"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteSettings, QuizAnswers, QuizPlanResult } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  Heart,
  Dumbbell,
  Smile,
  Briefcase,
  Footprints,
  Activity,
  Home,
  Sun,
  BatteryMedium,
  Moon,
  Bed,
  Cookie,
  Wine,
  Utensils,
  Clock,
  CheckCircle2,
  Leaf,
  Compass,
  Zap,
  Sparkles,
  Lock,
} from "lucide-react";

interface QuizClientProps {
  siteSettings: SiteSettings;
}

// Helpers de Data e Cálculo
function calculateAge(birthDateStr: string): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

function getTwoMonthsFollowUpDate(baseDate: Date = new Date()): string {
  const d = new Date(baseDate);
  const targetMonth = d.getMonth() + 2;
  const year = d.getFullYear() + Math.floor(targetMonth / 12);
  const month = targetMonth % 12;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(d.getDate(), daysInMonth);
  const target = new Date(year, month, day);
  return target.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getBmiCategory(bmi: number): { label: string; tone: string; description: string } {
  if (bmi < 18.5) {
    return {
      label: "Abaixo do peso",
      tone: "text-amber-800 bg-amber-50 border-amber-200",
      description: "Classificação indicativa da OMS. Recomendamos suporte nutricional aliado às práticas.",
    };
  }
  if (bmi <= 24.9) {
    return {
      label: "Peso adequado (Eutrofia)",
      tone: "text-emerald-800 bg-emerald-50 border-emerald-200",
      description: "Faixa de equilíbrio corporal segundo os parâmetros da OMS.",
    };
  }
  if (bmi <= 29.9) {
    return {
      label: "Sobrepeso",
      tone: "text-amber-800 bg-amber-50 border-amber-200",
      description: "Faixa indicativa de atenção ao equilíbrio metabólico e rotina de movimento.",
    };
  }
  return {
    label: "Obesidade",
    tone: "text-rose-800 bg-rose-50 border-rose-200",
    description: "Parâmetro indicativo para acompanhamento com profissionais de saúde e práticas graduais.",
  };
}

const INITIAL_ANSWERS: QuizAnswers = {
  name: "",
  birthDate: "",
  mainGoal: "",
  lastIdealWeight: "",
  targetArea: "",
  bodyType: "",
  desiredBodyShape: "",
  dailyRoutine: "",
  energyLevels: "",
  activityLevel: "",
  sleepHours: "",
  badHabits: [],
  heightCm: undefined,
  currentWeightKg: undefined,
  targetWeightKg: undefined,
  bmi: undefined,
  desiredPace: "",
};

export function QuizClient({ siteSettings }: QuizClientProps) {
  const router = useRouter();

  // 1. Inicializador seguro da sessão (sem setState síncrono em useEffect)
  const [sessionId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      let sid = sessionStorage.getItem("vitta_quiz_session_id");
      if (!sid) {
        sid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `quiz-${Date.now()}`;
        sessionStorage.setItem("vitta_quiz_session_id", sid);
      }
      return sid;
    } catch {
      return `quiz-${Date.now()}`;
    }
  });

  // 2. Inicializador seguro do estado de respostas lendo da sessão
  const [answers, setAnswers] = useState<QuizAnswers>(() => {
    if (typeof window === "undefined") return INITIAL_ANSWERS;
    try {
      const sid = sessionStorage.getItem("vitta_quiz_session_id");
      if (sid) {
        const saved = localStorage.getItem(`vitta_quiz_data_${sid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.answers) {
            return { ...INITIAL_ANSWERS, ...parsed.answers };
          }
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_ANSWERS;
  });

  // 3. Inicializador seguro da etapa ativa
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    try {
      const sid = sessionStorage.getItem("vitta_quiz_session_id");
      if (sid) {
        const saved = localStorage.getItem(`vitta_quiz_data_${sid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.step === "number" && parsed.step >= 1 && parsed.step <= 25) {
            return parsed.step === 23 ? 22 : parsed.step; // Se parou em criação, volta para 22
          }
        }
      }
    } catch {
      // Fallback
    }
    return 1;
  });

  // Campos locais para dia, mês, ano
  const [birthDay, setBirthDay] = useState<string>(() => {
    if (answers.birthDate) {
      const parts = answers.birthDate.split("-");
      if (parts.length === 3) return String(parseInt(parts[2], 10));
    }
    return "";
  });
  const [birthMonth, setBirthMonth] = useState<string>(() => {
    if (answers.birthDate) {
      const parts = answers.birthDate.split("-");
      if (parts.length === 3) return String(parseInt(parts[1], 10));
    }
    return "";
  });
  const [birthYear, setBirthYear] = useState<string>(() => {
    if (answers.birthDate) {
      const parts = answers.birthDate.split("-");
      if (parts.length === 3) return parts[0];
    }
    return "";
  });

  // Estado da etapa 23 (Criação do plano)
  const [creationProgress, setCreationProgress] = useState(0);
  const [creationStepText, setCreationStepText] = useState("Organizando suas preferências...");

  // Salvar progresso no localStorage isolado a cada alteração
  useEffect(() => {
    if (!sessionId) return;
    try {
      localStorage.setItem(
        `vitta_quiz_data_${sessionId}`,
        JSON.stringify({ step: currentStep, answers, updatedAt: new Date().toISOString() })
      );
    } catch (e) {
      console.warn("Aviso ao salvar sessão no localStorage:", e);
    }
  }, [answers, currentStep, sessionId]);

  // Função para compor e salvar data de nascimento sem depender de useEffect em cascata
  const updateBirthParts = (newD: string, newM: string, newY: string) => {
    setBirthDay(newD);
    setBirthMonth(newM);
    setBirthYear(newY);

    const d = parseInt(newD, 10);
    const m = parseInt(newM, 10);
    const y = parseInt(newY, 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1930) {
      const daysInSelectedMonth = new Date(y, m, 0).getDate();
      if (d <= daysInSelectedMonth) {
        const formattedMonth = m < 10 ? `0${m}` : `${m}`;
        const formattedDay = d < 10 ? `0${d}` : `${d}`;
        const isoDate = `${y}-${formattedMonth}-${formattedDay}`;
        setAnswers((prev) => ({ ...prev, birthDate: isoDate }));
        return;
      }
    }
    setAnswers((prev) => ({ ...prev, birthDate: "" }));
  };

  // Cálculo de IMC em tempo real como valor derivado
  const calculatedBmi = useMemo(() => {
    if (!answers.heightCm || !answers.currentWeightKg) return null;
    if (answers.heightCm < 100 || answers.currentWeightKg < 30) return null;
    const hMeter = answers.heightCm / 100;
    const rawBmi = answers.currentWeightKg / (hMeter * hMeter);
    return Math.round(rawBmi * 10) / 10;
  }, [answers.heightCm, answers.currentWeightKg]);

  // Cálculo de idade em tempo real
  const currentAge = useMemo(() => {
    return answers.birthDate ? calculateAge(answers.birthDate) : null;
  }, [answers.birthDate]);

  // Diferença de peso e percentual
  const weightDiff = useMemo(() => {
    if (!answers.currentWeightKg || !answers.targetWeightKg) return null;
    const diff = Math.round((answers.targetWeightKg - answers.currentWeightKg) * 10) / 10;
    const pct = Math.round((Math.abs(diff) / answers.currentWeightKg) * 1000) / 10;
    return { diff, pct };
  }, [answers.currentWeightKg, answers.targetWeightKg]);

  // Data de acompanhamento de 2 meses
  const followUpDateStr = useMemo(() => {
    return getTwoMonthsFollowUpDate();
  }, []);

  // Sincronizar com o servidor assincronamente ao gerar o plano
  const syncWithServer = async () => {
    if (!sessionId) return;
    try {
      await fetch("/api/quiz/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          answers: {
            ...answers,
            bmi: calculatedBmi || undefined,
          },
          generatedPlan: {
            userName: answers.name || "Aluna",
            mainGoal: answers.mainGoal,
            targetDate: followUpDateStr,
            currentWeight: answers.currentWeightKg,
            targetWeight: answers.targetWeightKg,
            bmi: calculatedBmi,
          },
        }),
      });
    } catch (e) {
      console.warn("Aviso na sincronização segura com Supabase:", e);
    }
  };

  // Iniciar criação do plano da Etapa 22 para a 23
  const startPlanCreation = () => {
    setCurrentStep(23);
    setCreationProgress(10);
    setCreationStepText("Organizando suas preferências de rotina...");

    setTimeout(() => {
      setCreationProgress(45);
      setCreationStepText("Estruturando o acompanhamento para o seu objetivo...");
    }, 800);

    setTimeout(() => {
      setCreationProgress(80);
      setCreationStepText("Finalizando seu marco de acompanhamento...");
    }, 1600);

    setTimeout(() => {
      setCreationProgress(100);
      syncWithServer();
      setTimeout(() => {
        setCurrentStep(24);
      }, 500);
    }, 2400);
  };

  // Validação para habilitar o botão "Próximo"
  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return Boolean(answers.birthDate && currentAge !== null && currentAge >= 14 && currentAge <= 110);
      case 3:
        return true;
      case 4:
        return Boolean(answers.mainGoal);
      case 5:
        return Boolean(answers.lastIdealWeight);
      case 6:
        return true;
      case 7:
        return Boolean(answers.targetArea);
      case 8:
        return Boolean(answers.bodyType);
      case 9:
        return Boolean(answers.desiredBodyShape);
      case 10:
        return Boolean(answers.dailyRoutine);
      case 11:
        return Boolean(answers.energyLevels);
      case 12:
        return Boolean(answers.activityLevel);
      case 13:
        return Boolean(answers.sleepHours);
      case 14:
        return Boolean(answers.badHabits && answers.badHabits.length > 0);
      case 15:
        return Boolean(answers.heightCm && answers.heightCm >= 120 && answers.heightCm <= 230);
      case 16:
        return Boolean(answers.currentWeightKg && answers.currentWeightKg >= 30 && answers.currentWeightKg <= 250);
      case 17:
        return Boolean(answers.targetWeightKg && answers.targetWeightKg >= 30 && answers.targetWeightKg <= 250);
      case 18:
        return Boolean(answers.name && answers.name.trim().length >= 2);
      case 19:
        return true;
      case 20:
        return Boolean(answers.desiredPace);
      case 22:
        return true;
      case 23:
        return false;
      case 24:
        return true;
      case 25:
        return true;
      default:
        return true;
    }
  }, [currentStep, answers, currentAge]);

  const handleNext = () => {
    if (!canAdvance) return;
    if (currentStep === 20) {
      // Pula para 22 (etapa 21 omitida sem inventar perguntas)
      setCurrentStep(22);
      return;
    }
    if (currentStep < 25) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 22) {
      setCurrentStep(20);
      return;
    }
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.push("/login");
    }
  };

  // Seletor de opções para Dia, Mês, Ano
  const daysOptions = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  const monthsOptions = useMemo(
    () => [
      { num: 1, name: "Janeiro" },
      { num: 2, name: "Fevereiro" },
      { num: 3, name: "Março" },
      { num: 4, name: "Abril" },
      { num: 5, name: "Maio" },
      { num: 6, name: "Junho" },
      { num: 7, name: "Julho" },
      { num: 8, name: "Agosto" },
      { num: 9, name: "Setembro" },
      { num: 10, name: "Outubro" },
      { num: 11, name: "Novembro" },
      { num: 12, name: "Dezembro" },
    ],
    []
  );
  const yearsOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 95;
    const maxYear = currentYear - 14;
    const list = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, []);

  // Toggle de hábitos com regra exclusiva de "Nenhum dos itens acima"
  const toggleBadHabit = (item: string) => {
    setAnswers((prev) => {
      const currentList = prev.badHabits || [];
      if (item === "Nenhum dos itens acima") {
        return { ...prev, badHabits: ["Nenhum dos itens acima"] };
      }
      const withoutNone = currentList.filter((h) => h !== "Nenhum dos itens acima");
      if (withoutNone.includes(item)) {
        return { ...prev, badHabits: withoutNone.filter((h) => h !== item) };
      } else {
        return { ...prev, badHabits: [...withoutNone, item] };
      }
    });
  };

  // Seção do quiz para o cabeçalho
  const sectionName = useMemo(() => {
    if (currentStep === 1) return "";
    if (currentStep <= 3) return "Sobre Você";
    if (currentStep <= 6) return "Objetivos";
    if (currentStep <= 9) return "Seu Corpo";
    if (currentStep <= 13) return "Hábitos";
    if (currentStep === 14) return "Nutrição";
    if (currentStep <= 17) return "Medidas";
    if (currentStep <= 18) return "Personalização";
    if (currentStep === 19) return "Resumo";
    if (currentStep === 20) return "Ritmo";
    if (currentStep <= 22) return "Seu Plano";
    if (currentStep === 23) return "Processamento";
    if (currentStep === 24) return "Plano Pronto";
    return "Oferta Especial";
  }, [currentStep]);

  // Progresso relativo
  const progressPercent = Math.min(100, Math.round((currentStep / 25) * 100));

  // URL do checkout configurada
  const checkoutUrl = process.env.NEXT_PUBLIC_CHECKOUT_URL;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#292321] flex flex-col justify-between p-4 sm:p-6 selection:bg-[#EBD6D5] selection:text-[#292321]">
      {/* ============================================================ */}
      {/* TOPO COM LOGO OFICIAL DA VITTA PILATES (IGUAL AO LOGIN) */}
      {/* ============================================================ */}
      <header className="max-w-xl mx-auto w-full pt-1 pb-3 flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-3">
          {currentStep > 1 && currentStep !== 23 ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Voltar para a etapa anterior"
              className="inline-flex items-center gap-1.5 text-xs text-[#827B77] hover:text-[#292321] transition font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#F3EAE3] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <div className="w-16" />
          )}

          {/* Logomarca idêntica à do login */}
          <div className="flex flex-col items-center">
            {siteSettings.logoUrl ? (
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.logoText || "Vitta Pilates"}
                className="h-9 sm:h-11 w-auto max-w-[160px] object-contain rounded-lg"
              />
            ) : (
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#B77D82] text-white font-serif font-bold text-lg shadow-2xs">
                P
              </div>
            )}
          </div>

          <div className="w-16 flex justify-end">
            {currentStep > 1 && sectionName && (
              <span className="text-[11px] font-semibold text-[#827B77] uppercase tracking-wider hidden sm:inline-block">
                {sectionName}
              </span>
            )}
          </div>
        </div>

        {/* Indicador de Progresso com Seção */}
        {currentStep > 1 && currentStep !== 23 && (
          <div className="w-full space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#827B77]">
              <span>
                {sectionName && <strong className="text-[#292321] mr-1">{sectionName}</strong>}
                Etapa {currentStep} de 25
              </span>
              <span className="font-semibold text-[#B77D82]">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#F3EAE3] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#B77D82] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* ============================================================ */}
      {/* CORPO DO QUIZ - CADA UMA DAS 25 ETAPAS */}
      {/* ============================================================ */}
      <main className="max-w-xl mx-auto w-full my-auto py-2 sm:py-4">
        {/* ------------------------------------------------------------ */}
        {/* ETAPA 1: ABERTURA */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 1 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 text-center space-y-6">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321] leading-tight">
              Vamos montar seu Plano Personalizado
            </h1>

            <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden border border-[#EADBCE] bg-[#FAF7F2] shadow-xs">
              <img
                src="/images/quiz/intro-collage.webp"
                alt="Colagem com práticas de exercícios e alimentação equilibrada"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-semibold text-sm tracking-wide shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Fazer meu Plano Personalizado</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 2: DATA DE NASCIMENTO */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 2 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Quando é seu aniversário?
              </h2>
              <p className="text-xs sm:text-sm text-[#827B77]">
                Seu plano respeitará seu momento de vida e adaptará o ritmo dos movimentos.
              </p>
            </div>

            {/* Seletor aberto de Dia, Mês e Ano pronto para interação */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                {/* Dia */}
                <div className="space-y-1">
                  <label htmlFor="birthDaySelect" className="text-[11px] font-bold uppercase tracking-wider text-[#827B77] block">
                    Dia
                  </label>
                  <select
                    id="birthDaySelect"
                    value={birthDay}
                    onChange={(e) => updateBirthParts(e.target.value, birthMonth, birthYear)}
                    className="w-full px-3 py-3 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 cursor-pointer"
                  >
                    <option value="">Dia</option>
                    {daysOptions.map((d) => (
                      <option key={d} value={d}>
                        {d < 10 ? `0${d}` : d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mês */}
                <div className="space-y-1">
                  <label htmlFor="birthMonthSelect" className="text-[11px] font-bold uppercase tracking-wider text-[#827B77] block">
                    Mês
                  </label>
                  <select
                    id="birthMonthSelect"
                    value={birthMonth}
                    onChange={(e) => updateBirthParts(birthDay, e.target.value, birthYear)}
                    className="w-full px-2.5 py-3 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 cursor-pointer"
                  >
                    <option value="">Mês</option>
                    {monthsOptions.map((m) => (
                      <option key={m.num} value={m.num}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ano */}
                <div className="space-y-1">
                  <label htmlFor="birthYearSelect" className="text-[11px] font-bold uppercase tracking-wider text-[#827B77] block">
                    Ano
                  </label>
                  <select
                    id="birthYearSelect"
                    value={birthYear}
                    onChange={(e) => updateBirthParts(birthDay, birthMonth, e.target.value)}
                    className="w-full px-3 py-3 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 cursor-pointer"
                  >
                    <option value="">Ano</option>
                    {yearsOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Entrada alternativa direta e acessível */}
              <div className="pt-1">
                <label htmlFor="birthDateManual" className="text-[11px] text-[#827B77] block mb-1">
                  Ou selecione diretamente no calendário:
                </label>
                <input
                  id="birthDateManual"
                  type="date"
                  value={answers.birthDate || ""}
                  max={new Date(new Date().getFullYear() - 14, 11, 31).toISOString().split("T")[0]}
                  min="1930-01-01"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const [y, m, d] = val.split("-");
                      updateBirthParts(String(parseInt(d, 10)), String(parseInt(m, 10)), y);
                    } else {
                      updateBirthParts("", "", "");
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50"
                />
              </div>

              {/* Indicador de Idade calculada dinamicamente */}
              {currentAge !== null && (
                <div className="p-3.5 rounded-2xl bg-[#F7EEEE] border border-[#EBD6D5] text-xs text-[#292321] flex items-center justify-between">
                  <span className="text-[#827B77]">Idade calculada para o plano:</span>
                  <span className="font-bold text-[#B77D82] text-sm">{currentAge} anos</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 3: PROVA SOCIAL */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 3 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 text-center space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
                Mais de 50 mil mulheres
              </h2>
              <p className="text-sm sm:text-base text-[#827B77]">
                já experimentaram a Vitta Pilates
              </p>
            </div>

            <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden border border-[#EADBCE] bg-[#FAF7F2] shadow-xs">
              <img
                src="/images/quiz/social-proof.webp"
                alt="Grupo de mulheres em comunidade praticando Pilates"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 4: OBJETIVO PRINCIPAL */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 4 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Qual é o seu objetivo principal?
            </h2>

            <div className="space-y-3">
              {[
                {
                  id: "emagrecer",
                  title: "Emagrecer",
                  subtitle: "Perder quilos extras com facilidade",
                  icon: Flame,
                },
                {
                  id: "amor-proprio",
                  title: "Encontrar o amor próprio",
                  subtitle: "Abraçar o seu corpo nessa mudança",
                  icon: Heart,
                },
                {
                  id: "musculos",
                  title: "Criar músculos",
                  subtitle: "Ficar mais forte",
                  icon: Dumbbell,
                },
                {
                  id: "manter-forma",
                  title: "Manter a forma",
                  subtitle: "Ficar em forma e se sentir bem",
                  icon: Smile,
                },
              ].map((opt) => {
                const isSelected = answers.mainGoal === opt.title;
                const IconComp = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, mainGoal: opt.title }))}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-[#F7EEEE] border-[#B77D82] shadow-xs"
                        : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
                          isSelected ? "bg-[#B77D82] text-white" : "bg-[#F3EAE3] text-[#B77D82]"
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className={`text-sm font-semibold ${isSelected ? "text-[#B77D82]" : "text-[#292321]"}`}>
                          {opt.title}
                        </p>
                        <p className="text-xs text-[#827B77]">{opt.subtitle}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-[#B77D82] bg-[#B77D82] text-white" : "border-[#EADBCE]"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4 fill-white text-[#B77D82]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 5: ÚLTIMA VEZ NO PESO IDEAL */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 5 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Quando foi a última vez que você esteve no seu peso ideal?
            </h2>

            <div className="space-y-2.5">
              {[
                "Há menos de 1 ano",
                "Há 1 a 2 anos",
                "Há mais de 3 anos",
                "Nunca",
              ].map((val) => {
                const isSelected = answers.lastIdealWeight === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, lastIdealWeight: val }))}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#F7EEEE] border-[#B77D82] shadow-xs"
                        : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${isSelected ? "text-[#B77D82]" : "text-[#292321]"}`}>
                      {val}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-[#B77D82] bg-[#B77D82] text-white" : "border-[#EADBCE]"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4 fill-white text-[#B77D82]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 6: MENSAGEM MOTIVACIONAL */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 6 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 text-center space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-[#F7EEEE] text-[#B77D82] flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
                Sabemos como fazer isso acontecer!
              </h2>
              <p className="text-sm text-[#292321] leading-relaxed">
                A vida tem muitos desafios, mas sua rotina de movimento não precisa ser mais um deles.
              </p>
              <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed pt-1">
                Os treinos da Vitta Pilates ajudam você a avançar no seu próprio ritmo.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 7: ÁREA QUE PRECISA DE ATENÇÃO */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 7 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Qual área precisa de mais atenção?
            </h2>

            {/* Layout responsivo com a mulher em pé ao lado das opções */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="rounded-2xl overflow-hidden border border-[#EADBCE] bg-[#FAF7F2] max-h-72 sm:max-h-80 flex items-center justify-center">
                <img
                  src="/images/quiz/woman-standing.webp"
                  alt="Ilustração da aluna em pé"
                  className="h-full w-auto object-contain max-h-72 sm:max-h-80"
                />
              </div>

              <div className="space-y-2">
                {["Braços", "Peito", "Barriga", "Glúteos", "Pernas"].map((area) => {
                  const isSelected = answers.targetArea === area;
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, targetArea: area }))}
                      className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-[#F7EEEE] border-[#B77D82] shadow-xs"
                          : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                      }`}
                    >
                      <span className={`text-sm font-semibold ${isSelected ? "text-[#B77D82]" : "text-[#292321]"}`}>
                        {area}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? "border-[#B77D82] bg-[#B77D82] text-white" : "border-[#EADBCE]"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4 fill-white text-[#B77D82]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 8: TIPO DE CORPO ATUAL */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 8 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Qual é o seu tipo de corpo?
              </h2>
              <p className="text-xs text-[#827B77]">
                Selecione a estrutura que mais se aproxima do seu biotipo atual.
              </p>
            </div>

            {/* Grade 2x2 com as figuras recortadas */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { id: "Retangular", name: "Retangular", img: "/images/quiz/body-retangular.webp" },
                { id: "Ampulheta", name: "Ampulheta", img: "/images/quiz/body-ampulheta.webp" },
                { id: "Pêra", name: "Pêra", img: "/images/quiz/body-pera.webp" },
                { id: "Circular", name: "Circular", img: "/images/quiz/body-circular.webp" },
              ].map((bt) => {
                const isSelected = answers.bodyType === bt.name;
                return (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, bodyType: bt.name }))}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#F7EEEE] border-[#B77D82] shadow-sm ring-2 ring-[#B77D82]/40"
                        : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                    }`}
                  >
                    <div className="w-full aspect-[3/4] max-h-48 rounded-xl overflow-hidden bg-[#FAF7F2] mb-2 flex items-center justify-center">
                      <img
                        src={bt.img}
                        alt={`Tipo de corpo ${bt.name}`}
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                    <span className={`text-xs sm:text-sm font-semibold ${isSelected ? "text-[#B77D82]" : "text-[#292321]"}`}>
                      {bt.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 9: FORMATO DE CORPO DESEJADO */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 9 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Qual é o formato de corpo que você deseja alcançar?
              </h2>
              <p className="text-xs text-[#827B77]">
                Selecione sua preferência visual para alinharmos o foco dos treinos.
              </p>
            </div>

            {/* Grade 2x2 com as figuras recortadas */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { id: "Magro", name: "Magro", img: "/images/quiz/goal-magro.webp" },
                { id: "Tonificado", name: "Tonificado", img: "/images/quiz/goal-tonificado.webp" },
                { id: "Com curvas", name: "Com curvas", img: "/images/quiz/goal-curvas.webp" },
                { id: "Um tamanho menor", name: "Um tamanho menor", img: "/images/quiz/goal-tamanho-menor.webp" },
              ].map((gt) => {
                const isSelected = answers.desiredBodyShape === gt.name;
                return (
                  <button
                    key={gt.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, desiredBodyShape: gt.name }))}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#F7EEEE] border-[#B77D82] shadow-sm ring-2 ring-[#B77D82]/40"
                        : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                    }`}
                  >
                    <div className="w-full aspect-[3/4] max-h-48 rounded-xl overflow-hidden bg-[#FAF7F2] mb-2 flex items-center justify-center">
                      <img
                        src={gt.img}
                        alt={`Formato desejado ${gt.name}`}
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                    <span className={`text-xs sm:text-sm font-semibold ${isSelected ? "text-[#B77D82]" : "text-[#292321]"}`}>
                      {gt.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 10: ROTINA DIÁRIA */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 10 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B77D82]">
                Hábitos
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Como é o seu dia normalmente?
              </h2>
            </div>

            <div className="space-y-2.5">
              {[
                { name: "No escritório", icon: Briefcase },
                { name: "Caminhando diariamente", icon: Footprints },
                { name: "Trabalhando fisicamente", icon: Activity },
                { name: "Mais em casa", icon: Home },
              ].map((item) => {
                const isSelected = answers.dailyRoutine === item.name;
                const IconComp = item.icon;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, dailyRoutine: item.name }))}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#F7EEEE] border-[#B77D82] shadow-xs"
                        : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[#B77D82] text-white" : "bg-[#F3EAE3] text-[#B77D82]"
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-semibold ${isSelected ? "text-[#B77D82]" : "text-[#292321]"}`}>
                        {item.name}
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-[#B77D82] bg-[#B77D82] text-white" : "border-[#EADBCE]"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4 fill-white text-[#B77D82]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 11: NÍVEIS DE ENERGIA */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 11 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B77D82]">
                Hábitos
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Como são seus níveis de energia durante o dia?
              </h2>
            </div>

            <div className="space-y-2.5">
              {[
                { name: "Mesmo ao longo do dia", icon: Sun },
                { name: "Sinto uma queda perto da hora do almoço", icon: BatteryMedium },
                { name: "Preciso de um cochilo depois das refeições", icon: Moon },
              ].map((item) => {
                const isSelected = answers.energyLevels === item.name;
                const IconComp = item.icon;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, energyLevels: item.name }))}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#F7EEEE] border-[#B77D82] shadow-xs"
                        : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[#B77D82] text-white" : "bg-[#F3EAE3] text-[#B77D82]"
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-semibold ${isSelected ? "text-[#B77D82]" : "text-[#292321]"}`}>
                        {item.name}
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-[#B77D82] bg-[#B77D82] text-white" : "border-[#EADBCE]"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4 fill-white text-[#B77D82]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 12: NÍVEL DE ATIVIDADE */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 12 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B77D82]">
                Hábitos
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Quão ativa você está?
              </h2>
            </div>

            <div className="space-y-2.5">
              {[
                "Não muito",
                "1–2 treinos por semana",
                "3–5 treinos por semana",
                "5–7 treinos por semana",
              ].map((val) => {
                const isSelected = answers.activityLevel === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, activityLevel: val }))}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#F7EEEE] border-[#B77D82] shadow-xs"
                        : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${isSelected ? "text-[#B77D82]" : "text-[#292321]"}`}>
                      {val}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-[#B77D82] bg-[#B77D82] text-white" : "border-[#EADBCE]"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4 fill-white text-[#B77D82]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 13: SONO */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 13 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B77D82]">
                Hábitos
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Quanto você dorme?
              </h2>
            </div>

            <div className="space-y-2.5">
              {[
                "Menos de 5 horas",
                "5–6 horas",
                "7–8 horas",
                "Mais de 8 horas",
              ].map((val) => {
                const isSelected = answers.sleepHours === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, sleepHours: val }))}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#F7EEEE] border-[#B77D82] shadow-xs"
                        : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${isSelected ? "text-[#B77D82]" : "text-[#292321]"}`}>
                      {val}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-[#B77D82] bg-[#B77D82] text-white" : "border-[#EADBCE]"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4 fill-white text-[#B77D82]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 14: HÁBITOS QUE PODEM DIFICULTAR O OBJETIVO */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 14 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B77D82]">
                Nutrição
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Quais hábitos dificultam você de atingir seus objetivos?
              </h2>
              <p className="text-xs text-[#827B77]">
                Selecione todos os que se aplicam a você.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                { name: "Eu não descanso o suficiente", icon: Bed },
                { name: "Eu gosto muito de doces", icon: Cookie },
                { name: "Eu tomo muito refrigerante", icon: Wine },
                { name: "Eu adoro comida salgada", icon: Utensils },
                { name: "Eu gosto de beliscar à noite", icon: Clock },
                { name: "Nenhum dos itens acima", icon: CheckCircle2 },
              ].map((item) => {
                const isSelected = (answers.badHabits || []).includes(item.name);
                const IconComp = item.icon;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => toggleBadHabit(item.name)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#F7EEEE] border-[#B77D82] shadow-xs"
                        : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[#B77D82] text-white" : "bg-[#F3EAE3] text-[#B77D82]"
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className={`text-xs sm:text-sm font-semibold ${isSelected ? "text-[#B77D82]" : "text-[#292321]"}`}>
                        {item.name}
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-[#B77D82] bg-[#B77D82] text-white" : "border-[#EADBCE]"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 15: ALTURA */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 15 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B77D82]">
                Medidas
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Qual é a sua altura?
              </h2>
              <p className="text-xs text-[#827B77]">
                Utilizada para o cálculo de proporção e biomecânica dos treinos.
              </p>
            </div>

            <div className="space-y-5 text-center py-2">
              <div className="inline-flex items-baseline gap-1 bg-[#FAF7F2] border border-[#EADBCE] px-6 py-4 rounded-3xl">
                <span className="text-4xl sm:text-5xl font-serif font-bold text-[#B77D82]">
                  {answers.heightCm || "--"}
                </span>
                <span className="text-sm font-bold text-[#827B77] uppercase">cm</span>
              </div>

              {/* Slider de rolagem suave */}
              <div className="space-y-2 max-w-sm mx-auto">
                <input
                  type="range"
                  min="130"
                  max="210"
                  step="1"
                  value={answers.heightCm || 165}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, heightCm: parseInt(e.target.value, 10) }))}
                  className="w-full accent-[#B77D82] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#827B77]">
                  <span>130 cm</span>
                  <span>170 cm</span>
                  <span>210 cm</span>
                </div>
              </div>

              {/* Entrada manual direta e acessível */}
              <div className="max-w-xs mx-auto text-left space-y-1 pt-2">
                <label htmlFor="heightInputManual" className="text-[11px] text-[#827B77] block text-center">
                  Ou digite sua altura exata:
                </label>
                <div className="relative">
                  <input
                    id="heightInputManual"
                    type="number"
                    min="120"
                    max="230"
                    placeholder="Ex: 165"
                    value={answers.heightCm || ""}
                    onChange={(e) => {
                      const v = e.target.value ? parseInt(e.target.value, 10) : undefined;
                      setAnswers((prev) => ({ ...prev, heightCm: v }));
                    }}
                    className="w-full text-center px-4 py-3 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] text-sm font-semibold text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#827B77]">
                    cm
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 16: PESO ATUAL E IMC */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 16 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B77D82]">
                Medidas
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Qual é o seu peso atual?
              </h2>
              <p className="text-xs text-[#827B77]">
                Seu peso é confidencial e ajuda a estimar o impacto articular nas aulas.
              </p>
            </div>

            <div className="space-y-4 text-center py-1">
              <div className="inline-flex items-baseline gap-1 bg-[#FAF7F2] border border-[#EADBCE] px-6 py-4 rounded-3xl">
                <span className="text-4xl sm:text-5xl font-serif font-bold text-[#B77D82]">
                  {answers.currentWeightKg || "--"}
                </span>
                <span className="text-sm font-bold text-[#827B77] uppercase">kg</span>
              </div>

              {/* Slider de rolagem */}
              <div className="space-y-2 max-w-sm mx-auto">
                <input
                  type="range"
                  min="40"
                  max="160"
                  step="0.5"
                  value={answers.currentWeightKg || 65}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, currentWeightKg: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-[#B77D82] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#827B77]">
                  <span>40 kg</span>
                  <span>100 kg</span>
                  <span>160 kg</span>
                </div>
              </div>

              {/* Entrada manual direta */}
              <div className="max-w-xs mx-auto text-left space-y-1">
                <label htmlFor="weightInputManual" className="text-[11px] text-[#827B77] block text-center">
                  Ou digite seu peso atual em kg:
                </label>
                <div className="relative">
                  <input
                    id="weightInputManual"
                    type="number"
                    min="30"
                    max="250"
                    step="0.1"
                    placeholder="Ex: 65.0"
                    value={answers.currentWeightKg || ""}
                    onChange={(e) => {
                      const v = e.target.value ? parseFloat(e.target.value) : undefined;
                      setAnswers((prev) => ({ ...prev, currentWeightKg: v }));
                    }}
                    className="w-full text-center px-4 py-3 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] text-sm font-semibold text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#827B77]">
                    kg
                  </span>
                </div>
              </div>

              {/* Bloco de IMC Atualizado em Tempo Real */}
              {calculatedBmi !== null ? (
                <div className="p-4 rounded-2xl bg-[#F7EEEE] border border-[#EBD6D5] text-left space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#827B77]">
                      Índice de Massa Corporal (IMC) estimado:
                    </span>
                    <span className="text-base font-bold text-[#B77D82]">{calculatedBmi}</span>
                  </div>
                  <div className="text-[11px] text-[#827B77] leading-relaxed">
                    Fórmula oficial da OMS: peso ÷ (altura × altura). O IMC é uma referência de planejamento físico e não constitui diagnóstico clínico individual.
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-[11px] text-[#827B77]">
                  Informe um peso válido para visualizar seu IMC em tempo real.
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 17: PESO DESEJADO */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 17 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B77D82]">
                Medidas
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Qual é o seu objetivo de peso?
              </h2>
              <p className="text-xs text-[#827B77]">
                Selecione o peso com o qual você se sentirá mais confortável e disposta.
              </p>
            </div>

            <div className="space-y-4 text-center py-1">
              <div className="inline-flex items-baseline gap-1 bg-[#FAF7F2] border border-[#EADBCE] px-6 py-4 rounded-3xl">
                <span className="text-4xl sm:text-5xl font-serif font-bold text-[#B77D82]">
                  {answers.targetWeightKg || "--"}
                </span>
                <span className="text-sm font-bold text-[#827B77] uppercase">kg</span>
              </div>

              {/* Slider de rolagem */}
              <div className="space-y-2 max-w-sm mx-auto">
                <input
                  type="range"
                  min="40"
                  max="160"
                  step="0.5"
                  value={answers.targetWeightKg || (answers.currentWeightKg ? answers.currentWeightKg - 3 : 60)}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, targetWeightKg: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-[#B77D82] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#827B77]">
                  <span>40 kg</span>
                  <span>100 kg</span>
                  <span>160 kg</span>
                </div>
              </div>

              {/* Entrada manual direta */}
              <div className="max-w-xs mx-auto text-left space-y-1">
                <label htmlFor="targetWeightManual" className="text-[11px] text-[#827B77] block text-center">
                  Ou digite seu peso objetivo em kg:
                </label>
                <div className="relative">
                  <input
                    id="targetWeightManual"
                    type="number"
                    min="30"
                    max="250"
                    step="0.1"
                    placeholder="Ex: 60.0"
                    value={answers.targetWeightKg || ""}
                    onChange={(e) => {
                      const v = e.target.value ? parseFloat(e.target.value) : undefined;
                      setAnswers((prev) => ({ ...prev, targetWeightKg: v }));
                    }}
                    className="w-full text-center px-4 py-3 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] text-sm font-semibold text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#827B77]">
                    kg
                  </span>
                </div>
              </div>

              {/* Comparativo de diferença calculado sem valores fictícios */}
              {weightDiff !== null && (
                <div className="p-4 rounded-2xl bg-[#F7EEEE] border border-[#EBD6D5] text-left space-y-1.5 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#827B77]">Variação em relação ao peso atual:</span>
                    <span className="font-bold text-[#B77D82] text-sm">
                      {weightDiff.diff > 0 ? `+${weightDiff.diff} kg` : `${weightDiff.diff} kg`}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#827B77]">
                    {weightDiff.diff < 0
                      ? `Meta de redução gradual de ${Math.abs(weightDiff.diff)} kg (${weightDiff.pct}% do peso atual), focando em consistência e fortalecimento.`
                      : weightDiff.diff > 0
                      ? `Meta de ganho de ${weightDiff.diff} kg com foco em massa muscular, postura e vitalidade.`
                      : "Meta voltada para manutenção do peso, tonificação e bem-estar geral."}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 18: NOME */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 18 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B77D82]">
                Personalização
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Qual é o seu nome?
              </h2>
              <p className="text-xs text-[#827B77]">
                Vamos personalizar todo o seu plano de treinos para você.
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={answers.name || ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Digite seu nome completo ou primeiro nome"
                className="w-full px-4 py-3.5 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] placeholder:text-[#827B77]/60 focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50"
                autoFocus
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 19: RESUMO DO NÍVEL FITNESS */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 19 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321] text-center">
              Resumo do seu nível fitness
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Personagem de corpo inteiro anexada */}
              <div className="rounded-2xl overflow-hidden border border-[#EADBCE] bg-[#FAF7F2] flex items-center justify-center p-2 max-h-72 sm:max-h-80">
                <img
                  src="/images/quiz/woman-standing.webp"
                  alt="Ilustração da aluna em corpo inteiro"
                  className="h-full w-auto object-contain max-h-64 sm:max-h-72"
                />
              </div>

              {/* Informações reais declaradas pela aluna */}
              <div className="space-y-3">
                {/* IMC Calculado */}
                {calculatedBmi !== null && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#827B77]">IMC Calculado:</span>
                      <span className="font-bold text-[#292321] text-sm">{calculatedBmi}</span>
                    </div>

                    {/* Escala Visual de IMC com ponteiro preciso */}
                    <div className="space-y-1 pt-1">
                      <div className="relative w-full h-2.5 rounded-full overflow-hidden bg-gradient-to-r from-blue-300 via-emerald-400 via-amber-400 to-rose-400">
                        {/* Marcador */}
                        <div
                          className="absolute top-0 bottom-0 w-1.5 bg-[#292321] rounded-full shadow-xs"
                          style={{
                            left: `${Math.min(96, Math.max(4, ((calculatedBmi - 15) / (35 - 15)) * 100))}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-[#827B77]">
                        <span>18.5</span>
                        <span>25.0</span>
                        <span>30.0</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBmiCategory(calculatedBmi).tone}`}>
                        {getBmiCategory(calculatedBmi).label}
                      </span>
                    </div>
                  </div>
                )}

                {/* Estilo de vida */}
                <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs flex justify-between">
                  <span className="text-[#827B77]">Estilo de vida:</span>
                  <span className="font-semibold text-[#292321]">{answers.dailyRoutine || "Não informado"}</span>
                </div>

                {/* Nível de atividade */}
                <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs flex justify-between">
                  <span className="text-[#827B77]">Nível de atividade:</span>
                  <span className="font-semibold text-[#292321]">{answers.activityLevel || "Não informado"}</span>
                </div>

                {/* Tipo de corpo */}
                <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs flex justify-between">
                  <span className="text-[#827B77]">Tipo de corpo:</span>
                  <span className="font-semibold text-[#292321]">{answers.bodyType || "Não informado"}</span>
                </div>
              </div>
            </div>

            {/* Fechamento respeitoso sobre IMC */}
            {calculatedBmi !== null && (
              <p className="text-[11px] text-[#827B77] bg-[#FAF7F2] p-3 rounded-xl border border-[#EADBCE] leading-relaxed">
                {getBmiCategory(calculatedBmi).description}
              </p>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 20: RITMO DESEJADO */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 20 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Com que rapidez você deseja atingir seu objetivo?
              </h2>
              <p className="text-xs sm:text-sm text-[#827B77]">
                Ajustaremos a experiência de acordo com suas preferências.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: "lento",
                  title: "Lentamente e com calma",
                  subtitle: "Foco total na adaptação suave, sem pressa",
                  icon: Leaf,
                },
                {
                  id: "moderado",
                  title: "Em um ritmo moderado",
                  subtitle: "Equilíbrio constante entre desafio e descanso",
                  icon: Compass,
                },
                {
                  id: "rapido",
                  title: "O mais rápido possível",
                  subtitle: "Dedicação máxima à consistência dos treinos",
                  icon: Zap,
                },
              ].map((item) => {
                const isSelected = answers.desiredPace === item.title;
                const IconComp = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, desiredPace: item.title }))}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-[#F7EEEE] border-[#B77D82] shadow-xs"
                        : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[#B77D82] text-white" : "bg-[#F3EAE3] text-[#B77D82]"
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <span className={`text-sm font-semibold ${isSelected ? "text-[#B77D82]" : "text-[#292321]"}`}>
                          {item.title}
                        </span>
                        <p className="text-xs text-[#827B77]">{item.subtitle}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-[#B77D82] bg-[#B77D82] text-white" : "border-[#EADBCE]"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4 fill-white text-[#B77D82]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-[#827B77] italic">
              * Sua escolha expressa sua preferência pessoal de dedicação e não constitui garantia médica de velocidade de resultados.
            </p>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 22: PLANO DE BEM-ESTAR */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 22 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1 text-center">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                O seu plano de bem-estar, tudo em um
              </h2>
              <p className="text-xs sm:text-sm text-[#827B77]">
                Preparado para {answers.name ? <strong>{answers.name}</strong> : "você"}, com foco em {answers.mainGoal || "sua saúde"}.
              </p>
            </div>

            {/* Marco de Acompanhamento de 2 meses */}
            <div className="p-4 rounded-2xl bg-[#F7EEEE] border border-[#EBD6D5] space-y-1 text-center">
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#B77D82] block">
                Marco de Acompanhamento da Rotina
              </span>
              <p className="text-base font-serif font-bold text-[#292321]">
                {followUpDateStr}
              </p>
              <p className="text-[11px] text-[#827B77]">
                Esta data é um marco de acompanhamento dos seus hábitos; não constitui promessa de data exata de conclusão.
              </p>
            </div>

            {/* Gráfico ilustrativo de acompanhamento */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#827B77]">Trajetória de Acompanhamento:</span>
                <span className="text-[11px] text-[#827B77] italic">Ilustrativo</span>
              </div>

              {/* Visual SVG limpo */}
              <div className="w-full h-32 flex items-center justify-center">
                <svg viewBox="0 0 320 90" className="w-full h-full">
                  <defs>
                    <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#B77D82" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#B77D82" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  {/* Linha guia suave */}
                  <path
                    d="M 30,65 Q 160,55 290,25"
                    fill="none"
                    stroke="url(#curveGradient)"
                    strokeWidth="3"
                    strokeDasharray="4 4"
                  />
                  {/* Ponto inicial */}
                  <circle cx="30" cy="65" r="5" fill="#B77D82" />
                  <text x="30" y="85" fontSize="10" fill="#827B77" textAnchor="middle">
                    {answers.currentWeightKg ? `${answers.currentWeightKg} kg (Hoje)` : "Início"}
                  </text>

                  {/* Ponto final objetivo */}
                  <circle cx="290" cy="25" r="6" fill="#B77D82" />
                  <text x="280" y="15" fontSize="10" fill="#B77D82" fontWeight="bold" textAnchor="middle">
                    {answers.targetWeightKg ? `${answers.targetWeightKg} kg (Meta)` : "Meta"}
                  </text>
                </svg>
              </div>

              <p className="text-[10px] text-[#827B77] text-center italic">
                * Gráfico ilustrativo para apoio ao acompanhamento de metas pessoais.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={startPlanCreation}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Avançar para Criação do Meu Plano</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 23: CRIAÇÃO DO PLANO (ANIMAÇÃO COM ACESSIBILIDADE) */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 23 && (
          <div
            className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-8 text-center space-y-6"
            aria-live="polite"
            role="status"
          >
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-full h-full rounded-full border-4 border-[#F3EAE3] border-t-[#B77D82] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#B77D82] animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Criando seu plano
              </h2>
              <p className="text-xs sm:text-sm text-[#827B77] min-h-[2.5rem]">
                {creationStepText}
              </p>
            </div>

            <div className="w-full h-2.5 bg-[#F3EAE3] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#B77D82] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${creationProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 24: PLANO PERSONALIZADO PRONTO */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 24 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#F7EEEE] text-[#B77D82] mb-1">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
                {answers.name ? `${answers.name}, seu plano personalizado está pronto!` : "Seu plano personalizado está pronto!"}
              </h1>
              <p className="text-xs sm:text-sm text-[#827B77]">
                Construído especialmente para seu objetivo de <strong>{answers.mainGoal || "saúde e bem-estar"}</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Personagem anexada de corpo inteiro */}
              <div className="rounded-2xl overflow-hidden border border-[#EADBCE] bg-[#FAF7F2] flex items-center justify-center p-2 max-h-72 sm:max-h-80">
                <img
                  src="/images/quiz/woman-standing.webp"
                  alt="Ilustração da personagem aluna da Vitta Pilates"
                  className="h-full w-auto object-contain max-h-64 sm:max-h-72"
                />
              </div>

              {/* Dados do plano estruturado */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs space-y-1">
                  <span className="text-[#827B77] block text-[11px]">Objetivo Principal:</span>
                  <p className="font-semibold text-[#292321] text-sm">{answers.mainGoal || "Equilíbrio e Saúde"}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs space-y-1">
                  <span className="text-[#827B77] block text-[11px]">Marco de Acompanhamento:</span>
                  <p className="font-semibold text-[#292321] text-sm">{followUpDateStr}</p>
                </div>

                {/* Gráfico ilustrativo construído com dados respondidos */}
                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[#827B77] text-[11px]">Metas em kg:</span>
                    <span className="text-[10px] text-[#827B77] italic">Ilustrativo</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold text-[#292321]">
                    <span>Partida: {answers.currentWeightKg ? `${answers.currentWeightKg} kg` : "--"}</span>
                    <span>→</span>
                    <span className="text-[#B77D82]">Alvo: {answers.targetWeightKg ? `${answers.targetWeightKg} kg` : "--"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(25)}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>VER MEU PLANO E ACESSAR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 25: OFERTA FINAL E CHECKOUT */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 25 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B77D82]">
                Acesso Imediato
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
                Comece sua prática hoje
              </h2>
              <p className="text-xs sm:text-sm text-[#827B77]">
                Tenha acesso ao método Vitta Pilates e ao seu plano personalizado.
              </p>
            </div>

            {/* Cartão de Preço Real Oficial */}
            <div className="p-6 rounded-3xl bg-[#FAF7F2] border border-[#EADBCE] text-center space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#827B77] uppercase tracking-wider block">
                  Plano Mensal Vitta Pilates
                </span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-sm font-bold text-[#827B77]">R$</span>
                  <span className="text-4xl sm:text-5xl font-serif font-bold text-[#B77D82]">
                    49,90
                  </span>
                  <span className="text-xs text-[#827B77]">/mês</span>
                </div>
              </div>

              {/* Benefícios permitidos: Garantia de 7 dias e Atualizações mensais */}
              <div className="space-y-2.5 pt-2 text-left max-w-xs mx-auto border-t border-[#EADBCE] pt-4">
                <div className="flex items-center gap-2.5 text-xs text-[#292321]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Garantia incondicional de 7 dias</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#292321]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Atualizações mensais</strong> de conteúdo
                  </span>
                </div>
              </div>
            </div>

            {/* Botão de Chamada para Ação / Checkout */}
            <div className="pt-2 space-y-2">
              {checkoutUrl ? (
                <a
                  href={`${checkoutUrl}${checkoutUrl.includes("?") ? "&" : "?"}sck=${encodeURIComponent(sessionId)}${
                    answers.name ? `&name=${encodeURIComponent(answers.name)}` : ""
                  }`}
                  className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-semibold text-sm tracking-wide shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <Lock className="w-4 h-4" />
                  <span>OBTER MEU PLANO PERSONALIZADO</span>
                </a>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="w-full py-4 px-6 rounded-full bg-[#B77D82]/50 text-white font-semibold text-sm tracking-wide shadow-sm cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>OBTER MEU PLANO PERSONALIZADO</span>
                  </button>
                  <p className="text-[11px] text-center text-[#827B77]">
                    O link de checkout está em configuração pela administração da Vitta Pilates.
                  </p>
                </div>
              )}

              <Link
                href="/login"
                className="block text-center py-2 text-xs text-[#827B77] hover:text-[#292321] transition"
              >
                Já possui uma conta? Fazer login
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* RODAPÉ DO QUIZ */}
      {/* ============================================================ */}
      <footer className="max-w-xl mx-auto w-full text-center py-2 text-[11px] text-[#827B77]">
        Vitta Pilates • Respeito à sua autonomia e ao seu ritmo corporal.
      </footer>
    </div>
  );
}
