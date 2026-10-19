"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SiteSettings, QuizAnswers } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  Flame,
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
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
  Feather,
  Scale,
  TrendingDown,
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
  weightGoal: "",
  targetWeightKg: undefined,
  bmi: undefined,
  desiredPace: "",
};

export function QuizClient({ siteSettings }: QuizClientProps) {
  const router = useRouter();

  // 1. Identificador de sessão isolado
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

  // 2. Respostas recuperadas do armazenamento de sessão efêmero (sessionStorage)
  const [answers, setAnswers] = useState<QuizAnswers>(() => {
    if (typeof window === "undefined") return INITIAL_ANSWERS;
    try {
      const sid = sessionStorage.getItem("vitta_quiz_session_id");
      if (sid) {
        const saved = sessionStorage.getItem(`vitta_quiz_data_${sid}`) || localStorage.getItem(`vitta_quiz_data_${sid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Limpa do localStorage legado por segurança
          try { localStorage.removeItem(`vitta_quiz_data_${sid}`); } catch {}
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

  // 3. Etapa atual:
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    try {
      const sid = sessionStorage.getItem("vitta_quiz_session_id");
      if (sid) {
        const saved = sessionStorage.getItem(`vitta_quiz_data_${sid}`) || localStorage.getItem(`vitta_quiz_data_${sid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.step === "number" && parsed.step >= 1 && parsed.step <= 24) {
            return parsed.step === 22 ? 21 : parsed.step;
          }
        }
      }
    } catch {
      // Fallback
    }
    return 1;
  });

  // Campos de dia, mês e ano
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

  // Estado da etapa 22 (Criando seu plano - indicador circular)
  const [creationProgress, setCreationProgress] = useState(8);
  const [creationPhaseIndex, setCreationPhaseIndex] = useState(0);

  // FAQ accordion aberto/fechado na página de vendas final
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Pré-carregamento dinâmico da imagem da próxima etapa para transições sem atraso perceptível
  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextStepImages: Record<number, string[]> = {
      1: ["/images/quiz/pilates-women-social.webp"],
      2: ["/images/quiz/pilates-women-social.webp"],
      6: ["/images/quiz/woman-standing-transparent.webp"],
      7: [
        "/images/quiz/body-retangular-transparent.webp",
        "/images/quiz/body-ampulheta-transparent.webp",
        "/images/quiz/body-pera-transparent.webp",
        "/images/quiz/body-circular-transparent.webp",
      ],
      8: [
        "/images/quiz/goal-magro-transparent.webp",
        "/images/quiz/goal-tonificado-transparent.webp",
        "/images/quiz/goal-curvas-transparent.webp",
        "/images/quiz/goal-tamanho-menor-transparent.webp",
      ],
      18: ["/images/quiz/woman-standing-transparent.webp"],
      19: ["/images/quiz/woman-standing-transparent.webp"],
      22: [
        "/images/quiz/woman-standing-transparent.webp",
        "/images/quiz/vitta-phones-mockup.webp",
      ],
      23: ["/images/quiz/vitta-phones-mockup.webp"],
    };

    const urlsToPreload = nextStepImages[currentStep];
    if (urlsToPreload && urlsToPreload.length > 0) {
      urlsToPreload.forEach((url) => {
        const img = new Image();
        img.src = url;
      });
    }
  }, [currentStep]);

  // Salvar no sessionStorage efêmero (limpo automaticamente ao fechar a aba)
  useEffect(() => {
    if (!sessionId) return;
    try {
      sessionStorage.setItem(
        `vitta_quiz_data_${sessionId}`,
        JSON.stringify({ step: currentStep, answers, updatedAt: new Date().toISOString() })
      );
      // Garante remoção de resquícios de localStorage
      try { localStorage.removeItem(`vitta_quiz_data_${sessionId}`); } catch {}
    } catch (e) {
      console.warn("Aviso ao salvar sessão no sessionStorage:", e);
    }
  }, [answers, currentStep, sessionId]);

  // Atualização direta de data de nascimento
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

  // Diferença de peso e percentual (com suporte a manutenção de peso)
  const weightDiff = useMemo(() => {
    if (!answers.currentWeightKg) return null;
    if (answers.weightGoal === "manter") {
      return { diff: 0, pct: 0, isMaintenance: true };
    }
    if (!answers.targetWeightKg) return null;
    const diff = Math.round((answers.targetWeightKg - answers.currentWeightKg) * 10) / 10;
    const pct = Math.round((Math.abs(diff) / answers.currentWeightKg) * 1000) / 10;
    return { diff, pct, isMaintenance: false };
  }, [answers.currentWeightKg, answers.targetWeightKg, answers.weightGoal]);

  // Data de acompanhamento de 2 meses calculada a cada renderização
  const followUpDateStr = useMemo(() => {
    return getTwoMonthsFollowUpDate();
  }, []);

  // Sincronizar com o servidor assincronamente ao gerar o plano
  const syncWithServer = async () => {
    if (!sessionId) return;
    try {
      const finalTargetWeight =
        answers.weightGoal === "manter" ? answers.currentWeightKg : answers.targetWeightKg;
      await fetch("/api/quiz/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          answers: {
            ...answers,
            targetWeightKg: finalTargetWeight,
            bmi: calculatedBmi || undefined,
          },
          generatedPlan: {
            userName: answers.name || "Aluna",
            mainGoal: answers.mainGoal,
            targetDate: followUpDateStr,
            currentWeight: answers.currentWeightKg,
            targetWeight: finalTargetWeight,
            bmi: calculatedBmi,
          },
        }),
      });
    } catch (e) {
      console.warn("Aviso na sincronização segura com Supabase:", e);
    }
  };

  // Animação de criação de plano (Etapa 22)
  const startPlanCreation = () => {
    setCurrentStep(22);
    setCreationProgress(8);
    setCreationPhaseIndex(0);

    setTimeout(() => {
      setCreationProgress(42);
      setCreationPhaseIndex(1);
    }, 700);

    setTimeout(() => {
      setCreationProgress(84);
      setCreationPhaseIndex(2);
    }, 1400);

    setTimeout(() => {
      setCreationProgress(100);
      syncWithServer();
      setTimeout(() => {
        setCurrentStep(23); // Plano pronto
      }, 500);
    }, 2200);
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
        return Boolean(answers.weightGoal);
      case 18:
        return Boolean(answers.targetWeightKg && answers.targetWeightKg >= 30 && answers.targetWeightKg <= 250);
      case 19:
        return Boolean(answers.name && answers.name.trim().length >= 2);
      case 20:
        return true;
      case 21:
        return Boolean(answers.desiredPace);
      case 22:
        return false;
      case 23:
        return true;
      case 24:
        return true;
      default:
        return true;
    }
  }, [currentStep, answers, currentAge]);

  const handleNext = () => {
    if (!canAdvance) return;
    if (currentStep === 17) {
      if (answers.weightGoal === "manter") {
        setAnswers((prev) => ({ ...prev, targetWeightKg: prev.currentWeightKg }));
        setCurrentStep(19); // Pula direto para o Nome (etapa 19)
        return;
      }
      setCurrentStep(18); // Avança para o Peso Desejado (etapa 18)
      return;
    }
    if (currentStep === 21) {
      startPlanCreation(); // Inicia criação de plano (etapa 22)
      return;
    }
    if (currentStep < 24) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 19 && answers.weightGoal === "manter") {
      setCurrentStep(17); // Volta direto para a pergunta de objetivo do peso
      return;
    }
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.push("/login");
    }
  };

  // Opções para dia, mês e ano
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

  // Toggle de hábitos com regra exclusiva para "Nenhum dos itens acima"
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

  // Progresso relativo na barra horizontal (sem texto de etapa ou porcentagem no cabeçalho)
  // Ramificação inteligente: para quem mantém o peso, o total de etapas é 23; para quem perde, 24.
  const progressRatio = useMemo(() => {
    if (answers.weightGoal === "manter") {
      const effectiveStep = currentStep > 17 ? currentStep - 1 : currentStep;
      return Math.min(100, Math.round((effectiveStep / 23) * 100));
    }
    return Math.min(100, Math.round((currentStep / 24) * 100));
  }, [currentStep, answers.weightGoal]);

  // URL do checkout configurada (com link oficial da Cakto como valor garantido)
  const checkoutUrl =
    process.env.NEXT_PUBLIC_CHECKOUT_URL || "https://pay.cakto.com.br/weaj7wx_1206702";

  // Perguntas Frequentes (FAQ) da Vitta Pilates
  const faqs = [
    {
      q: "O que está incluído no acesso?",
      a: "Acesso completo e ilimitado a todas as aulas de Pilates organizadas por categorias, sequências guiadas do iniciante ao avançado, direcionamento personalizado pelo quiz e disponibilidade total pelo celular, tablet ou computador.",
    },
    {
      q: "Como acesso a área da aluna após a compra?",
      a: "Imediatamente após a confirmação do pagamento, você recebe um e-mail com seu link exclusivo para definir a senha da sua conta e começar sua prática sem espera.",
    },
    {
      q: "Como funciona a garantia de 7 dias?",
      a: "Você tem 7 dias corridos para experimentar o método e praticar as aulas. Se por qualquer motivo não se adaptar, basta solicitar o reembolso que devolvemos 100% do valor pago, sem burocracia.",
    },
    {
      q: "O plano é personalizado?",
      a: "Sim. Suas respostas sobre objetivo, rotina e biotipo são utilizadas para indicar os treinos mais seguros e eficazes para o seu momento corporal, respeitando sempre o seu ritmo.",
    },
    {
      q: "O conteúdo recebe atualizações?",
      a: "Sim! Nossa grade de aulas recebe atualizações mensais de conteúdo para manter sua prática dinâmica, motivadora e consistente.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#292321] flex flex-col justify-between p-4 sm:p-6 selection:bg-[#EBD6D5] selection:text-[#292321]">
      {/* ============================================================ */}
      {/* CABEÇALHO CONFORME REGRA: LOGO + BARRA HORIZONTAL PURA */}
      {/* (Sem número de etapa, sem total de etapas, sem %) */}
      {/* ============================================================ */}
      <header className="max-w-xl mx-auto w-full pt-1 pb-3 flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-3">
          {currentStep > 1 && currentStep !== 22 ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Voltar para a etapa anterior"
              className="inline-flex items-center gap-1 text-xs text-[#827B77] hover:text-[#292321] transition font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#F3EAE3] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <div className="w-16" />
          )}

          {/* Logomarca oficial da Vitta Pilates (igual à tela de login) */}
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

          <div className="w-16" />
        </div>

        {/* Barra horizontal de progresso simples (sem texto ou %) */}
        {currentStep > 1 && currentStep !== 22 && currentStep !== 24 && (
          <div className="w-full h-1.5 bg-[#F3EAE3] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#B77D82] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressRatio}%` }}
            />
          </div>
        )}
      </header>

      {/* ============================================================ */}
      {/* CONTEÚDO PRINCIPAL DO QUIZ */}
      {/* ============================================================ */}
      <main className="max-w-xl mx-auto w-full my-auto py-2 sm:py-4">
        {/* ------------------------------------------------------------ */}
        {/* ETAPA 1: ABERTURA (ILUSTRAÇÃO PILATES TRANSPARENTE AMPLIADA) */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 1 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 text-center space-y-6">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321] leading-tight">
              Vamos montar seu Plano Personalizado
            </h1>

            {/* Ilustração horizontal de mulheres adultas praticando Pilates em WebP de alta qualidade com presença visual ampliada */}
            <div className="w-full max-w-lg mx-auto flex items-center justify-center py-2 min-h-[220px] sm:min-h-[280px]">
              <img
                src="/images/quiz/pilates-women-opening.webp"
                alt="Mulheres adultas praticando Pilates em movimento suave"
                width={860}
                height={573}
                fetchPriority="high"
                decoding="async"
                className="w-full h-auto object-contain max-h-64 sm:max-h-76 drop-shadow-sm transition-transform duration-300"
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
        {/* ETAPA 2: ANIVERSÁRIO */}
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

              {/* Idade calculada dinamicamente */}
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
        {/* ETAPA 3: PROVA SOCIAL (GRUPO DE MULHERES AMPLIADO) */}
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

            {/* Ilustração de mulheres adultas em WebP com escala expressiva igual à BetterMe */}
            <div className="w-full max-w-lg mx-auto flex items-center justify-center py-2 min-h-[240px] sm:min-h-[300px]">
              <img
                src="/images/quiz/pilates-women-social.webp"
                alt="Grupo de mulheres reais praticando Vitta Pilates"
                width={736}
                height={552}
                decoding="async"
                className="w-full h-auto object-contain max-h-68 sm:max-h-80 drop-shadow-sm transition-transform duration-300"
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
                  subtitle: "Movimente-se com foco no seu objetivo de emagrecimento.",
                  icon: Flame,
                },
                {
                  id: "melhorar-postura",
                  title: "Melhorar a postura",
                  subtitle: "Desenvolva consciência corporal e uma postura mais confortável no dia a dia.",
                  icon: Sparkles,
                },
                {
                  id: "diminuir-dores",
                  title: "Diminuir dores corporais",
                  subtitle: "Pratique movimentos suaves com foco no conforto e no bem-estar corporal.",
                  icon: Feather,
                },
                {
                  id: "manter-forma",
                  title: "Manter a forma",
                  subtitle: "Mantenha uma rotina de movimento no seu ritmo.",
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
        {/* ETAPA 5: PESO IDEAL ANTERIOR */}
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
        {/* ETAPA 6: TELA MOTIVACIONAL */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 6 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
              Sabemos como fazer isso acontecer!
            </h2>
            <p className="text-sm text-[#292321] leading-relaxed max-w-md mx-auto">
              A vida tem muitos desafios, mas sua rotina de movimento não precisa ser mais um deles.
            </p>
            <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed max-w-md mx-auto">
              Os treinos da Vitta Pilates ajudam você a avançar no seu próprio ritmo.
            </p>

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
        {/* ETAPA 7: ÁREA QUE PRECISA DE ATENÇÃO (LADO A LADO AMPLIADO) */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 7 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-5 sm:p-8 space-y-5">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Qual área precisa de mais atenção?
            </h2>

            {/* Personagem com presença visual ampliada proporcional à referência BetterMe */}
            <div className="grid grid-cols-12 gap-3 sm:gap-6 items-center">
              <div className="col-span-5 flex items-center justify-center h-full min-h-[260px] sm:min-h-[340px]">
                <img
                  src="/images/quiz/woman-standing-transparent.webp"
                  alt="Personagem feminina de corpo inteiro"
                  width={245}
                  height={560}
                  decoding="async"
                  className="w-full h-auto max-h-72 sm:max-h-88 object-contain drop-shadow-sm transition-transform duration-300"
                />
              </div>

              <div className="col-span-7 space-y-2">
                {["Braços", "Peito", "Barriga", "Glúteos", "Pernas"].map((area) => {
                  const isSelected = answers.targetArea === area;
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, targetArea: area }))}
                      className={`w-full p-2.5 sm:p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-[#F7EEEE] border-[#B77D82] shadow-xs"
                          : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                      }`}
                    >
                      <span className={`text-xs sm:text-sm font-semibold ${isSelected ? "text-[#B77D82]" : "text-[#292321]"}`}>
                        {area}
                      </span>
                      <div
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? "border-[#B77D82] bg-[#B77D82] text-white" : "border-[#EADBCE]"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white text-[#B77D82]" />}
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
        {/* ETAPA 8: TIPO DE CORPO ATUAL (WEBP AMPLIADO) */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 8 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-5 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Qual é o seu tipo de corpo?
            </h2>

            <div className="grid grid-cols-2 gap-3.5 sm:gap-5">
              {[
                { id: "Retangular", name: "Retangular", img: "/images/quiz/body-retangular-transparent.webp" },
                { id: "Ampulheta", name: "Ampulheta", img: "/images/quiz/body-ampulheta-transparent.webp" },
                { id: "Pêra", name: "Pêra", img: "/images/quiz/body-pera-transparent.webp" },
                { id: "Circular", name: "Circular", img: "/images/quiz/body-circular-transparent.webp" },
              ].map((bt) => {
                const isSelected = answers.bodyType === bt.name;
                return (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, bodyType: bt.name }))}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-center transition flex flex-col items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#F7EEEE] border-[#B77D82] shadow-sm ring-2 ring-[#B77D82]/40"
                        : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                    }`}
                  >
                    <div className="w-full aspect-[3/4] max-h-52 flex items-center justify-center mb-1.5">
                      <img
                        src={bt.img}
                        alt={`Tipo de corpo ${bt.name}`}
                        width={245}
                        height={326}
                        decoding="async"
                        className="w-full h-full object-contain drop-shadow-xs transition-transform duration-200"
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
        {/* ETAPA 9: FORMATO DESEJADO (WEBP AMPLIADO) */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 9 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-5 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Qual é o formato de corpo que você deseja alcançar?
            </h2>

            <div className="grid grid-cols-2 gap-3.5 sm:gap-5">
              {[
                { id: "Magro", name: "Magro", img: "/images/quiz/goal-magro-transparent.webp" },
                { id: "Tonificado", name: "Tonificado", img: "/images/quiz/goal-tonificado-transparent.webp" },
                { id: "Com curvas", name: "Com curvas", img: "/images/quiz/goal-curvas-transparent.webp" },
                { id: "Um tamanho menor", name: "Um tamanho menor", img: "/images/quiz/goal-tamanho-menor-transparent.webp" },
              ].map((gt) => {
                const isSelected = answers.desiredBodyShape === gt.name;
                return (
                  <button
                    key={gt.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, desiredBodyShape: gt.name }))}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-center transition flex flex-col items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#F7EEEE] border-[#B77D82] shadow-sm ring-2 ring-[#B77D82]/40"
                        : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                    }`}
                  >
                    <div className="w-full aspect-[3/4] max-h-52 flex items-center justify-center mb-1.5">
                      <img
                        src={gt.img}
                        alt={`Formato desejado ${gt.name}`}
                        width={245}
                        height={326}
                        decoding="async"
                        className="w-full h-full object-contain drop-shadow-xs transition-transform duration-200"
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
        {/* ETAPA 10: ROTINA */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 10 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Como é o seu dia normalmente?
            </h2>

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
        {/* ETAPA 11: ENERGIA */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 11 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Como são seus níveis de energia durante o dia?
            </h2>

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
        {/* ETAPA 12: ATIVIDADE */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 12 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Quão ativa você está?
            </h2>

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
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Quanto você dorme?
            </h2>

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
        {/* ETAPA 14: HÁBITOS */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 14 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
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
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Qual é a sua altura?
            </h2>

            <div className="space-y-5 text-center py-2">
              <div className="inline-flex items-baseline gap-1 bg-[#FAF7F2] border border-[#EADBCE] px-6 py-4 rounded-3xl">
                <span className="text-4xl sm:text-5xl font-serif font-bold text-[#B77D82]">
                  {answers.heightCm || "--"}
                </span>
                <span className="text-sm font-bold text-[#827B77] uppercase">cm</span>
              </div>

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
        {/* ETAPA 16: PESO ATUAL */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 16 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Qual é o seu peso atual?
            </h2>

            <div className="space-y-4 text-center py-1">
              <div className="inline-flex items-baseline gap-1 bg-[#FAF7F2] border border-[#EADBCE] px-6 py-4 rounded-3xl">
                <span className="text-4xl sm:text-5xl font-serif font-bold text-[#B77D82]">
                  {answers.currentWeightKg || "--"}
                </span>
                <span className="text-sm font-bold text-[#827B77] uppercase">kg</span>
              </div>

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

              {/* Bloco de IMC */}
              {calculatedBmi !== null && (
                <div className="p-4 rounded-2xl bg-[#F7EEEE] border border-[#EBD6D5] text-left space-y-1.5 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#827B77]">
                      Índice de Massa Corporal (IMC) atualizado:
                    </span>
                    <span className="text-base font-bold text-[#B77D82]">{calculatedBmi}</span>
                  </div>
                  <p className="text-[11px] text-[#827B77]">
                    Parâmetro de referência da OMS: peso ÷ (altura × altura). Não constitui avaliação clínica individual.
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
        {/* ETAPA 17: NOVO - QUAL É O SEU OBJETIVO PARA O SEU PESO? */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 17 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Qual é o seu objetivo para o seu peso?
              </h2>
              <p className="text-xs sm:text-sm text-[#827B77]">
                Vamos adaptar seu plano ao que você deseja alcançar.
              </p>
            </div>

            <div className="space-y-3.5">
              {[
                {
                  id: "manter",
                  title: "Quero manter meu peso atual",
                  subtitle: "Quero cuidar do meu bem-estar e manter meu peso como está.",
                  icon: Scale,
                },
                {
                  id: "perder",
                  title: "Quero perder peso",
                  subtitle: "Quero definir um peso desejado e avançar no meu ritmo.",
                  icon: TrendingDown,
                },
              ].map((opt) => {
                const isSelected = answers.weightGoal === opt.id;
                const IconComp = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, weightGoal: opt.id }))}
                    className={`w-full p-4.5 rounded-2xl border text-left transition flex items-center justify-between gap-3.5 cursor-pointer ${
                      isSelected
                        ? "bg-[#F7EEEE] border-[#B77D82] shadow-xs ring-1 ring-[#B77D82]"
                        : "bg-[#FFFFFF] border-[#EADBCE] hover:bg-[#FAF7F2] hover:border-[#B77D82]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition ${
                          isSelected ? "bg-[#B77D82] text-white" : "bg-[#F3EAE3] text-[#B77D82]"
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className={`text-sm font-semibold ${isSelected ? "text-[#B77D82]" : "text-[#292321]"}`}>
                          {opt.title}
                        </p>
                        <p className="text-xs text-[#827B77] leading-relaxed">{opt.subtitle}</p>
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
        {/* ETAPA 18: PESO DESEJADO (EXIBIDO SOMENTE SE "QUERO PERDER PESO") */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 18 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Qual é o seu objetivo de peso?
            </h2>

            <div className="space-y-4 text-center py-1">
              <div className="inline-flex items-baseline gap-1 bg-[#FAF7F2] border border-[#EADBCE] px-6 py-4 rounded-3xl">
                <span className="text-4xl sm:text-5xl font-serif font-bold text-[#B77D82]">
                  {answers.targetWeightKg || "--"}
                </span>
                <span className="text-sm font-bold text-[#827B77] uppercase">kg</span>
              </div>

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

              {/* Diferença calculada em relação ao peso atual */}
              {weightDiff !== null && (
                <div className="p-4 rounded-2xl bg-[#F7EEEE] border border-[#EBD6D5] text-left space-y-1 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#827B77]">Variação em relação ao peso atual:</span>
                    <span className="font-bold text-[#B77D82] text-sm">
                      {weightDiff.diff > 0 ? `+${weightDiff.diff} kg` : `${weightDiff.diff} kg`}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#827B77]">
                    {weightDiff.diff < 0
                      ? `Meta pessoal de redução de ${Math.abs(weightDiff.diff)} kg (${weightDiff.pct}% do peso atual), focando em consistência e fortalecimento.`
                      : weightDiff.diff > 0
                      ? `Meta de ganho de ${weightDiff.diff} kg para fortalecimento e postura.`
                      : "Meta voltada para manutenção do peso, tonificação e bem-estar."}
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
        {/* ETAPA 19: NOME */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 19 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Qual é o seu nome?
            </h2>

            <div className="space-y-2">
              <input
                type="text"
                value={answers.name || ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Digite seu nome"
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
        {/* ETAPA 20: RESUMO DO NÍVEL FITNESS (LADO A LADO AMPLIADO) */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 20 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-5 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321] text-center">
              Resumo do seu nível fitness
            </h2>

            {/* Personagem com transparência real lado a lado com informações no celular e computador */}
            <div className="grid grid-cols-12 gap-3 sm:gap-6 items-center">
              <div className="col-span-5 flex items-center justify-center h-full min-h-[260px] sm:min-h-[340px]">
                <img
                  src="/images/quiz/woman-standing-transparent.webp"
                  alt="Personagem feminina de corpo inteiro"
                  width={245}
                  height={560}
                  decoding="async"
                  className="w-full h-auto max-h-72 sm:max-h-88 object-contain drop-shadow-sm transition-transform duration-300"
                />
              </div>

              <div className="col-span-7 space-y-2 sm:space-y-3">
                {calculatedBmi !== null && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#827B77]">IMC Calculado:</span>
                      <span className="font-bold text-[#292321] text-sm">{calculatedBmi}</span>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="relative w-full h-2.5 rounded-full overflow-hidden bg-gradient-to-r from-blue-300 via-emerald-400 via-amber-400 to-rose-400">
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

                <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs flex justify-between">
                  <span className="text-[#827B77]">Estilo de vida:</span>
                  <span className="font-semibold text-[#292321]">{answers.dailyRoutine || "Não informado"}</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs flex justify-between">
                  <span className="text-[#827B77]">Nível de atividade:</span>
                  <span className="font-semibold text-[#292321]">{answers.activityLevel || "Não informado"}</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs flex justify-between">
                  <span className="text-[#827B77]">Tipo de corpo:</span>
                  <span className="font-semibold text-[#292321]">{answers.bodyType || "Não informado"}</span>
                </div>
              </div>
            </div>

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
        {/* ETAPA 21: RITMO */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 21 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
              Com que rapidez você deseja atingir seu objetivo?
            </h2>

            <div className="space-y-3">
              {[
                {
                  id: "lento",
                  title: "Lentamente e com calma",
                  subtitle: "Foco na adaptação gradual e sem pressa",
                  icon: Leaf,
                },
                {
                  id: "moderado",
                  title: "Em um ritmo moderado",
                  subtitle: "Equilíbrio constante entre prática e descanso",
                  icon: Compass,
                },
                {
                  id: "rapido",
                  title: "O mais rápido possível",
                  subtitle: "Dedicação máxima à frequência dos treinos",
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
              * Sua escolha expressa sua preferência pessoal de dedicação, sem prometer velocidade ou resultados clínicos.
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
        {/* ETAPA 22: CRIANDO SEU PLANO (INDICADOR CIRCULAR COM %) */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 22 && (
          <div
            className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-8 text-center space-y-6"
            aria-live="polite"
            role="status"
          >
            {/* Indicador circular de porcentagem */}
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#F3EAE3"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#B77D82"
                  strokeWidth="8"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * creationProgress) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-serif font-bold text-[#292321]">
                  {creationProgress}%
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292321]">
                Criando seu plano
              </h2>
            </div>

            {/* Três mensagens de adaptação honesta */}
            <div className="space-y-3 max-w-sm mx-auto text-left pt-2">
              <div className={`flex items-center gap-3 text-xs transition ${creationPhaseIndex >= 0 ? "text-[#292321] font-semibold" : "text-[#827B77]/60"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${creationPhaseIndex >= 0 ? "bg-[#B77D82] text-white" : "bg-[#F3EAE3] text-[#827B77]"}`}>
                  ✓
                </div>
                <span>Analisando seu perfil</span>
              </div>

              <div className={`flex items-center gap-3 text-xs transition ${creationPhaseIndex >= 1 ? "text-[#292321] font-semibold" : "text-[#827B77]/60"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${creationPhaseIndex >= 1 ? "bg-[#B77D82] text-white" : "bg-[#F3EAE3] text-[#827B77]"}`}>
                  ✓
                </div>
                <span>Adaptando o plano à sua rotina</span>
              </div>

              <div className={`flex items-center gap-3 text-xs transition ${creationPhaseIndex >= 2 ? "text-[#292321] font-semibold" : "text-[#827B77]/60"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${creationPhaseIndex >= 2 ? "bg-[#B77D82] text-white" : "bg-[#F3EAE3] text-[#827B77]"}`}>
                  ✓
                </div>
                <span>Personalizando sua experiência com base nas respostas</span>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 23: PLANO PRONTO (LADO A LADO AMPLIADO) */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 23 && (
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-5 sm:p-8 space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
                {answers.name ? `${answers.name}, seu plano personalizado está pronto!` : "Seu plano personalizado está pronto!"}
              </h1>
            </div>

            {/* Personagem aluna da Vitta Pilates lado a lado no celular e computador */}
            <div className="grid grid-cols-12 gap-3 sm:gap-6 items-center">
              <div className="col-span-5 flex items-center justify-center h-full min-h-[260px] sm:min-h-[340px]">
                <img
                  src="/images/quiz/woman-standing-transparent.webp"
                  alt="Personagem aluna da Vitta Pilates"
                  width={245}
                  height={560}
                  decoding="async"
                  className="w-full h-auto max-h-72 sm:max-h-88 object-contain drop-shadow-sm transition-transform duration-300"
                />
              </div>

              <div className="col-span-7 space-y-2.5 sm:space-y-3">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs space-y-0.5 sm:space-y-1">
                  <span className="text-[#827B77] block text-[10px] sm:text-[11px]">Objetivo Principal:</span>
                  <p className="font-semibold text-[#292321] text-xs sm:text-sm">{answers.mainGoal || "Equilíbrio e Saúde"}</p>
                </div>

                {/* Trajetória ilustrativa adaptada para Manter ou Perder peso */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[#827B77] text-[10px] sm:text-[11px] font-semibold">Trajetória Ilustrativa:</span>
                    <span className="text-[9px] sm:text-[10px] text-[#827B77] italic">
                      {answers.weightGoal === "manter" ? "Manutenção" : "Acompanhamento"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-semibold text-[#292321] pt-1 text-[11px] sm:text-xs">
                    <span>Partida: {answers.currentWeightKg ? `${answers.currentWeightKg} kg` : "--"}</span>
                    <span>→</span>
                    <span className="text-[#B77D82]">
                      {answers.weightGoal === "manter"
                        ? `Alvo: ${answers.currentWeightKg || "--"} kg (Manutenção)`
                        : `Alvo: ${answers.targetWeightKg ? `${answers.targetWeightKg} kg` : "--"}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(24)}
                className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-semibold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>VER MEU PLANO E ACESSAR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ETAPA 24: PÁGINA DE VENDAS FINAL (COMPLETA) */}
        {/* ------------------------------------------------------------ */}
        {currentStep === 24 && (
          <div className="space-y-6 animate-fade-in">
            {/* Título Principal */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321] leading-tight">
                Comece a praticar seu plano personalizado hoje
              </h1>
              <p className="text-xs sm:text-sm text-[#827B77] max-w-md mx-auto">
                Acesso imediato às suas aulas recomendadas na plataforma Vitta Pilates pelo celular ou computador.
              </p>
            </div>

            {/* Imagem de Destaque: Mockup real dos 3 smartphones com o app Vitta Pilates */}
            <div className="w-full rounded-3xl overflow-hidden border border-[#EADBCE] bg-[#FAF7F2] shadow-sm">
              <img
                src="/images/quiz/vitta-phones-mockup.webp"
                alt="Experiência da aluna Vitta Pilates em celular"
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Seção 1: Card de Oferta Oficial */}
            <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 text-center space-y-5">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#827B77] uppercase tracking-wider block">
                  Acesso Completo ao Plano Personalizado
                </span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-sm font-bold text-[#827B77]">R$</span>
                  <span className="text-4xl sm:text-5xl font-serif font-bold text-[#B77D82]">
                    47,90
                  </span>
                  <span className="text-xs text-[#827B77]">/mês</span>
                </div>
              </div>

              {/* Benefícios Permitidos */}
              <div className="space-y-2.5 max-w-sm mx-auto text-left pt-2 border-t border-[#EADBCE] pt-4">
                <div className="flex items-center gap-2.5 text-xs text-[#292321]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Garantia incondicional de 7 dias</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#292321]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Atualizações mensais</strong> de conteúdo e novas aulas
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#292321]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Acesso completo no celular, tablet e computador
                  </span>
                </div>
              </div>

              {/* Botão de Chamada para Ação */}
              <div className="pt-2">
                {checkoutUrl ? (
                  <a
                    href={`${checkoutUrl}${checkoutUrl.includes("?") ? "&" : "?"}sck=${encodeURIComponent(sessionId)}${
                      answers.name ? `&name=${encodeURIComponent(answers.name)}` : ""
                    }`}
                    className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-semibold text-sm tracking-wide shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <span>OBTER MEU PLANO PERSONALIZADO</span>
                    <ArrowRight className="w-4 h-4" />
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
                    <p className="text-[11px] text-[#827B77]">
                      O link de checkout está em configuração pela administração da Vitta Pilates.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Seção 2: Card de Garantia de 7 Dias */}
            <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#F7EEEE] border border-[#EBD6D5] flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-[#B77D82]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-serif font-bold text-[#292321]">
                  Garantia Incondicional de 7 Dias
                </h3>
                <p className="text-xs sm:text-sm text-[#827B77] max-w-md mx-auto leading-relaxed">
                  Você tem 7 dias inteiros para experimentar as aulas e praticar seu plano no seu ritmo. Se não se adaptar, devolvemos 100% do seu dinheiro, sem perguntas e sem complicações.
                </p>
              </div>
            </div>

            {/* Seção 3: Perguntas Frequentes (FAQ Expansível) */}
            <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 space-y-4">
              <h3 className="text-xl font-serif font-bold text-[#292321] text-center">
                Perguntas Frequentes
              </h3>

              <div className="space-y-2.5 pt-1">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] overflow-hidden transition"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <span className="text-xs sm:text-sm font-semibold text-[#292321]">
                          {faq.q}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-[#B77D82] shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#827B77] shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-[#827B77] leading-relaxed border-t border-[#EADBCE]/50">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Botão de Chamada para Ação ao Final do FAQ */}
              <div className="pt-4 space-y-2">
                {checkoutUrl ? (
                  <a
                    href={`${checkoutUrl}${checkoutUrl.includes("?") ? "&" : "?"}sck=${encodeURIComponent(sessionId)}${
                      answers.name ? `&name=${encodeURIComponent(answers.name)}` : ""
                    }`}
                    className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-semibold text-sm tracking-wide shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <span>OBTER MEU PLANO PERSONALIZADO</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full py-4 px-6 rounded-full bg-[#B77D82]/50 text-white font-semibold text-sm tracking-wide shadow-sm cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>OBTER MEU PLANO PERSONALIZADO</span>
                  </button>
                )}

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#827B77]">
                  <Lock className="w-3.5 h-3.5 text-[#827B77]" />
                  <span>Ambiente seguro e protegido</span>
                </div>
              </div>
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
