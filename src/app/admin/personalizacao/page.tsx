"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/store/context";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import {
  Sparkles,
  Save,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

function CustomizationForm({
  initialSettings,
  onSave,
  saving,
}: {
  initialSettings: typeof import("@/lib/data/initial-data").INITIAL_SETTINGS;
  onSave: (form: typeof import("@/lib/data/initial-data").INITIAL_SETTINGS) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState({ ...initialSettings });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-6"
    >
      {/* Seção 1: Marca e Tela de Login */}
      <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-[#FAF7F2]">
          <Sparkles className="w-5 h-5 text-[#B77D82]" />
          <h2 className="font-serif font-bold text-base text-[#292321]">
            Identidade e Tela de Login
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-[#827B77] block">
              Nome da Plataforma (Opcional)
            </label>
            <input
              type="text"
              value={form.platformName}
              onChange={(e) => setForm({ ...form, platformName: e.target.value })}
              placeholder="Ex: Vitta Pilates (ou deixe vazio)"
              className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-[#827B77] block">
              Texto do Logo (Opcional)
            </label>
            <input
              type="text"
              value={form.logoText}
              onChange={(e) => setForm({ ...form, logoText: e.target.value })}
              placeholder="Ex: Vitta Pilates (ou deixe vazio)"
              className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
            />
          </div>
        </div>

        {/* Logo da Marca */}
        <div className="pt-2">
          <ImageUploadField
            label="Logo da Marca (Imagem Horizontal / Principal)"
            helperText="Clique em 'Enviar imagem' para selecionar o logo do seu Mac ou Windows (PNG, WebP ou JPG até 5 MB)."
            value={form.logoUrl || ""}
            onChange={(url) => setForm({ ...form, logoUrl: url })}
            aspectRatio="wide"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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

        {/* Banner da Tela de Login */}
        <div className="pt-2">
          <ImageUploadField
            label="Banner da Tela de Login"
            helperText="Clique em 'Enviar imagem' para selecionar o banner de destaque do seu computador (JPG, PNG ou WebP até 5 MB)."
            value={form.loginBannerUrl || ""}
            onChange={(url) => setForm({ ...form, loginBannerUrl: url })}
            aspectRatio="banner"
          />
        </div>
      </div>

      {/* Seção 2: Comunidade no WhatsApp */}
      <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#FAF7F2]">
          <MessageCircle className="w-5 h-5 text-emerald-600" />
          <h2 className="font-serif font-bold text-base text-[#292321]">
            Configurações da Comunidade no WhatsApp
          </h2>
        </div>

        {/* Banner de Destaque da Comunidade */}
        <div className="pt-1">
          <ImageUploadField
            label="Banner de Destaque da Comunidade"
            helperText="Selecione o banner que aparece no topo da tela de Comunidade para as alunas (JPG, PNG ou WebP até 5 MB)."
            value={form.whatsappCommunityBannerUrl || ""}
            onChange={(url) => setForm({ ...form, whatsappCommunityBannerUrl: url })}
            aspectRatio="banner"
          />
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
            Cole o link do convite gerado no aplicativo do WhatsApp para direcionar as alunas.
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
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-60 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando no Supabase...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Publicar Alterações no Site
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function AdminCustomizationPage() {
  const { siteSettings, updateSiteSettings, categories, updateCategory } = useApp();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Chave baseada nos valores recebidos do banco para re-inicializar o form de forma nativa e segura
  const formKey = [
    siteSettings.platformName,
    siteSettings.logoUrl,
    siteSettings.loginBannerUrl,
    siteSettings.loginTitle,
    siteSettings.whatsappCommunityBannerUrl,
  ].join("|");

  const handleSave = async (form: typeof siteSettings) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const resSettings = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const dataSettings = await resSettings.json().catch(() => ({}));
      if (!resSettings.ok) {
        throw new Error(dataSettings.error || "Falha ao salvar configurações no servidor.");
      }

      // Sincroniza o banner na categoria Comunidade para persistência completa
      if (form.whatsappCommunityBannerUrl) {
        const communityCat = categories.find((c) => c.slug === "comunidade" || c.id === "cat-comunidade");
        if (communityCat) {
          const updatedCat = { ...communityCat, bannerUrl: form.whatsappCommunityBannerUrl };
          await fetch("/api/admin/categories", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedCat),
          }).catch(() => {});
          updateCategory(communityCat.id, updatedCat);
        }
      }

      await fetch("/api/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: form.logoUrl || null }),
      }).catch(() => {});

      updateSiteSettings(dataSettings.settings || form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar personalização:", err);
      setError(err instanceof Error ? err.message : "Erro ao salvar alterações no servidor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EADBCE]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Personalização Visual da Plataforma
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Altere logo, banners, textos de acolhimento e o link oficial do WhatsApp com upload direto de arquivos.
          </p>
        </div>

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2 rounded-2xl flex items-center gap-1.5 font-medium animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            Alterações publicadas com sucesso!
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2 rounded-2xl flex items-center gap-1.5 font-medium animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <CustomizationForm
        key={formKey}
        initialSettings={siteSettings}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
