"use client";

import React from "react";
import { useApp } from "@/lib/store/context";
import { MessageCircle, Heart, Users, Sparkles, AlertCircle, ExternalLink } from "lucide-react";

export default function StudentCommunityPage() {
  const { siteSettings, categories } = useApp();

  const communityCategory = categories.find(
    (c) => c.slug === "comunidade" || c.id === "cat-comunidade"
  );
  const bannerUrl =
    communityCategory?.bannerUrl ||
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1000&q=80";

  const title = siteSettings.whatsappCommunityTitle || "Sua jornada é melhor quando estamos juntas.";
  const subtitle =
    siteSettings.whatsappCommunitySubtitle ||
    "Um espaço exclusivo para mulheres que, assim como você, decidiram cuidar de si. Compartilhe suas conquistas, encontre motivação e receba aquele incentivo que faz toda a diferença.";
  const buttonText = siteSettings.whatsappCommunityButtonText || "Entrar na comunidade exclusiva";
  const whatsappUrl = siteSettings.whatsappCommunityUrl?.trim();

  const hasValidLink = Boolean(
    whatsappUrl &&
    (whatsappUrl.startsWith("https://chat.whatsapp.com/") ||
     whatsappUrl.startsWith("https://wa.me/") ||
     whatsappUrl.startsWith("whatsapp://"))
  );

  return (
    <div className="space-y-6 animate-fade-in py-2">
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] overflow-hidden shadow-[0_8px_30px_rgba(41,35,33,0.05)]">
        {/* Banner Acolhedor Persistido */}
        <div className="relative h-48 sm:h-56 w-full bg-[#F3EAE3] overflow-hidden">
          <img
            src={bannerUrl}
            alt="Comunidade Vitta Pilates"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-5">
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xs text-[#292321] px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs">
              <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600/20" />
              <span>Grupo Oficial no WhatsApp</span>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Textos Oficiais Conforme Especificação do Item 10 */}
          <div className="space-y-3 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321] leading-tight">
              {title}
            </h1>
            <p className="text-sm sm:text-base text-[#827B77] leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Destaques da Comunidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-1 text-center sm:text-left">
              <Heart className="w-5 h-5 text-[#B77D82] mx-auto sm:mx-0" />
              <h3 className="font-serif font-bold text-xs text-[#292321]">
                Acolhimento Real
              </h3>
              <p className="text-[11px] text-[#827B77]">
                Sem julgamentos ou cobranças excessivas.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-1 text-center sm:text-left">
              <Users className="w-5 h-5 text-[#B77D82] mx-auto sm:mx-0" />
              <h3 className="font-serif font-bold text-xs text-[#292321]">
                Troca de Experiências
              </h3>
              <p className="text-[11px] text-[#827B77]">
                Compartilhe sua rotina e conquistas do dia a dia.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-1 text-center sm:text-left">
              <Sparkles className="w-5 h-5 text-[#B77D82] mx-auto sm:mx-0" />
              <h3 className="font-serif font-bold text-xs text-[#292321]">
                Avisos & Aulas Novas
              </h3>
              <p className="text-[11px] text-[#827B77]">
                Receba lembretes com carinho para não perder o ritmo.
              </p>
            </div>
          </div>

          {/* Botão de Ação com Tratamento de Link Vazio/Desconfigurado */}
          <div className="pt-2">
            {hasValidLink ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm tracking-wide shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer group"
              >
                <MessageCircle className="w-5 h-5 fill-white/20" />
                <span>{buttonText}</span>
                <ExternalLink className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 transition-transform" />
              </a>
            ) : (
              <div className="space-y-3">
                <button
                  disabled
                  className="w-full py-4 px-6 rounded-full bg-[#EADBCE] text-[#827B77] font-medium text-sm tracking-wide cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>{buttonText}</span>
                </button>
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    O link de convite da comunidade está sendo atualizado pela administração.
                    Em instantes um novo canal exclusivo estará liberado aqui!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
