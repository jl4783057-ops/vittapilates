import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isDevelopment = process.env.NODE_ENV === "development";

  // Obter domínio público configurado para o Cloudflare R2 (se houver)
  const r2PublicDomain = (process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_DOMAIN || "").trim().replace(/\/$/, "");
  const configuredR2AccountId = (process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || "").trim();
  const r2UploadOrigin = /^[a-f0-9]{32}$/i.test(configuredR2AccountId)
    ? `https://${configuredR2AccountId}.r2.cloudflarestorage.com`
    : null;

  // Lista de fontes permitidas estritamente para imagens e vídeos do projeto
  const allowedImageSources = [
    "'self'",
    "data:",
    "blob:",
    "https://images.unsplash.com",
    "https://*.supabase.co",
    "https://*.public.blob.vercel-storage.com",
    "https://*.blob.vercel-storage.com",
    ...(r2PublicDomain ? [r2PublicDomain] : []),
  ].join(" ");

  const allowedMediaSources = [
    "'self'",
    "blob:",
    "https://commondatastorage.googleapis.com",
    "https://*.supabase.co",
    ...(r2PublicDomain ? [r2PublicDomain] : []),
  ].join(" ");

  // A nonce lets the browser execute scripts Next.js emitted for this request.
  // Note: Modern browsers honoring CSP Level 3 ignore 'unsafe-inline' when a nonce or 'strict-dynamic' is present,
  // but keeping 'unsafe-inline' and allowing trusted scripts avoids total client blackout if any intermediary caches mismatch.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${allowedImageSources}`,
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co${r2UploadOrigin ? ` ${r2UploadOrigin}` : ""}`,
    `media-src ${allowedMediaSources}`,
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-nonce", nonce);

  // Redirects are an early navigation check; AdminLayout verifies the signed cookie too.
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const session = request.cookies.get("pilates_admin_session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // Renovação de sessão no Supabase SSR conforme fluxo oficial do Next.js
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("your-project")) {
    const projectId = new URL(supabaseUrl).hostname.split(".")[0];
    const defaultStorageKey = projectId ? `sb-${projectId}-auth-token` : "";

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const all = request.cookies.getAll();
          if (defaultStorageKey && !all.some((c) => c.name.startsWith(defaultStorageKey))) {
            const mapped = [...all];
            for (const c of all) {
              if (c.name.startsWith("sb-auth-token")) {
                mapped.push({
                  name: c.name.replace("sb-auth-token", defaultStorageKey),
                  value: c.value,
                });
              }
            }
            return mapped;
          }
          return all;
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // Sincroniza o cabeçalho 'cookie' interno para que Server Components recebam a sessão renovada
          requestHeaders.set(
            "cookie",
            request.cookies
              .getAll()
              .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
              .join("; ")
          );
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // Chama getUser() para validar e renovar token expirado se necessário
    await supabase.auth.getUser();
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
