import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionDurationSeconds,
  createAdminSessionToken,
  verifyAdminCredentials,
} from "@/lib/admin-session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/audit";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // Rate Limiting Rigoroso: Máximo 5 tentativas por minuto por IP, bloqueio de 15 minutos em caso de estouro
  const rateLimit = checkRateLimit(`admin-login:${ip}`, {
    maxRequests: 5,
    windowSeconds: 60,
    blockDurationSeconds: 900,
  });

  if (!rateLimit.success) {
    void logSecurityEvent({
      eventType: "admin_login_rate_limited",
      actorType: "anonymous",
      ipAddress: ip,
      details: { retryAfterSeconds: rateLimit.retryAfterSeconds },
    });

    console.warn(`[Segurança] Tentativas de login administrativo bloqueadas por excesso para IP: ${ip}`);
    return NextResponse.json(
      {
        error: `Muitas tentativas incorretas. Por segurança, tente novamente em ${Math.ceil(
          (rateLimit.retryAfterSeconds ?? 60) / 60
        )} minutos.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds ?? 60),
        },
      }
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Não foi possível validar o acesso." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const result = verifyAdminCredentials(email, password);

  if (result === "not-configured") {
    return NextResponse.json(
      { error: "O acesso administrativo ainda não foi configurado neste ambiente." },
      { status: 503 },
    );
  }
  if (result === "invalid") {
    void logSecurityEvent({
      eventType: "admin_login_failed",
      actorType: "anonymous",
      actorId: email,
      ipAddress: ip,
    });

    console.warn(`[Segurança] Falha de autenticação administrativa para conta '${email}' a partir do IP ${ip}`);
    return NextResponse.json(
      { error: "E-mail ou senha não autorizados para o painel." },
      {
        status: 401,
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  }

  void logSecurityEvent({
    eventType: "admin_login_success",
    actorType: "admin",
    actorId: email.trim().toLowerCase(),
    ipAddress: ip,
  });

  console.log(`[Segurança] Login administrativo concedido com sucesso para '${email.trim().toLowerCase()}' (IP: ${ip})`);

  const { token, expiresAt } = createAdminSessionToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(expiresAt),
    maxAge: adminSessionDurationSeconds,
  });
  return response;
}

export async function DELETE(request: Request) {
  const ip = getClientIp(request);
  void logSecurityEvent({
    eventType: "admin_logout",
    actorType: "admin",
    ipAddress: ip,
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}
