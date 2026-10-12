"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store/context";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";

export default function RecoverPasswordPage() {
  const { siteSettings } = useApp();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 500);
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

        {submitted ? (
          <div className="bg-[#FAF7F2] border border-[#EADBCE] p-5 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h2 className="text-sm font-semibold text-[#292321]">
              Instruções Enviadas!
            </h2>
            <p className="text-xs text-[#827B77] leading-relaxed">
              Enviamos um link para <strong>{email}</strong> com as instruções para criar uma nova senha.
            </p>
            <div className="pt-2">
              <Link
                href="/redefinir-senha"
                className="text-xs text-[#B77D82] font-semibold hover:underline block"
              >
                Simular link recebido (Redefinir Agora) →
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
        © 2026 {siteSettings.platformName}
      </footer>
    </div>
  );
}
