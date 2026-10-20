import { getSiteSettings } from "@/lib/site-settings";
import { QuizClient } from "./QuizClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vitta Pilates • Pratique Onde Estiver",
  description: "Acesso imediato às suas aulas na plataforma Vitta Pilates pelo celular ou computador.",
};

export default async function QuizPage() {
  const siteSettings = await getSiteSettings();
  return <QuizClient siteSettings={siteSettings} />;
}
