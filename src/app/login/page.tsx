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

  return <LoginForm initialEmail={initialEmail} sucesso={sucesso} siteSettings={siteSettings} />;
}
