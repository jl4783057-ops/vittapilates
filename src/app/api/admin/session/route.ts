import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionDurationSeconds,
  createAdminSessionToken,
  verifyAdminCredentials,
} from "@/lib/admin-session";

export async function POST(request: Request) {
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
    return NextResponse.json({ error: "E-mail ou senha não autorizados para o painel." }, { status: 401 });
  }

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

export async function DELETE() {
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
