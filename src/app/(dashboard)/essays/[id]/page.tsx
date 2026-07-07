import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EssayWorkspace } from "./EssayWorkspace";

export const metadata = {
  title: "Schoolari — Essay Editor",
};

export default async function EssayEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: essay, error } = await supabase
    .from("essays")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !essay) {
    redirect("/essays");
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
      <EssayWorkspace initialEssay={essay} />
    </div>
  );
}
