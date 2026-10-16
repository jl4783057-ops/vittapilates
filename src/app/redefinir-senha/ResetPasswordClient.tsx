"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store/context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient, type SupabaseClient, type EmailOtpType } from "@supabase/supabase-js";
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

  // Estados para fluxo de validação por código OTP
  const [otpCode, setOtpCode] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  // Instância dedicada em memória para autenticação resiliente (sem dependência de cookies em Safari/iOS)
  const authClientRef = useRef<SupabaseClient | null>(null);

  const getAuthClient = (): SupabaseClient => {
    if (!authClientRef.current) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        "";

      authClientRef.current = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    }
    return authClientRef.current;
  };

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

    const hasHashTokens = typeof window !== "undefined" && Boolean(window.location.hash);
    const hasAuthParams =
      searchParams.has("code") || searchParams.has("token_hash") || searchParams.has("error");

    // Se abriu a página diretamente sem parâmetros de autenticação na URL:
    if (!hasHashTokens && !hasAuthParams) {
      // Verifica se já há uma sessão no cliente do navegador
      if (supabase) {
        supabase.auth
          .getSession()
          .then(({ data }) => {
            if (!resolved && isMounted) {
              if (data?.session?.user) {
                // Copia a sessão para o cliente dedicado
                if (data.session.access_token && data.session.refresh_token) {
                  getAuthClient()
                    .auth.setSession({
                      access_token: data.session.access_token,
                      refresh_token: data.session.refresh_token,
                    })
                    .catch(() => {});
                }
                markSuccess(data.session.user.email || "");
              } else {
                markFailure("");
              }
            }
          })
          .catch(() => {
            if (!resolved && isMounted) markFailure("");
          });
      } else {
        markFailure("");
      }
      return;
    }

    // Safety timeout para fluxos com hash ou query
    const fallbackTimer = setTimeout(() => {
      if (!resolved && isMounted) {
        markFailure(
          "Nenhum link ou sessão de recuperação ativa encontrada. Por favor, digite o código de verificação recebido por e-mail."
        );
      }
    }, 2500);

    async function validateRecoveryAuth() {
      try {
        if (!isSupabaseConfigured) {
          markFailure("O serviço de autenticação não está disponível no momento.");
          return;
        }

        const client = getAuthClient();

        // 1. Fragmento Hash (#access_token=...&refresh_token=...)
        if (typeof window !== "undefined" && window.location.hash) {
          try {
            const rawHash = window.location.hash.replace(/^#/, "");
            const hashParams = new URLSearchParams(rawHash);
            const accessToken = hashParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token");

            if (accessToken && refreshToken) {
              const { data: setSessionData, error: setSessionErr } = await client.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (!setSessionErr && setSessionData?.session?.user) {
                if (supabase) {
                  supabase.auth
                    .setSession({ access_token: accessToken, refresh_token: refreshToken })
                    .catch(() => {});
                }
                markSuccess(setSessionData.session.user.email || "");
                return;
              }
            }

            const hashError = hashParams.get("error");
            const hashErrorDesc = hashParams.get("error_description");
            if (hashError) {
              markFailure(
                hashErrorDesc ||
                  "Link de recuperação inválido ou expirado. Digite o código de verificação recebido por e-mail."
              );
              return;
            }
          } catch (hashErr) {
            console.warn("[redefinir-senha] Falha ao processar hash da URL:", hashErr);
          }
        }

        // 2. Erro explícito na query string (?error=...)
        const urlError = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");
        if (urlError) {
          markFailure(
            errorDescription ||
              "Este link de recuperação já expirou ou é inválido. Digite o código de verificação recebido por e-mail."
          );
          return;
        }

        // 3. Código PKCE (?code=...)
        const code = searchParams.get("code");
        if (code) {
          try {
            const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(code);
            if (!exchangeError && data?.session?.user) {
              if (supabase && data.session.access_token && data.session.refresh_token) {
                supabase.auth
                  .setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                  })
                  .catch(() => {});
              }
              markSuccess(data.session.user.email || "");
              return;
            }
            if (exchangeError) {
              console.error("[redefinir-senha] Erro PKCE code exchange:", exchangeError);
              markFailure("Link de recuperação expirado. Digite o código de verificação recebido por e-mail.");
              return;
            }
          } catch (err) {
            console.error("[redefinir-senha] Exceção PKCE:", err);
          }
        }

        // 4. Token hash (?token_hash=...&type=recovery)
        const tokenHash = searchParams.get("token_hash");
        const typeParam = (searchParams.get("type") as EmailOtpType) || "recovery";
        if (tokenHash) {
          try {
            const { data, error: verifyError } = await client.auth.verifyOtp({
              token_hash: tokenHash,
              type: typeParam,
            });
            if (!verifyError && data?.session?.user) {
              if (supabase && data.session.access_token && data.session.refresh_token) {
                supabase.auth
                  .setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                  })
                  .catch(() => {});
              }
              markSuccess(data.session.user.email || "");
              return;
            }
            if (verifyError) {
              console.error("[redefinir-senha] Erro verifyOtp via token_hash:", verifyError);
              markFailure("Link de recuperação expirado. Digite o código de verificação recebido por e-mail.");
              return;
            }
          } catch (err) {
            console.error("[redefinir-senha] Exceção verifyOtp via token_hash:", err);
          }
        }

        markFailure("");
      } catch (unexpectedError) {
        console.error("[redefinir-senha] Erro inesperado ao validar auth:", unexpectedError);
        markFailure("Ocorreu uma falha ao validar o link de recuperação. Por favor, digite o código recebido.");
      }
    }

    validateRecoveryAuth();

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      authClientRef.current = null;
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

    if (!isSupabaseConfigured) {
      setOtpError("Serviço de autenticação temporariamente indisponível.");
      return;
    }

    setOtpLoading(true);

    try {
      const client = getAuthClient();

      // 1. Valida o código OTP com type: "recovery" diretamente no cliente em memória
      const { data, error: verifyErr } = await client.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "recovery",
      });

      if (verifyErr) {
        console.error("[redefinir-senha] Erro verifyOtp:", verifyErr.message, verifyErr.status);
        const errMsg = verifyErr.message?.toLowerCase() || "";
        const errCode = (verifyErr as { code?: string }).code || "";

        if (verifyErr.status === 403 || errCode === "otp_expired" || errMsg.includes("expired")) {
          setOtpError("Código expirado ou inválido. Por favor, verifique os dígitos ou solicite um novo código.");
        } else if (verifyErr.status === 429 || errMsg.includes("rate limit") || errMsg.includes("too many requests")) {
          setOtpError("Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos antes de tentar novamente.");
        } else if (verifyErr.status === 0 || errMsg.includes("fetch") || errMsg.includes("network")) {
          setOtpError("Erro de conexão com o servidor. Verifique sua internet e tente novamente.");
        } else {
          setOtpError("Código de verificação incorreto ou expirado. Verifique os dígitos recebidos por e-mail.");
        }
        return;
      }

      // 2. Confirmação rigorosa: sessão e usuário devem existir no retorno
      if (!data?.session?.user) {
        setOtpError("A validação não retornou uma sessão segura. Por favor, solicite um novo código.");
        return;
      }

      // Sincroniza sessão no cliente do navegador (cookies) para conveniência
      if (supabase && data.session.access_token && data.session.refresh_token) {
        supabase.auth
          .setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })
          .catch(() => {});
      }

      // 3. Libera o formulário com a sessão ativa garantida no cliente dedicado
      setUserEmail(data.session.user.email || cleanEmail);
      setHasValidSession(true);
      setError("");
      setOtpError("");
    } catch (err: unknown) {
      console.error("[redefinir-senha] Exceção em verifyOtp:", err);
      setOtpError("Ocorreu uma falha ao validar o código. Tente novamente.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
      const client = getAuthClient();

      // 1. Confirma sessão ativa no cliente em memória
      const { data: sessionData } = await client.auth.getSession();
      const activeUser = sessionData?.session?.user;

      if (!activeUser) {
        setError(
          "Sua sessão de segurança expirou. Por favor, digite o código de verificação novamente para revalidar."
        );
        setHasValidSession(false);
        setLoading(false);
        return;
      }

      // 2. Atualiza a senha no Supabase Auth usando a mesma instância autenticada
      const { data: updateData, error: updateError } = await client.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error("[redefinir-senha] Erro updateUser:", updateError.message, updateError.status);
        const updateMsg = updateError.message?.toLowerCase() || "";

        if (
          updateError.status === 401 ||
          updateMsg.includes("session") ||
          updateMsg.includes("jwt")
        ) {
          setError(
            "Sua sessão de segurança expirou. Por favor, digite o código de verificação novamente para revalidar."
          );
          setHasValidSession(false);
        } else if (updateMsg.includes("different") || updateMsg.includes("same")) {
          setError("A nova senha deve ser diferente da senha anterior.");
        } else if (updateMsg.includes("weak") || updateMsg.includes("characters")) {
          setError("A senha deve ter no mínimo 6 caracteres.");
        } else if (updateError.status === 429) {
          setError("Muitas tentativas em pouco tempo. Aguarde alguns instantes antes de tentar novamente.");
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

      // 3. Sucesso confirmado pelo servidor: limpa sessões temporárias
      await client.auth.signOut().catch(() => {});
      if (supabase) {
        await supabase.auth.signOut().catch(() => {});
      }

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

        {/* 2. Formulário de validação por código OTP */}
        {!checkingSession && hasValidSession === false && (
          <div className="space-y-5">
            {error ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed">
                  <p className="font-semibold text-amber-950">Validação por Código</p>
                  <p>{error}</p>
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
                Validar com o Código recebido por e-mail:
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
                Solicitar um Novo Código por E-mail
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
