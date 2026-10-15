"use client";

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

  useEffect(() => {
    let isMounted = true;

    async function validateRecoveryAuth() {
      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) {
          setHasValidSession(false);
          setError("O serviço de autenticação não está disponível no momento.");
          setCheckingSession(false);
        }
        return;
      }

      // 1. Verifica erros retornados pela URL (ex.: token expirado)
      const urlError = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      if (urlError) {
        if (isMounted) {
          setHasValidSession(false);
          if (
            urlError === "expired_token" ||
            urlError === "access_denied" ||
            (errorDescription && errorDescription.includes("expired"))
          ) {
            setError("Este link de recuperação já expirou ou já foi utilizado. Solicite um novo link.");
          } else {
            setError(
              errorDescription ||
                "Link de recuperação inválido ou expirado. Por favor, solicite um novo link."
            );
          }
          setCheckingSession(false);
        }
        return;
      }

      // 2. PKCE code exchange
      const code = searchParams.get("code");
      if (code) {
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("Erro ao validar código de recuperação:", exchangeError);
            if (isMounted) {
              setHasValidSession(false);
              setError("Link de recuperação expirado ou inválido. Por favor, solicite um novo link.");
              setCheckingSession(false);
            }
            return;
          }
          if (data?.session && isMounted) {
            setHasValidSession(true);
            setUserEmail(data.session.user.email || "");
            setCheckingSession(false);
            return;
          }
        } catch (err) {
          console.error("Exceção na troca de código PKCE:", err);
        }
      }

      // 3. Token hash (Email OTP com tipo 'recovery')
      const tokenHash = searchParams.get("token_hash");
      const typeParam = (searchParams.get("type") as EmailOtpType) || "recovery";
      if (tokenHash) {
        try {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: typeParam,
          });
          if (verifyError) {
            console.error("Erro ao verificar token_hash:", verifyError);
            if (isMounted) {
              setHasValidSession(false);
              setError("Link de recuperação expirado ou inválido. Solicite um novo link.");
              setCheckingSession(false);
            }
            return;
          }
          if (data?.session && isMounted) {
            setHasValidSession(true);
            setUserEmail(data.session.user.email || "");
            setCheckingSession(false);
            return;
          }
        } catch (err) {
          console.error("Exceção no verifyOtp:", err);
        }
      }

      // 4. Sessão ativa já existente (ex.: via callback ou cookie persistido)
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session && isMounted) {
        setHasValidSession(true);
        setUserEmail(sessionData.session.user.email || "");
        setCheckingSession(false);
        return;
      }

      // 5. Escuta evento de auth caso o Supabase conclua parsing no hash (#access_token=...)
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        if (session && (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY" || event === "INITIAL_SESSION")) {
          setHasValidSession(true);
          setUserEmail(session.user.email || "");
          setCheckingSession(false);
        }
      });

      // 6. Timeout de segurança para evitar loading infinito
      const timer = setTimeout(async () => {
        if (!isMounted) return;
        const currentSession = await supabase?.auth.getSession();
        if (currentSession?.data?.session) {
          setHasValidSession(true);
          setUserEmail(currentSession.data.session.user.email || "");
        } else {
          setHasValidSession(false);
          setError("Nenhum link ou sessão de recuperação válida encontrada. Por favor, solicite a recuperação de senha.");
        }
        setCheckingSession(false);
      }, 3500);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timer);
      };
    }

    validateRecoveryAuth();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

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
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        if (updateError.message.toLowerCase().includes("session") || updateError.status === 401) {
          setError("Sua sessão expirou. Solicite um novo link de recuperação.");
          setHasValidSession(false);
        } else {
          setError(updateError.message || "Não foi possível atualizar a senha. Tente novamente.");
        }
        setLoading(false);
        return;
      }

      // Faz logout preventivo para que a aluna faça login consciente com a nova senha
      await supabase.auth.signOut().catch(() => {});

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?sucesso=senha_redefinida");
      }, 2500);
    } catch (err: unknown) {
      console.error("Erro inesperado ao atualizar senha:", err);
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

        {/* 2. Link inválido / expirado */}
        {!checkingSession && hasValidSession === false && (
          <div className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs leading-relaxed">
                <p className="font-semibold text-rose-900">Link expirado ou inválido</p>
                <p>{error || "Este link de recuperação não é mais válido. Por motivos de segurança, solicite um novo link."}</p>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/recuperar-senha"
                className="w-full py-3.5 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-sm text-center tracking-wide shadow-sm hover:shadow transition block"
              >
                SOLICITAR NOVO LINK
              </Link>
              <Link
                href="/login"
                className="w-full py-3 px-6 rounded-full border border-[#EADBCE] text-[#827B77] hover:text-[#292321] text-xs font-medium text-center transition block"
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
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
          <div className="p-6 bg-white rounded-3xl border border-[#EADBCE] shadow-sm flex items-center gap-3 text-xs text-[#827B77]">
            <RefreshCw className="w-4 h-4 text-[#B77D82] animate-spin" />
            Carregando página de redefinição...
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
