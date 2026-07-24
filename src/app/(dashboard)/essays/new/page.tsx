import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EssayInterviewWizard } from "./EssayInterviewWizard";

export const metadata = {
  title: "New Essay | Schoolari",
};

export default async function NewEssayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
      <EssayInterviewWizard />
    </div>
  );
}
