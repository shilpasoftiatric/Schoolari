import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DocumentsVault } from "./DocumentsVault";
import { FolderOpen } from "lucide-react";

export const metadata = {
  title: "Documents Vault",
};

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { getStudentDashboardData } = await import("@/services/data-fetcher");
  const { masterId } = await getStudentDashboardData(user.id);
  const adminClient = await createAdminClient();

  // Fetch all documents in parallel for the shared household account
  const [docsRes, resumesRes, essaysRes] = await Promise.all([
    adminClient.from("documents").select("*").eq("user_id", masterId).order("created_at", { ascending: false }),
    adminClient.from("resumes").select("*").eq("user_id", masterId),
    adminClient.from("essays").select("*").eq("user_id", masterId).order("updated_at", { ascending: false })
  ]);

  if (docsRes.error) {
    return (
      <div className="p-8 text-red-500 bg-red-50 rounded-xl">
        Failed to load documents: {docsRes.error.message}
      </div>
    );
  }

  // Map physical uploads
  const physicalDocs = (docsRes.data || []).map(doc => ({
    ...doc,
    source: "upload",
    is_virtual: false
  }));

  // Map virtual resumes
  const virtualResumes: any[] = [];
  if (resumesRes.data && resumesRes.data.length > 0) {
    const r = resumesRes.data[0];
    if (r.content && r.content.resumes && Array.isArray(r.content.resumes)) {
      r.content.resumes.forEach((resume: any) => {
        virtualResumes.push({
          id: resume.id,
          name: resume.title || "Resume",
          type: "resume",
          file_url: "/resume", // Link to builder
          size_bytes: 0,
          created_at: resume.last_modified || r.updated_at || r.created_at,
          source: "resume_builder",
          is_virtual: true
        });
      });
    }
  }

  // Map virtual essays
  const virtualEssays = (essaysRes.data || []).map(essay => ({
    id: essay.id,
    name: essay.title || "Untitled Essay",
    type: "essay",
    file_url: `/essays/${essay.id}`, // Link to builder
    size_bytes: 0,
    created_at: essay.updated_at || essay.created_at,
    source: "essay_builder",
    is_virtual: true
  }));

  const allDocuments = [...physicalDocs, ...virtualResumes, ...virtualEssays].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

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

      <DocumentsVault initialDocuments={allDocuments} userId={masterId} />
    </div>
  );
}
