import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EssayInterviewWizard } from "./EssayInterviewWizard";
import { getAiDisclaimerStatus } from "@/app/actions/ai-disclaimer";
import { AIDisclaimerModal } from "@/components/ui/AIDisclaimerModal";

export const metadata = {
  title: "New Essay | Schoolari",
};

export const dynamic = "force-dynamic";

export default async function NewEssayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { essayDisclaimerAccepted } = await getAiDisclaimerStatus();

  return (
    <>
      {!essayDisclaimerAccepted && (
        <AIDisclaimerModal isOpen={true} feature="essay" />
      )}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
        <EssayInterviewWizard />
      </div>
    </>
  );
}
