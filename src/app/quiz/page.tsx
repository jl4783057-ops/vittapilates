import { getSiteSettings } from "@/lib/site-settings";
import { QuizClient } from "./QuizClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quiz Personalizado • Vitta Pilates",
  description: "Descubra o plano ideal de movimentos e autocuidado para o seu corpo com a Vitta Pilates.",
};

export default async function QuizPage() {
  const siteSettings = await getSiteSettings();
  return <QuizClient siteSettings={siteSettings} />;
}
