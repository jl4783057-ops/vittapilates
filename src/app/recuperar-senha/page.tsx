import { Suspense } from "react";
import { RecoverPasswordClient } from "./RecoverPasswordClient";
import { RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

export default function RecoverPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
          <div className="p-6 bg-white rounded-3xl border border-[#EADBCE] shadow-sm flex items-center gap-3 text-xs text-[#827B77]">
            <RefreshCw className="w-4 h-4 text-[#B77D82] animate-spin" />
            Carregando página de recuperação...
          </div>
        </div>
      }
    >
      <RecoverPasswordClient />
    </Suspense>
  );
}
