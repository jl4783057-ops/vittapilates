import React, { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/ui/AdminSidebar";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  // Se for a tela de login administrativo (/admin/login), renderiza sem a sidebar e sem redirecionar
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login")) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] antialiased">
        <Suspense fallback={null}>{children}</Suspense>
      </div>
    );
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSessionToken(session)) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col antialiased">
      <div className="flex-1 flex flex-col lg:flex-row">
        <Suspense fallback={<div className="w-64 h-screen bg-white" />}>
          <AdminSidebar />
        </Suspense>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Suspense fallback={<div className="p-8 text-center text-xs text-[#827B77]">Carregando painel...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
