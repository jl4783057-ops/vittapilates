"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/store/context";
import {
  Palette,
  Image as ImageIcon,
  Save,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Upload,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function AdminCustomizationPage() {
  const { siteSettings, updateSiteSettings } = useApp();

  const [form, setForm] = useState({ ...siteSettings });
  const [success, setSuccess] = useState(false);
  const [simulatingUpload, setSimulatingUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSiteSettings(form);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  const handleSimulateUpload = (fieldKey: keyof typeof form) => {
    setSimulatingUpload(true);
    setUploadProgress(15);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setSimulatingUpload(false);
          // Atualizar com nova imagem exemplar de Pilates em alta definição
          const sampleImages = [
            "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
          ];
          const chosen = sampleImages[Math.floor(Math.random() * sampleImages.length)];
          setForm((f) => ({ ...f, [fieldKey]: chosen }));
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EADBCE]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Personalização Visual da Plataforma
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Altere logo, banners, textos de acolhimento e o link oficial do WhatsApp sem mexer em código.
          </p>
        </div>

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2 rounded-2xl flex items-center gap-1.5 font-medium animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Alterações publicadas com sucesso!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Seção 1: Marca e Textos de Login */}
        <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#FAF7F2]">
            <Sparkles className="w-5 h-5 text-[#B77D82]" />
            <h2 className="font-serif font-bold text-base text-[#292321]">
              Identidade e Tela de Login
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Nome da Plataforma
              </label>
              <input
                type="text"
                value={form.platformName}
                onChange={(e) => setForm({ ...form, platformName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Texto do Logo
              </label>
              <input
                type="text"
                value={form.logoText}
                onChange={(e) => setForm({ ...form, logoText: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Título do Login
              </label>
              <input
                type="text"
                value={form.loginTitle}
                onChange={(e) => setForm({ ...form, loginTitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Subtítulo do Login
              </label>
              <input
                type="text"
                value={form.loginSubtitle}
                onChange={(e) => setForm({ ...form, loginSubtitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                required
              />
            </div>
          </div>

          {/* Banner de Login com Prévia e Upload */}
          <div className="space-y-2 pt-2">
            <label className="text-[11px] font-bold uppercase text-[#827B77] block">
              Banner da Tela de Login
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {form.loginBannerUrl && (
                <div className="w-full sm:w-48 h-28 rounded-2xl overflow-hidden border border-[#EADBCE] shrink-0 bg-[#F3EAE3] relative">
                  <img
                    src={form.loginBannerUrl}
                    alt="Prévia do Banner"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                    Prévia
                  </span>
                </div>
              )}
              <div className="flex-1 w-full space-y-2">
                <input
                  type="url"
                  value={form.loginBannerUrl || ""}
                  onChange={(e) => setForm({ ...form, loginBannerUrl: e.target.value })}
                  placeholder="https://sua-cdn.com/banner-login.jpg"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={simulatingUpload}
                    onClick={() => handleSimulateUpload("loginBannerUrl")}
                    className="px-3 py-1.5 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] hover:bg-[#F7EEEE] text-[#B77D82] text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Substituir com Imagem Exemplo
                  </button>
                  {simulatingUpload && (
                    <span className="text-[11px] text-[#827B77]">
                      Enviando para o Storage: {uploadProgress}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 2: Comunidade no WhatsApp (Item 8 e 10) */}
        <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#FAF7F2]">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <h2 className="font-serif font-bold text-base text-[#292321]">
              Configurações da Comunidade no WhatsApp
            </h2>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-[#827B77] block">
              Link de Convite do Grupo do WhatsApp
            </label>
            <input
              type="url"
              value={form.whatsappCommunityUrl}
              onChange={(e) => setForm({ ...form, whatsappCommunityUrl: e.target.value })}
              placeholder="https://chat.whatsapp.com/exemplo-link"
              className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
              required
            />
            <p className="text-[11px] text-[#827B77]">
              Cole o link do convite gerado no aplicativo do WhatsApp. Se deixado em branco, a aluna verá um aviso acolhedor informando que o link está em atualização.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Título da Página da Comunidade
              </label>
              <input
                type="text"
                value={form.whatsappCommunityTitle}
                onChange={(e) => setForm({ ...form, whatsappCommunityTitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Texto do Botão
              </label>
              <input
                type="text"
                value={form.whatsappCommunityButtonText}
                onChange={(e) => setForm({ ...form, whatsappCommunityButtonText: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-[#827B77] block">
              Subtítulo Explicativo da Comunidade
            </label>
            <textarea
              value={form.whatsappCommunitySubtitle}
              onChange={(e) => setForm({ ...form, whatsappCommunitySubtitle: e.target.value })}
              rows={3}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
              required
            />
          </div>
        </div>

        {/* Botão de Publicação */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Publicar Alterações no Site
          </button>
        </div>
      </form>
    </div>
  );
}
