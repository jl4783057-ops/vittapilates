import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { createClientServer } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getStudentAccess } from "@/lib/access";
import { StudentLayoutClient } from "./StudentLayoutClient";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Falha segura (fail-closed): se o Supabase não estiver configurado no servidor,
  // nunca liberar a área de alunas sem autenticação.
  if (!isSupabaseAdminConfigured) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-sm p-6 sm:p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="font-serif font-bold text-xl text-[#292321]">
            Serviço Indisponível
          </h1>
          <p className="text-xs text-[#827B77] leading-relaxed">
            O serviço de autenticação da plataforma ainda não foi configurado no servidor. O acesso à área de alunas permanece bloqueado por segurança.
          </p>
          <div className="pt-2 space-y-2">
            <Link
              href="/login"
              className="block w-full py-3 px-4 rounded-xl bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold transition"
            >
              Ir para tela de login
            </Link>
            <Link
              href="/"
              className="block text-xs text-[#827B77] hover:underline pt-1"
            >
              Voltar à página inicial
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Validação estrita no SSR antes de renderizar qualquer conteúdo
  const supabase = await createClientServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3. Barreira de autenticação: redireciona para login no servidor se não houver usuário autenticado
  if (!user) {
    redirect("/login");
  }

  // 4. Barreira de autorização: consulta o status no banco pelo servidor
  const { hasAccess, profile } = await getStudentAccess(user.id);

  // Se o perfil não tiver acesso ativo (assinante ativo/trial ou cortesia no prazo),
  // bloqueia a entrega do conteúdo das aulas diretamente no servidor.
  if (!hasAccess) {
    const studentName = profile?.name || user.email?.split("@")[0] || "Aluna";
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-sm p-6 sm:p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="font-serif font-bold text-xl text-[#292321]">
            Acesso Não Ativo
          </h1>
          <p className="text-xs text-[#827B77] leading-relaxed">
            Olá, <strong>{studentName}</strong>. Constatamos que sua assinatura ou cortesia não está ativa no momento.
          </p>
          <div className="pt-2 space-y-2">
            <Link
              href="/login"
              className="block w-full py-3 px-4 rounded-xl bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold transition"
            >
              Fazer login com outra conta
            </Link>
            <Link
              href="/"
              className="block text-xs text-[#827B77] hover:underline pt-1"
            >
              Voltar à página inicial
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 5. Como a usuária é autenticada e possui acesso ativo no servidor,
  // carregamos as aulas publicadas diretamente via Supabase admin no SSR
  // garantindo que nenhuma pessoa não autorizada tenha acesso a esses dados.
  let initialLessons: import("@/types").Lesson[] = [];
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
    const { mapDbToLesson } = await import("@/app/api/admin/lessons/route");
    const { data: lessonsData } = await getSupabaseAdmin()
      .from("lessons")
      .select("*")
      .eq("status", "publicado")
      .order("display_order", { ascending: true });

    if (lessonsData && lessonsData.length > 0) {
      initialLessons = lessonsData.map(mapDbToLesson);
    }
  } catch (err) {
    console.error("Erro ao carregar aulas da aluna no SSR:", err);
  }

  return <StudentLayoutClient initialLessons={initialLessons}>{children}</StudentLayoutClient>;
}
