"use client";

import React, { useState } from "react";
import { SiteSettings } from "@/types";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";

interface QuizClientProps {
  siteSettings: SiteSettings;
}

export function QuizClient({ siteSettings }: QuizClientProps) {
  // Identificador único da sessão para rastreamento de conversão no checkout
  const [sessionId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      const stored = sessionStorage.getItem("vitta_quiz_session_id");
      if (stored) return stored;
      const newId = crypto.randomUUID();
      sessionStorage.setItem("vitta_quiz_session_id", newId);
      return newId;
    } catch {
      return "";
    }
  });

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // URL do checkout configurada (com link oficial da Cakto como valor garantido)
  const checkoutUrl =
    process.env.NEXT_PUBLIC_CHECKOUT_URL || "https://pay.cakto.com.br/weaj7wx_1206702";

  // Perguntas Frequentes (FAQ) da Vitta Pilates
  const faqs = [
    {
      q: "O que está incluído no acesso?",
      a: "Acesso completo e ilimitado a todas as aulas de Pilates organizadas por categorias, sequências guiadas do iniciante ao avançado e disponibilidade total pelo celular, tablet ou computador.",
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
      q: "O conteúdo recebe atualizações?",
      a: "Sim! Nossa grade de aulas recebe atualizações mensais de conteúdo para manter sua prática dinâmica, motivadora e consistente.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#292321] flex flex-col justify-between p-4 sm:p-6 selection:bg-[#EBD6D5] selection:text-[#292321]">
      {/* ============================================================ */}
      {/* CABEÇALHO */}
      {/* ============================================================ */}
      <header className="max-w-xl mx-auto w-full pt-2 pb-4">
        <div className="flex items-center justify-center w-full">
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
      </header>

      {/* ============================================================ */}
      {/* CONTEÚDO PRINCIPAL: PÁGINA DA OFERTA (LANDING PAGE) */}
      {/* ============================================================ */}
      <main className="max-w-xl mx-auto w-full my-auto py-2 sm:py-4">
        <div className="space-y-6 animate-fade-in">
          {/* Título Principal */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321] leading-tight">
              Pratique Pilates no conforto do celular ou de onde você estiver
            </h1>
            <p className="text-xs sm:text-sm text-[#827B77] max-w-md mx-auto">
              Acesso Imediato às suas aulas na plataforma Vitta Pilates pelo celular ou computador
            </p>
          </div>

          {/* Imagem de Destaque: Imagem de referência da plataforma em celular e notebook */}
          <div className="w-full rounded-3xl overflow-hidden border border-[#EADBCE] bg-[#FAF7F2] shadow-sm">
            <img
              src="/images/vitta-offer-hero.jpg"
              alt="Plataforma Vitta Pilates no celular e computador"
              className="w-full h-auto object-cover aspect-16/9"
            />
          </div>

          {/* Seção 1: Card de Oferta Oficial */}
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.05)] p-6 sm:p-8 text-center space-y-5">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#827B77] uppercase tracking-wider block">
                Acesso completo a plataforma
              </span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-sm font-bold text-[#827B77]">R$</span>
                <span className="text-4xl sm:text-5xl font-serif font-bold text-[#B77D82]">
                  47,90
                </span>
                <span className="text-xs text-[#827B77]">/mês</span>
              </div>
            </div>

            {/* Benefícios */}
            <div className="space-y-2.5 max-w-sm mx-auto text-left pt-4 border-t border-[#EADBCE]">
              <div className="flex items-center gap-2.5 text-xs text-[#292321]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>7 dias para pedir reembolso, caso não fique satisfeita</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#292321]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Atualizações mensais de conteúdo e novas aulas</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#292321]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Acesso completo no celular, tablet e computador</span>
              </div>
            </div>

            {/* Botão de Chamada para Ação */}
            <div className="pt-2">
              {checkoutUrl ? (
                <a
                  href={`${checkoutUrl}${checkoutUrl.includes("?") ? "&" : "?"}sck=${encodeURIComponent(sessionId)}`}
                  className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-semibold text-sm tracking-wide shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <span>Quero começar agora</span>
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
                    <span>Quero começar agora</span>
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
                  href={`${checkoutUrl}${checkoutUrl.includes("?") ? "&" : "?"}sck=${encodeURIComponent(sessionId)}`}
                  className="w-full py-4 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-semibold text-sm tracking-wide shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <span>Quero começar agora</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-4 px-6 rounded-full bg-[#B77D82]/50 text-white font-semibold text-sm tracking-wide shadow-sm cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Quero começar agora</span>
                </button>
              )}

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#827B77]">
                <Lock className="w-3.5 h-3.5 text-[#827B77]" />
                <span>Ambiente seguro e protegido</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* RODAPÉ */}
      {/* ============================================================ */}
      <footer className="max-w-xl mx-auto w-full text-center py-2 text-[11px] text-[#827B77]">
        Vitta Pilates • Respeito à sua autonomia e ao seu ritmo corporal.
      </footer>
    </div>
  );
}
