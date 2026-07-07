import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DocumentsVault } from "./DocumentsVault";
import { FolderOpen } from "lucide-react";

export const metadata = {
  title: "Schoolari — Documents Vault",
};

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch user's documents, ordered by newest first
  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-red-500 bg-red-50 rounded-xl">
        Failed to load documents: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          Documents Vault
          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
            <FolderOpen className="w-4 h-4" />
          </div>
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl">
          A secure, organized repository for all your educational files. Stop hunting through Google Drive—upload your transcripts, report cards, and resumes here.
        </p>
      </div>

      <DocumentsVault initialDocuments={documents || []} userId={user.id} />
    </div>
  );
}
