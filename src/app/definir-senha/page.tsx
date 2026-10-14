"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store/context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
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
  const { siteSettings, users, updateSiteSettings } = useApp();

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

  // Analisa o link de convite/redefinição (seja por hash do Supabase #access_token=... ou query params / code)
  useEffect(() => {
    let isMounted = true;

    async function checkAuthLink() {
      // 1. Se o Supabase estiver configurado com credenciais reais
      if (isSupabaseConfigured && supabase) {
        try {
          // Verifica se veio code ou hash na URL e aguarda a sessão ser estabelecida
          const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

          if (sessionError) {
            if (isMounted) {
              setHasValidSession(false);
              setError("O link de acesso é inválido ou já expirou.");
              setCheckingSession(false);
            }
            return;
          }

          if (sessionData?.session?.user) {
            if (isMounted) {
              setHasValidSession(true);
              setUserEmail(sessionData.session.user.email || "");
              setCheckingSession(false);
            }
            return;
          }

          // Se veio code na query (PKCE flow)
          const code = searchParams.get("code");
          if (code) {
            const { data: exchangeData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              if (isMounted) {
                setHasValidSession(false);
                setError(
                  "Este link de convite é inválido ou já expirou. Solicite um novo link."
                );
                setCheckingSession(false);
              }
              return;
            }
            if (exchangeData?.user && isMounted) {
              setHasValidSession(true);
              setUserEmail(exchangeData.user.email || "");
              setCheckingSession(false);
              return;
            }
          }

          // Escuta eventos de auth (quando o Supabase consome o hash #access_token no cliente)
          const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (
                event === "PASSWORD_RECOVERY" ||
                event === "SIGNED_IN" ||
                event === "USER_UPDATED"
              ) {
                if (session?.user && isMounted) {
                  setHasValidSession(true);
                  setUserEmail(session.user.email || "");
                  setCheckingSession(false);
                }
              }
            }
          );

          // Se após um pequeno intervalo ainda não há sessão identificada
          setTimeout(() => {
            if (isMounted && checkingSession) {
              // Verifica se há token no hash da URL
              const hasHashToken =
                typeof window !== "undefined" &&
                window.location.hash.includes("access_token");
              if (!hasHashToken && !sessionData?.session) {
                setHasValidSession(false);
                setError(
                  "Nenhum link de convite ativo encontrado. Verifique o link enviado para o seu e-mail."
                );
              } else {
                setHasValidSession(true);
              }
              setCheckingSession(false);
            }
          }, 1500);

          return () => {
            authListener.subscription.unsubscribe();
          };
        } catch (err: any) {
          if (isMounted) {
            setHasValidSession(false);
            setError(err?.message || "Erro ao validar link de acesso.");
            setCheckingSession(false);
          }
        }
      } else {
        // 2. Modo demonstrativo / antes da configuração das credenciais no .env
        // Permite validar links de teste (ex: ?email=aluna@exemplo.com ou acesso direto)
        const emailFromParam =
          searchParams.get("email") ||
          searchParams.get("login") ||
          "aluna@vittapilates.com";

        // Verifica se há flag de erro proposital
        const isExpired = searchParams.get("expirado") === "true";

        if (isExpired) {
          setHasValidSession(false);
          setError(
            "Este link de primeiro acesso já expirou ou foi utilizado anteriormente."
          );
        } else {
          setHasValidSession(true);
          setUserEmail(emailFromParam);
        }
        setCheckingSession(false);
      }
    }

    checkAuthLink();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

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
      // 1. Se Supabase Auth estiver conectado
      if (isSupabaseConfigured && supabase) {
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateError) {
          throw new Error(
            updateError.message ||
              "Não foi possível salvar a nova senha no Supabase."
          );
        }
      }

      setSuccess(true);

      // Redireciona para o login após 2.2 segundos para a aluna entrar com seu e-mail e senha
      setTimeout(() => {
        router.push(
          `/login?sucesso=senha_definida${
            userEmail ? `&email=${encodeURIComponent(userEmail)}` : ""
          }`
        );
      }, 2200);
    } catch (err: any) {
      setError(
        err?.message ||
          "Ocorreu um erro ao definir sua senha. Tente novamente mais tarde."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between p-4 sm:p-6">
      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.06)] overflow-hidden">
          {/* Top Banner se configurado */}
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
            {/* Header com Logo idêntica à tela de login */}
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

            {/* Estado de Carregamento da Validação do Link */}
            {checkingSession ? (
              <div className="p-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-[#B77D82] animate-spin mx-auto" />
                <p className="text-xs text-[#827B77]">
                  Validando seu link de convite seguro...
                </p>
              </div>
            ) : hasValidSession === false ? (
              /* Link Inválido ou Expirado */
              <div className="space-y-4">
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <h2 className="text-sm font-bold">Link inválido ou expirado</h2>
                  </div>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    {error ||
                      "Este link de acesso não é mais válido. Por motivos de segurança, os convites possuem prazo de validade."}
                  </p>
                </div>

                <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EADBCE] space-y-3 text-xs text-[#827B77]">
                  <p>
                    Se você já confirmou sua assinatura pela Cakto, solicite um novo link de redefinição pelo seu e-mail cadastrado.
                  </p>
                  <Link
                    href="/recuperar-senha"
                    className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-xs shadow-xs transition"
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
              /* Formulário de Criação de Senha */
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

      {/* Rodapé Padronizado */}
      <footer className="text-center py-4 text-xs text-[#827B77]">
        Vitta Pilates. Todos os direitos reservados.
      </footer>
    </div>
  );
}

export default function DefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
          <div className="text-xs text-[#827B77]">Carregando...</div>
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}
