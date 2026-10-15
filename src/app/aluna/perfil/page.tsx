"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/context";
import {
  User as UserIcon,
  CreditCard,
  HelpCircle,
  Bell,
  LogOut,
  Trash2,
  CheckCircle2,
  Edit2,
  Save,
  ShieldAlert,
  Calendar,
} from "lucide-react";
import ImageUploadField from "@/components/ui/ImageUploadField";

export default function StudentProfilePage() {
  const router = useRouter();
  const { currentUser, updateUserProfile, logout, siteSettings } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || "Mariana Silveira");
  const [phone, setPhone] = useState(currentUser?.phone || "(11) 98765-4321");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "");
  const [notifications, setNotifications] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({ name, phone, avatarUrl });
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDeleteAccount = () => {
    alert("Sua solicitação de exclusão de conta e dados foi registrada em conformidade com a LGPD. Sua conta será desativada.");
    setShowDeleteModal(false);
    logout();
    router.push("/login");
  };

  return (
    <div className="space-y-6 animate-fade-in py-2">
      {/* Card do Perfil com Avatar Discreto (Item 11) */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-4">
          {/* Avatar discreto, menor que padrão grande */}
          <div className="relative w-14 h-14 rounded-full overflow-hidden bg-[#F3EAE3] border-2 border-[#EADBCE] shrink-0">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#B77D82]">
                <UserIcon className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-serif font-bold text-xl text-[#292321] truncate">
              {currentUser?.name || "Mariana Silveira"}
            </h1>
            <p className="text-xs text-[#827B77] truncate">
              {currentUser?.email || "aluna@pilatesemcasa.com.br"}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F7EEEE] text-[#B77D82]">
                Aluna Ativa
              </span>
              <span className="text-[11px] text-[#827B77]">
                Membro desde 2026
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 rounded-xl border border-[#EADBCE] text-[#827B77] hover:text-[#292321] hover:bg-[#FAF7F2] transition"
            title="Editar dados"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {savedSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Dados atualizados com sucesso!
          </div>
        )}

        {/* Formulário de Edição */}
        {isEditing && (
          <form onSubmit={handleSave} className="space-y-4 pt-3 border-t border-[#FAF7F2]">
            <ImageUploadField
              label="Foto de Perfil"
              value={avatarUrl}
              onChange={(url) => setAvatarUrl(url)}
              aspectRatio="square"
              helperText="Envie uma foto sua (JPG, PNG ou WebP até 5MB)."
            />

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#827B77]">
                Nome Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321] focus:outline-none focus:ring-1 focus:ring-[#B77D82]"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#827B77]">
                WhatsApp / Telefone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321] focus:outline-none focus:ring-1 focus:ring-[#B77D82]"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C]"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Alterações
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 rounded-full border border-[#EADBCE] text-xs text-[#827B77] hover:bg-[#FAF7F2]"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Dados do Quiz e Plano Personalizado (se existirem) */}
      {currentUser?.customPlan && (
        <section aria-labelledby="custom-plan-heading" className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[#B77D82]" />
            <h2 id="custom-plan-heading" className="font-serif font-bold text-base text-[#292321]">
              Meu Plano e Metas Pessoais
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE]">
              <span className="text-[11px] text-[#827B77] block">Objetivo Principal:</span>
              <p className="font-semibold text-[#292321] text-xs sm:text-sm capitalize mt-0.5">
                {currentUser.customPlan.mainGoal || "Não informado"}
              </p>
            </div>

            {currentUser.customPlan.birthDate && (
              <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE]">
                <span className="text-[11px] text-[#827B77] block">Data de Nascimento:</span>
                <p className="font-semibold text-[#292321] text-xs sm:text-sm mt-0.5">
                  {new Date(currentUser.customPlan.birthDate).toLocaleDateString("pt-BR")}
                </p>
              </div>
            )}

            {currentUser.customPlan.currentWeight && (
              <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE]">
                <span className="text-[11px] text-[#827B77] block">Peso Informado:</span>
                <p className="font-semibold text-[#292321] text-xs sm:text-sm mt-0.5">
                  {currentUser.customPlan.currentWeight} kg
                  {currentUser.customPlan.targetWeight ? ` (Meta: ${currentUser.customPlan.targetWeight} kg)` : ""}
                </p>
              </div>
            )}

            {currentUser.customPlan.bmi && (
              <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE]">
                <span className="text-[11px] text-[#827B77] block">IMC Registrado:</span>
                <p className="font-semibold text-[#292321] text-xs sm:text-sm mt-0.5">
                  {currentUser.customPlan.bmi}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Informações da Assinatura (Item 11) */}
      <section aria-labelledby="subscription-heading" className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-[#B77D82]" />
            <h2 id="subscription-heading" className="font-serif font-bold text-base text-[#292321]">
              Informações da Assinatura
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {currentUser?.subscriptionStatus === "active" ? "Ativa" : "Vigente"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#827B77]">Plano Vigente:</span>
            <span className="font-semibold text-[#292321]">
              Plano {currentUser?.subscriptionPlan || "Mensal"} de Pilates em Casa
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#827B77]">Próxima Renovação:</span>
            <span className="font-medium text-[#292321] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#B77D82]" />
              {currentUser?.subscriptionRenewalDate || "15 de Novembro de 2026"}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#827B77]">Acesso:</span>
            <span className="font-medium text-emerald-700">
              Ilimitado a todas as aulas e comunidade
            </span>
          </div>
        </div>

        <p className="text-[11px] text-[#827B77] leading-relaxed">
          Para alterar forma de pagamento ou gerenciar faturamento, entre em contato com nosso suporte acolhedor.
        </p>
      </section>

      {/* Preferências de Notificações */}
      <section aria-labelledby="preferences-heading" className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <Bell className="w-5 h-5 text-[#B77D82]" />
          <h2 id="preferences-heading" className="font-serif font-bold text-base text-[#292321]">
            Preferências de Lembretes
          </h2>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE]">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-[#292321]">
              Lembretes gentis de treino
            </p>
            <p className="text-[11px] text-[#827B77]">
              Notificações de incentivo nos dias escolhidos no seu plano.
            </p>
          </div>
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
            className="w-4 h-4 text-[#B77D82] rounded border-[#EADBCE] focus:ring-[#B77D82]"
          />
        </div>
      </section>

      {/* Ajuda e Suporte */}
      <section aria-labelledby="support-heading" className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-[#B77D82]" />
          <h2 id="support-heading" className="font-serif font-bold text-base text-[#292321]">
            Ajuda e Suporte
          </h2>
        </div>
        <p className="text-xs text-[#827B77] leading-relaxed">
          Tem alguma dúvida sobre os movimentos, adaptações ou acesso às aulas? Nossa equipe está pronta para te atender.
        </p>
        <a
          href={siteSettings.whatsappCommunityUrl || "https://chat.whatsapp.com"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#B77D82] text-[#B77D82] text-xs font-semibold hover:bg-[#F7EEEE] transition"
        >
          Falar com o Suporte
        </a>
      </section>

      {/* Ações de Conta: Logout e Exclusão (Item 11) */}
      <div className="space-y-2 pt-2">
        <button
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#FFFFFF] border border-[#EADBCE] text-[#292321] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-xs font-semibold transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sair da Conta
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full py-3 px-6 text-center text-xs text-[#827B77] hover:text-rose-700 transition flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Solicitar exclusão de conta e dados (LGPD)
        </button>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-6 max-w-sm w-full space-y-4 shadow-lg">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-serif font-bold text-base text-[#292321]">
                Excluir Conta e Dados?
              </h3>
              <p className="text-xs text-[#827B77] leading-relaxed">
                Essa ação é irreversível. Todos os seus dados de aulas concluídas, rotina e plano personalizado serão removidos.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-full border border-[#EADBCE] text-xs font-semibold text-[#827B77]"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 rounded-full bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
