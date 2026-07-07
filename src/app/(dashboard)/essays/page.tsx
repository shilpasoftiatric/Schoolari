import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PenTool, Plus, FileText, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { createEssay } from "@/app/actions/essays";

export const metadata = {
  title: "Schoolari — Essay Workspace",
};

export default async function EssaysDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: essays, error } = await supabase
    .from("essays")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Failed to load essays: {error.message}</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Essay Workspace
            <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-600">
              <PenTool className="w-4 h-4" />
            </div>
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl">
            Draft, organize, and perfect your scholarship essays with the help of our AI-powered brainstorming and review assistants.
          </p>
        </div>

        <Link href="/essays/new" className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm shadow-violet-200">
          <Plus className="w-5 h-5" />
          New Essay
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(!essays || essays.length === 0) ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No essays yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">
              Start writing your first draft. Our AI assistant is ready to help you brainstorm!
            </p>
          </div>
        ) : (
          essays.map((essay) => (
            <Link key={essay.id} href={`/essays/${essay.id}`} className="group bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 block relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full blur-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 text-slate-400 group-hover:text-violet-600 group-hover:bg-violet-50 transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    essay.status === 'draft' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    essay.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    'bg-blue-50 text-blue-600 border border-blue-100'
                  }`}>
                    {essay.status.replace('_', ' ')}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-violet-700 transition-colors">
                  {essay.title || "Untitled Essay"}
                </h3>
                
                <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-1">
                  {essay.topic || "No topic specified."}
                </p>

                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mt-auto pt-4 border-t border-slate-100">
                  <Clock className="w-3.5 h-3.5" />
                  Updated {new Date(essay.updated_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
