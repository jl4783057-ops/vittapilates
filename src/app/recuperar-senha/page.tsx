"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store/context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ArrowLeft, CheckCircle2, Mail, AlertCircle } from "lucide-react";

export default function RecoverPasswordPage() {
  const { siteSettings } = useApp();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Por favor, informe seu e-mail cadastrado.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError("O serviço de autenticação não está disponível no momento. Contate o suporte.");
      return;
    }

    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/definir-senha`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (resetError) {
        if (resetError.message.toLowerCase().includes("too many requests")) {
          setError("Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de solicitar novamente.");
        } else {
          setError(
            resetError.message ||
              "Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde."
          );
        }
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch (err: unknown) {
      console.error("Erro ao solicitar recuperação de senha:", err);
      setError("Erro de conexão ao enviar o link. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

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

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="bg-[#FAF7F2] border border-[#EADBCE] p-5 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h2 className="text-sm font-semibold text-[#292321]">
              E-mail Enviado!
            </h2>
            <p className="text-xs text-[#827B77] leading-relaxed">
              Enviamos um link seguro para <strong>{email}</strong>. Abra o e-mail no seu dispositivo e clique no link para definir sua nova senha.
            </p>
            <p className="text-[11px] text-[#827B77]">
              Se não encontrar a mensagem em alguns minutos, verifique também sua caixa de spam ou lixo eletrônico.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="text-xs text-[#B77D82] font-semibold hover:underline block"
              >
                Voltar à tela de login
              </Link>
            </div>
          </div>
        ) : (
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
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-sm tracking-wide shadow-sm hover:shadow transition disabled:opacity-70 cursor-pointer"
            >
              {loading ? "Enviando link..." : "ENVIAR LINK DE RECUPERAÇÃO"}
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
