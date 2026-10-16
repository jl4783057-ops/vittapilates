"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store/context";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

type RecoverStatus = "idle" | "sent" | "not_found";

export default function RecoverPasswordPage() {
  const { siteSettings } = useApp();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<RecoverStatus>("idle");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const validateEmail = (val: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Por favor, informe seu e-mail cadastrado.");
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setErrorMessage("Por favor, informe um endereço de e-mail válido (exemplo: seu.nome@email.com).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(
          data.error ||
            "Não foi possível processar a recuperação no momento. Tente novamente mais tarde."
        );
        setStatus("idle");
        return;
      }

      if (data.exists === false) {
        setStatus("not_found");
      } else {
        setStatus("sent");
      }
    } catch (err: unknown) {
      console.error("[recuperar-senha] Erro de rede:", err);
      setErrorMessage(
        "Erro de conexão com o servidor. Verifique sua conexão à internet e tente novamente."
      );
      setStatus("idle");
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setStatus("idle");
    setErrorMessage("");
  };

  const supportUrl = siteSettings.whatsappCommunityUrl || "https://chat.whatsapp.com/";

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto my-auto bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.06)] p-6 sm:p-8 space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-[#827B77] hover:text-[#292321] transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Login
        </Link>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#F7EEEE] text-[#B77D82] mb-1">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#292321]">
            Recuperar Senha
          </h1>
          <p className="text-sm text-[#827B77]">
            Digite seu e-mail cadastrado para receber o link seguro de redefinição.
          </p>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* CENÁRIO 1: E-MAIL ENCONTRADO E LINK DISPARADO */}
        {status === "sent" && (
          <div className="bg-[#FAF7F2] border border-[#EADBCE] p-5 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h2 className="text-sm font-semibold text-[#292321]">
              Solicitação recebida!
            </h2>
            <p className="text-xs text-[#827B77] leading-relaxed">
              Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha. Verifique sua caixa de entrada e o spam.
            </p>
            <div className="p-3 bg-white rounded-xl border border-[#EADBCE] text-xs text-[#292321] font-medium break-all">
              {email}
            </div>
            <p className="text-[11px] text-[#827B77] leading-normal">
              O link é válido por tempo limitado. Se não receber em alguns minutos, confirme se digitou o e-mail correto ou solicite ajuda ao suporte.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full py-3 px-5 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-xs text-center transition"
              >
                Voltar à tela de login
              </Link>
              <button
                type="button"
                onClick={handleTryAgain}
                className="text-xs text-[#827B77] hover:text-[#292321] font-medium hover:underline py-1"
              >
                Tentar com outro e-mail
              </button>
            </div>
          </div>
        )}

        {/* CENÁRIO 2: E-MAIL NÃO ENCONTRADO NO SISTEMA */}
        {status === "not_found" && (
          <div className="bg-[#FFF8F7] border border-[#F3D5D2] p-5 rounded-2xl text-center space-y-3.5">
            <div className="w-9 h-9 rounded-full bg-[#FCE8E6] text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-semibold text-[#292321]">
              Conta não encontrada
            </h2>
            <p className="text-xs text-[#827B77] leading-relaxed">
              Não encontramos uma conta com o e-mail <strong>{email}</strong>. Confira se digitou corretamente. Se você ainda não tem acesso, entre em contato com o suporte.
            </p>
            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleTryAgain}
                className="w-full py-3 px-5 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-xs text-center transition"
              >
                Corrigir e-mail informado
              </button>
              <a
                href={supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-5 rounded-full border border-[#EADBCE] text-[#827B77] hover:text-[#292321] hover:bg-white text-xs font-medium text-center transition flex items-center justify-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#B77D82]" />
                Falar com o Suporte
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
              <Link
                href="/login"
                className="text-xs text-[#827B77] hover:text-[#292321] font-medium hover:underline py-1"
              >
                Voltar para o Login
              </Link>
            </div>
          </div>
        )}

        {/* CENÁRIO 3: FORMULÁRIO DE DIGITAÇÃO */}
        {status === "idle" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#292321] uppercase tracking-wider">
                Seu E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full px-4 py-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-sm tracking-wide shadow-sm hover:shadow transition disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verificando e enviando...
                </>
              ) : (
                "ENVIAR LINK DE RECUPERAÇÃO"
              )}
            </button>
          </form>
        )}
      </div>

      <footer className="text-center py-3 text-xs text-[#827B77]">
        Vitta Pilates. Todos os direitos reservados.
      </footer>
    </div>
  );
}
