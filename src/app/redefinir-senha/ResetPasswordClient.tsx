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

function ResetPasswordContent() {
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

  // Estados para fluxo de validação direta por código OTP (anti-scanner/anti-prefetch)
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

    // Preenche e-mail vindo de query string (?email=...) caso exista
    const queryEmail = searchParams.get("email");
    if (queryEmail) {
      setInputEmail(queryEmail);
    }

    // Se a usuária abriu a página diretamente para digitar o código (sem hash e sem parâmetros de auth),
    // encerra a checagem imediatamente e exibe o formulário de código, sem aguardar 2.5s de timeout.
    const hasHashTokens = typeof window !== "undefined" && Boolean(window.location.hash);
    const hasAuthParams = searchParams.has("code") || searchParams.has("token_hash") || searchParams.has("error");
    if (!hasHashTokens && !hasAuthParams) {
      // Checa sessão rápida e se não houver já exibe o formulário de código
      supabase?.auth.getSession().then(({ data }) => {
        if (!resolved && isMounted) {
          if (data?.session?.user) {
            markSuccess(data.session.user.email || "");
          } else {
            markFailure("");
          }
        }
      }).catch(() => {
        if (!resolved && isMounted) markFailure("");
      });
      return;
    }

    // Safety timeout: encerra o estado de carregamento em no máximo 2.5s para fluxos com hash/code
    const fallbackTimer = setTimeout(() => {
      if (!resolved && isMounted) {
        markFailure("Nenhum link ou sessão de recuperação ativa encontrada. Por favor, solicite um novo link.");
      }
    }, 2500);

    async function validateRecoveryAuth() {
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
          console.warn("[redefinir-senha] Erro getSession:", sessErr);
        }

        // 2. Extração de tokens no fragmento Hash (#access_token=...&refresh_token=...)
        // O Supabase Auth redireciona após /auth/v1/verify com os tokens no fragmento
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
              markFailure(hashErrorDesc || "Link de recuperação inválido ou expirado. Por favor, solicite um novo link.");
              return;
            }
          } catch (hashErr) {
            console.warn("[redefinir-senha] Falha ao processar hash da URL:", hashErr);
          }
        }

        // 3. Erro explícito retornado na query string da URL (?error=...)
        const urlError = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");
        if (urlError) {
          if (
            urlError === "expired_token" ||
            urlError === "access_denied" ||
            (errorDescription && errorDescription.includes("expired"))
          ) {
            markFailure("Este link de recuperação já expirou ou já foi utilizado. Solicite um novo link.");
          } else {
            markFailure(errorDescription || "Link de recuperação inválido ou expirado. Solicite um novo link.");
          }
          return;
        }

      // 3. Troca de código PKCE (?code=...)
      const code = searchParams.get("code");
      if (code) {
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("[redefinir-senha] Erro PKCE code exchange:", exchangeError);
            markFailure("Link de recuperação expirado ou inválido. Por favor, solicite um novo link.");
            return;
          }
          if (data?.session?.user) {
            markSuccess(data.session.user.email || "");
            return;
          }
        } catch (err) {
          console.error("[redefinir-senha] Exceção PKCE:", err);
        }
      }

      // 4. Token hash OTP (?token_hash=...&type=recovery)
      const tokenHash = searchParams.get("token_hash");
      const typeParam = (searchParams.get("type") as EmailOtpType) || "recovery";
      if (tokenHash) {
        try {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: typeParam,
          });
          if (verifyError) {
            console.error("[redefinir-senha] Erro verifyOtp:", verifyError);
            markFailure("Link de recuperação expirado ou inválido. Solicite um novo link.");
            return;
          }
          if (data?.session?.user) {
            markSuccess(data.session.user.email || "");
            return;
          }
        } catch (err) {
          console.error("[redefinir-senha] Exceção verifyOtp:", err);
        }
      }



      // 6. Listener de auth caso o Supabase conclua parsing assíncrono
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user && (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY" || event === "INITIAL_SESSION")) {
          markSuccess(session.user.email || "");
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (unexpectedError) {
      console.error("[redefinir-senha] Erro inesperado ao validar auth:", unexpectedError);
      markFailure("Ocorreu uma falha ao validar o link de recuperação. Por favor, solicite um novo link.");
    }
  }

  let cleanupAuthListener: (() => void) | undefined;
  validateRecoveryAuth().then((cleanup) => {
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

  // Validação manual por código OTP recebido no e-mail
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
      // 1. Valida o código OTP com type: "recovery"
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "recovery",
      });

      if (verifyErr) {
        console.error("[redefinir-senha] Erro técnico verifyOtp:", {
          status: verifyErr.status,
          name: verifyErr.name,
          message: verifyErr.message,
        });
        setOtpError("Código inválido ou expirado. Verifique o código recebido ou solicite um novo.");
        return;
      }

      // 2. Requisito estrito: Não basta data.user existir; confirmar data.session
      let activeSession = data?.session;

      // Se a sessão veio no retorno do verifyOtp, persiste explicitamente para garantir cookies e storage
      if (activeSession?.access_token && activeSession?.refresh_token) {
        const { data: setSessionData, error: setSessionErr } = await supabase.auth.setSession({
          access_token: activeSession.access_token,
          refresh_token: activeSession.refresh_token,
        });
        if (!setSessionErr && setSessionData?.session) {
          activeSession = setSessionData.session;
        }
      }

      // Reconfirma via getSession() que a sessão está pronta no cliente
      const { data: sessionCheck } = await supabase.auth.getSession();
      const confirmedUser = sessionCheck?.session?.user || activeSession?.user;

      if (!sessionCheck?.session || !confirmedUser) {
        console.error("[redefinir-senha] Falha de persistência de sessão após OTP.");
        setOtpError("A validação não foi concluída porque a sessão segura não pôde ser iniciada. Por favor, solicite um novo código.");
        return;
      }

      // 3. Libera o formulário de nova senha com segurança comprovada
      setUserEmail(confirmedUser.email || cleanEmail);
      setHasValidSession(true);
      setError("");
      setOtpError("");
    } catch (err: unknown) {
      console.error("[redefinir-senha] Exceção técnica em verifyOtp:", err);
      setOtpError("Ocorreu uma falha ao validar o código. Tente novamente.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isSupabaseConfigured || !supabase) {
      setError("Serviço de autenticação indisponível.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Preencha todos os campos.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem. Digite a mesma senha nos dois campos.");
      return;
    }

    setLoading(true);

    try {
      // 1. Confirma previamente que há uma sessão ativa e usuário autenticado
      const { data: checkSessionData } = await supabase.auth.getSession();
      if (!checkSessionData?.session?.user) {
        console.error("[redefinir-senha] Sessão ausente antes de updateUser.");
        setError("Sua sessão de redefinição expirou ou não está mais ativa. Você pode validar o código novamente ou solicitar um novo.");
        setLoading(false);
        // Mantém o estado coerente sem voltar silenciosamente para a tela de código
        return;
      }

      // 2. Atualiza a senha no Supabase Auth
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error("[redefinir-senha] Erro técnico ao atualizar senha:", {
          status: updateError.status,
          message: updateError.message,
        });
        if (updateError.message.toLowerCase().includes("session") || updateError.status === 401) {
          setError("Sua sessão de segurança expirou. Por favor, digite o código de verificação novamente ou solicite um novo.");
        } else {
          setError(updateError.message || "Não foi possível atualizar a senha. Tente novamente.");
        }
        setLoading(false);
        return;
      }

      if (!updateData?.user) {
        setError("Não foi possível confirmar a alteração da senha. Tente novamente.");
        setLoading(false);
        return;
      }

      // 3. Sucesso confirmado: faz signOut preventivo e exibe mensagem explícita de sucesso
      await supabase.auth.signOut().catch(() => {});

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?sucesso=senha_redefinida");
      }, 2500);
    } catch (err: unknown) {
      console.error("[redefinir-senha] Exceção inesperada ao atualizar senha:", err);
      setError("Ocorreu um erro ao atualizar sua senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto my-auto bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.06)] p-6 sm:p-8 space-y-6">
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#F7EEEE] text-[#B77D82] mb-1">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#292321]">
            Redefinir Senha
          </h1>
          <p className="text-sm text-[#827B77]">
            {userEmail ? (
              <>
                Redefinindo a senha para <strong>{userEmail}</strong>
              </>
            ) : (
              "Crie uma nova senha segura para acessar sua conta."
            )}
          </p>
        </div>

        {/* 1. Verificando o link */}
        {checkingSession && (
          <div className="py-8 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#B77D82] animate-spin" />
            <p className="text-xs text-[#827B77] font-medium">
              Validando link de recuperação...
            </p>
          </div>
        )}

        {/* 2. Formulário de validação por código OTP (anti-scanner / recuperação direta) */}
        {!checkingSession && hasValidSession === false && (
          <div className="space-y-5">
            {error ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed">
                  <p className="font-semibold text-amber-950">Link pré-consumido ou expirado</p>
                  <p>
                    Por segurança contra antivírus e leitores automáticos de e-mail, digite o <strong>código de verificação</strong> enviado para o seu e-mail para continuar.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#FAF7F2] border border-[#EADBCE] text-[#827B77] p-4 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#B77D82] shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed">
                  <p className="font-semibold text-[#292321]">Confirmação de Identidade</p>
                  <p>
                    Digite seu e-mail cadastrado e o <strong>código de verificação</strong> recebido na sua caixa de entrada para criar sua nova senha.
                  </p>
                </div>
              </div>
            )}

            {/* Formulário de validação por código OTP */}
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

            <div className="pt-1 flex flex-col gap-2">
              <Link
                href="/recuperar-senha"
                className="w-full py-2.5 px-4 rounded-full border border-[#EADBCE] bg-white text-[#827B77] hover:text-[#292321] text-xs font-medium text-center transition block"
              >
                Solicitar um Novo Link ou Código
              </Link>
              <Link
                href="/login"
                className="w-full py-2 text-[#827B77] hover:text-[#292321] text-xs text-center transition block hover:underline"
              >
                Voltar para o Login
              </Link>
            </div>
          </div>
        )}

        {/* 3. Sucesso */}
        {!checkingSession && success && (
          <div className="bg-[#FAF7F2] border border-[#EADBCE] p-6 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h2 className="text-base font-semibold text-[#292321]">
              Senha redefinida com sucesso!
            </h2>
            <p className="text-xs text-[#827B77] leading-relaxed">
              Sua nova senha foi salva. Estamos redirecionando você para a tela de login...
            </p>
            <div className="pt-2">
              <Link
                href="/login?sucesso=senha_redefinida"
                className="inline-flex items-center gap-1.5 text-xs text-[#B77D82] font-semibold hover:underline"
              >
                Acessar Login Agora <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* 4. Formulário ativo com sessão válida */}
        {!checkingSession && hasValidSession === true && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setHasValidSession(false);
                      setError("");
                    }}
                    className="text-xs font-semibold text-[#B77D82] hover:underline cursor-pointer"
                  >
                    ← Digitar código novamente ou solicitar outro
                  </button>
                </div>
              </div>
            )}

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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#827B77] hover:text-[#292321] p-1"
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#292321] uppercase tracking-wider">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full px-4 py-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#827B77] hover:text-[#292321] p-1"
                  aria-label={showConfirmPassword ? "Ocultar confirmação" : "Exibir confirmação"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EADBCE] flex items-center gap-2 text-[11px] text-[#827B77]">
              <ShieldCheck className="w-4 h-4 text-[#B77D82] shrink-0" />
              <span>Sua senha deve conter no mínimo 6 caracteres.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-sm tracking-wide shadow-sm hover:shadow transition disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Salvando nova senha...
                </>
              ) : (
                "SALVAR NOVA SENHA"
              )}
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-xs text-[#827B77] hover:text-[#292321] transition hover:underline"
          >
            Lembrou da senha? Fazer login
          </Link>
        </div>
      </div>

      <footer className="text-center py-4 text-xs text-[#827B77]">
        Vitta Pilates. Todos os direitos reservados.
      </footer>
    </div>
  );
}

export function ResetPasswordClient() {
  return <ResetPasswordContent />;
}
