import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EssayWorkspace } from "./EssayWorkspace";
import { getAiDisclaimerStatus } from "@/app/actions/ai-disclaimer";
import { AIDisclaimerModal } from "@/components/ui/AIDisclaimerModal";

export const metadata = {
  title: "Essay Editor",
};

export const dynamic = "force-dynamic";

export default async function EssayEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ essayDisclaimerAccepted }, { data: essay, error }] = await Promise.all([
    getAiDisclaimerStatus(),
    supabase
      .from("essays")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
  ]);

  if (error || !essay) {
    redirect("/essays");
  }

  return (
    <>
      {!essayDisclaimerAccepted && (
        <AIDisclaimerModal isOpen={true} feature="essay" />
      )}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
        <EssayWorkspace initialEssay={essay} />
      </div>
    </>
  );
}
