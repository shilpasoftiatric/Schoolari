import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EssayWorkspace } from "../[id]/EssayWorkspace";

export const metadata = {
  title: "Schoolari — New Essay",
};

export default async function NewEssayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
      <EssayWorkspace initialEssay={null} />
    </div>
  );
}
