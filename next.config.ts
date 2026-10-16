import type { NextConfig } from "next";

const pubKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (pubKey.startsWith("sb_secret_") || pubKey.startsWith("service_role")) {
  throw new Error(
    "[SEGURANÇA] Chave privilegiada (sb_secret_ ou service_role) detectada em variável NEXT_PUBLIC_! O build foi interrompido para evitar exposição no navegador."
  );
}

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];

    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
    }

    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
