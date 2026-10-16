"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store/context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { type EmailOtpType } from "@supabase/supabase-js";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { siteSettings } = useApp();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  // Estados para fluxo de validação por código OTP (anti-scanner/anti-prefetch)
  const [otpCode, setOtpCode] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  useEffect(() => {
    let isMounted = true;
    let resolved = false;

    const markSuccess = (email: string) => {
      if (resolved || !isMounted) return;
      resolved = true;
      setHasValidSession(true);
      setUserEmail(email || "");
      setError("");
      setCheckingSession(false);
    };

    const markFailure = (msg: string) => {
      if (resolved || !isMounted) return;
      resolved = true;
      setHasValidSession(false);
      setError(msg);
      setCheckingSession(false);
    };

    const fallbackTimer = setTimeout(() => {
      if (!resolved && isMounted) {
        markFailure("Nenhum link de convite válido ou sessão ativa encontrado. Por favor, solicite um novo link.");
      }
    }, 2500);

    async function validateAuth() {
      try {
        if (!isSupabaseConfigured || !supabase) {
          markFailure("O serviço de autenticação não está disponível no momento.");
          return;
        }

      // 1. Sessão já ativa no navegador/cookies (ex.: após redirecionamento pelo Supabase ou /api/auth/callback)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          markSuccess(sessionData.session.user.email || "");
          return;
        }
      } catch (sessErr) {
        console.warn("[definir-senha] Erro getSession:", sessErr);
      }

      // 2. Extração de tokens no fragmento Hash (#access_token=...&refresh_token=...)
      // Crucial para links de convite no Safari/iPhone quando o redirect do Supabase Auth usa fragmento
      if (typeof window !== "undefined" && window.location.hash) {
        try {
          const rawHash = window.location.hash.replace(/^#/, "");
          const hashParams = new URLSearchParams(rawHash);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { data: setSessionData, error: setSessionErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (!setSessionErr && setSessionData?.session?.user) {
              markSuccess(setSessionData.session.user.email || "");
              return;
            }
          }

          const hashError = hashParams.get("error");
          const hashErrorDesc = hashParams.get("error_description");
          if (hashError) {
            markFailure(hashErrorDesc || "Link de convite inválido ou expirado.");
            return;
          }
        } catch (hashErr) {
          console.warn("[definir-senha] Falha ao processar hash da URL:", hashErr);
        }
      }

      // 3. Verifica se a URL retornou com erro explícito do Supabase
      const urlError = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      if (urlError) {
        if (urlError === "expired_token" || urlError === "access_denied" || (errorDescription && errorDescription.includes("expired"))) {
          markFailure("Este link de convite já expirou ou já foi utilizado. Solicite um novo link.");
        } else {
          markFailure(errorDescription || "Link de acesso inválido ou expirado. Por favor, utilize o link mais recente recebido no seu e-mail.");
        }
        return;
      }

      // 3. Trata token_hash e type (quando Supabase envia link direto de invite via OTP)
      const tokenHash = searchParams.get("token_hash");
      const otpType = (searchParams.get("type") as EmailOtpType) || "invite";
      if (tokenHash) {
        try {
          const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });

          if (otpError) {
            console.error("[definir-senha] Erro verifyOtp:", otpError);
            markFailure("Este link de convite é inválido ou já expirou. Solicite um novo link por e-mail.");
            return;
          }

          if (otpData?.user) {
            markSuccess(otpData.user.email || "");
            return;
          }
        } catch (otpErr) {
          console.error("[definir-senha] Exceção verifyOtp:", otpErr);
        }
      }

      // 4. Trata código PKCE (searchParams ?code=...)
      const code = searchParams.get("code");
      if (code) {
        try {
          const { data: exchangeData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("[definir-senha] Erro PKCE exchange:", exchangeError);
            markFailure("Este link de convite é inválido ou já expirou. Solicite um novo link.");
            return;
          }
          if (exchangeData?.user) {
            markSuccess(exchangeData.user.email || "");
            return;
          }
        } catch (pkceErr) {
          console.error("[definir-senha] Exceção PKCE:", pkceErr);
        }
      }



      // 6. Escuta evento de autenticação (hash #access_token no cliente)
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user && (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY" || event === "USER_UPDATED" || event === "INITIAL_SESSION")) {
          markSuccess(session.user.email || "");
        }
      });

      // 7. Timeout de segurança para evitar loading infinito (2.5 segundos)
      const timer = setTimeout(async () => {
        if (resolved || !isMounted) return;
        try {
          const current = await supabase?.auth.getSession();
          if (current?.data?.session?.user) {
            markSuccess(current.data.session.user.email || "");
            return;
          }
        } catch {}

        markFailure(
          "Nenhum link de convite válido ou sessão ativa encontrado. Por favor, clique no link de convite enviado para o seu e-mail."
        );
      }, 2500);

      return () => {
        authListener.subscription.unsubscribe();
      };
    } catch (unexpectedError) {
      console.error("[definir-senha] Erro inesperado ao validar auth:", unexpectedError);
      markFailure("Ocorreu uma falha ao validar o link de convite. Por favor, solicite um novo link.");
    }
  }

  let cleanupAuthListener: (() => void) | undefined;
  validateAuth().then((cleanup) => {
    if (cleanup && isMounted) {
      cleanupAuthListener = cleanup;
    }
  });

  return () => {
    isMounted = false;
    clearTimeout(fallbackTimer);
    if (cleanupAuthListener) {
      cleanupAuthListener();
    }
  };
}, [searchParams]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");

    const cleanEmail = (inputEmail || userEmail).trim().toLowerCase();
    const cleanToken = otpCode.trim();

    if (!cleanEmail) {
      setOtpError("Por favor, informe seu e-mail cadastrado.");
      return;
    }

    if (!cleanToken) {
      setOtpError("Por favor, digite o código de verificação recebido por e-mail.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setOtpError("Serviço de autenticação temporariamente indisponível.");
      return;
    }

    setOtpLoading(true);

    try {
      // Tenta primeiro como invite, depois como recovery caso já seja conta existente
      let { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "invite",
      });

      if (verifyErr) {
        const recoveryAttempt = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: "recovery",
        });
        if (!recoveryAttempt.error) {
          data = recoveryAttempt.data;
          verifyErr = null;
        }
      }

      if (verifyErr) {
        console.error("[definir-senha] Erro verifyOtp código:", verifyErr);
        setOtpError("Código de convite inválido ou expirado. Verifique os dígitos ou solicite novo acesso.");
        return;
      }

      if (data?.session?.user || data?.user) {
        setUserEmail(cleanEmail);
        setHasValidSession(true);
        setError("");
        setOtpError("");
      } else {
        setOtpError("Não foi possível validar o código. Tente novamente.");
      }
    } catch (err: unknown) {
      console.error("[definir-senha] Exceção verifyOtp:", err);
      setOtpError("Ocorreu uma falha ao validar o código. Tente novamente.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas digitadas não coincidem. Verifique e tente novamente.");
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error("Serviço de autenticação não configurado.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        if (updateError.message.toLowerCase().includes("session")) {
          throw new Error("Sua sessão expirou. Por favor, abra o link do convite novamente.");
        }
        throw new Error(updateError.message || "Não foi possível salvar a senha.");
      }

      setSuccess(true);

      // Redireciona para o login após 2 segundos
      setTimeout(() => {
        router.push(
          `/login?sucesso=senha_definida${
            userEmail ? `&email=${encodeURIComponent(userEmail)}` : ""
          }`
        );
      }, 2000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Ocorreu um erro ao definir sua senha. Tente novamente mais tarde.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between p-4 sm:p-6">
      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.06)] overflow-hidden">
          {siteSettings.loginBannerUrl && (
            <div className="relative h-32 sm:h-40 w-full overflow-hidden bg-[#F3EAE3]">
              <img
                src={siteSettings.loginBannerUrl}
                alt="Banner de Acesso"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/20" />
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              {siteSettings.logoUrl ? (
                <div className="flex justify-center mb-1">
                  <img
                    src={siteSettings.logoUrl}
                    alt={siteSettings.logoText || "Logo"}
                    className="h-14 w-auto max-w-[180px] object-contain rounded-xl"
                  />
                </div>
              ) : siteSettings.logoText ? (
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#B77D82] text-white font-serif font-bold text-2xl shadow-sm mb-1">
                  {siteSettings.logoText.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#B77D82] text-white font-serif font-bold text-2xl shadow-sm mb-1">
                  V
                </div>
              )}

              {siteSettings.logoText && (
                <p className="text-xs uppercase tracking-widest text-[#B77D82] font-semibold">
                  {siteSettings.logoText}
                </p>
              )}

              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
                Criar Minha Senha
              </h1>
              <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed">
                Bem-vinda ao Vitta Pilates! Defina sua senha pessoal para acessar
                todas as aulas e programas da plataforma.
              </p>
            </div>

            {/* Estado de Validação do Convite */}
            {checkingSession ? (
              <div className="p-8 text-center space-y-3" role="status">
                <RefreshCw className="w-6 h-6 text-[#B77D82] animate-spin mx-auto" />
                <p className="text-xs text-[#827B77]">
                  Validando seu link de convite seguro...
                </p>
              </div>
            ) : hasValidSession === false ? (
              /* Link Inválido ou Expirado */
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-950 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <h2 className="text-sm font-bold">Link pré-consumido ou expirado</h2>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Se o seu leitor de e-mail ou antivírus pré-carregou o link de convite, você pode digitar o <strong>código de verificação</strong> enviado para o seu e-mail para continuar:
                  </p>
                </div>

                {/* Formulário de código OTP para convite */}
                <form onSubmit={handleVerifyOtp} className="space-y-3.5 bg-[#FAF7F2] p-4 rounded-2xl border border-[#EADBCE]">
                  <p className="text-xs font-semibold text-[#292321]">
                    Validar com o Código de 6 ou 8 dígitos do e-mail:
                  </p>

                  {otpError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-[#827B77] uppercase tracking-wider">
                      Seu E-mail
                    </label>
                    <input
                      type="email"
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                      placeholder="seu-email@exemplo.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADBCE] bg-white text-xs text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-[#827B77] uppercase tracking-wider">
                      Código de Verificação
                    </label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\s+/g, ""))}
                      placeholder="Ex: 123456"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADBCE] bg-white text-sm font-mono tracking-widest text-center text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full py-3 px-4 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-xs tracking-wide shadow-sm hover:shadow transition disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {otpLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Validando código...
                      </>
                    ) : (
                      "VALIDAR CÓDIGO E CRIAR SENHA"
                    )}
                  </button>
                </form>

                <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EADBCE] space-y-3 text-xs text-[#827B77]">
                  <p>
                    Se preferir receber um novo link de acesso, solicite pelo seu e-mail cadastrado:
                  </p>
                  <Link
                    href="/recuperar-senha"
                    className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-full border border-[#EADBCE] bg-white text-[#827B77] hover:text-[#292321] text-xs font-medium text-center transition block"
                  >
                    Solicitar novo link por e-mail
                  </Link>
                </div>

                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="text-xs text-[#827B77] hover:underline"
                  >
                    Voltar para tela de login
                  </Link>
                </div>
              </div>
            ) : success ? (
              /* Sucesso ao Criar a Senha */
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-6 rounded-2xl text-center space-y-3 animate-fade-in">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h2 className="font-serif font-bold text-lg text-emerald-950">
                  Senha criada com sucesso!
                </h2>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Sua conta está pronta. Redirecionando você para a tela de login
                  para entrar com seu e-mail e sua nova senha...
                </p>
                <div className="pt-2">
                  <Link
                    href={`/login${
                      userEmail ? `?email=${encodeURIComponent(userEmail)}` : ""
                    }`}
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-semibold underline"
                  >
                    Ir para login agora <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              /* Formulário com Validação Ativa */
              <form onSubmit={handleSubmit} className="space-y-4">
                {userEmail && (
                  <div className="bg-[#FAF7F2] border border-[#EADBCE] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-[#827B77]">E-mail da assinatura:</span>
                    <strong className="text-[#292321]">{userEmail}</strong>
                  </div>
                )}

                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Nova Senha */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#292321] uppercase tracking-wider">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      className="w-full px-4 py-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition pr-11"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#827B77] hover:text-[#292321] p-1 cursor-pointer"
                      aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirmar Nova Senha */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#292321] uppercase tracking-wider">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha criada"
                      className="w-full px-4 py-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#827B77] hover:text-[#292321] p-1 cursor-pointer"
                      aria-label={
                        showConfirmPassword ? "Ocultar senha" : "Exibir senha"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#827B77]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#B77D82]" />
                  <span>Sua senha é protegida por criptografia de ponta a ponta.</span>
                </div>

                {/* Botão de Envio */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-sm tracking-wide shadow-sm hover:shadow transition transform active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                >
                  {loading ? "Salvando sua senha..." : "CRIAR MINHA SENHA E ENTRAR"}
                </button>
              </form>
            )}

            {!success && (
              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs text-[#827B77] hover:underline"
                >
                  Já possui senha? Fazer login
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-[#827B77]">
        Vitta Pilates. Todos os direitos reservados.
      </footer>
    </div>
  );
}

export function SetPasswordClient() {
  return <SetPasswordContent />;
}
