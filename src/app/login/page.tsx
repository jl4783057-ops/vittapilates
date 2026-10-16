import { redirect } from "next/navigation";
import { getSiteSettings } from "@/lib/site-settings";
import { LoginForm } from "./LoginForm";

// Banner/logo come from Supabase on every request so a full reload always shows the saved value.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[]; sucesso?: string | string[] }>;
}) {
  const [params, siteSettings] = await Promise.all([searchParams, getSiteSettings()]);
  const initialEmail = Array.isArray(params.email) ? params.email[0] : params.email || "";
  const sucesso = Array.isArray(params.sucesso) ? params.sucesso[0] : params.sucesso || null;

  // Se já houver sessão ativa válida com acesso e a usuária não veio para redefinição/logout:
  if (!sucesso) {
    try {
      const { createClientServer } = await import("@/lib/supabase/server");
      const supabaseServer = await createClientServer();
      const {
        data: { user },
      } = await supabaseServer.auth.getUser();

      if (user) {
        const { getStudentAccess } = await import("@/lib/access");
        const { hasAccess } = await getStudentAccess(user.id);
        if (hasAccess) {
          redirect("/aluna");
        }
      }
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "digest" in err &&
        typeof (err as { digest: string }).digest === "string" &&
        (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
    }
  }

  return <LoginForm initialEmail={initialEmail} sucesso={sucesso} siteSettings={siteSettings} />;
}
