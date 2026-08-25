"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Briefcase, FileText, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCustomJob, updateCustomJob, deleteCustomJob, toggleCustomJobActive,
  createCareerArticle, updateCareerArticle, deleteCareerArticle, toggleCareerArticleActive
} from "@/app/actions/admin-career";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function EmptyJob() {
  return { title: "", company: "", location: "", employment_type: "Full-Time", description: "", apply_url: "", is_active: true };
}

function EmptyArticle() {
  return { title: "", summary: "", content: "", category: "General", external_url: "", image_url: "", is_active: true };
}

export function CareerAdmin({ initialJobs, initialArticles }: { initialJobs: any[], initialArticles: any[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [articles, setArticles] = useState(initialArticles);
  const [activeTab, setActiveTab] = useState<"jobs" | "articles">("jobs");
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [jobForm, setJobForm] = useState(EmptyJob());
  const [articleForm, setArticleForm] = useState(EmptyArticle());
  
  const [isPending, startTransition] = useTransition();

  const broadcastChange = (type: "jobs" | "articles") => {
    try {
      const supabase = createClient();
      const channel = supabase.channel("career-student-live-sync");
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "career_data_updated",
            payload: { type },
          });
        }
      });
    } catch (err) {
      console.warn("Realtime broadcast failed:", err);
    }
  };

  // JOBS HANDLERS
  const handleSaveJob = () => {
    startTransition(async () => {
      const result = isCreating 
        ? await createCustomJob(jobForm)
        : await updateCustomJob(editingId!, jobForm);
        
      if (result?.error) { toast.error(result.error); return; }
      toast.success(`Job ${isCreating ? "created" : "updated"}!`);
      
      // State update
      if (isCreating) {
        const newJob = (result as any)?.data || { id: editingId || "", ...jobForm, created_at: new Date().toISOString() };
        setJobs([newJob, ...jobs]);
      } else {
        setJobs(jobs.map(j => j.id === editingId ? { ...j, ...jobForm } : j));
      }
      
      broadcastChange("jobs");
      setIsCreating(false);
      setEditingId(null);
    });
  };

  const handleDeleteJob = (id: string) => {
    if(!confirm("Are you sure?")) return;
    startTransition(async () => {
      const result = await deleteCustomJob(id);
      if (result?.error) { toast.error(result.error); return; }
      toast.success("Job deleted.");
      setJobs(jobs.filter(j => j.id !== id));
      broadcastChange("jobs");
    });
  };

  const handleToggleJob = (id: string, current: boolean) => {
    startTransition(async () => {
      await toggleCustomJobActive(id, !current);
      setJobs(jobs.map(j => j.id === id ? { ...j, is_active: !current } : j));
      broadcastChange("jobs");
    });
  };

  // ARTICLES HANDLERS
  const handleSaveArticle = () => {
    startTransition(async () => {
      const result = isCreating 
        ? await createCareerArticle(articleForm)
        : await updateCareerArticle(editingId!, articleForm);
        
      if (result?.error) { toast.error(result.error); return; }
      toast.success(`Article ${isCreating ? "created" : "updated"}!`);
      
      if (isCreating) {
        const newArticle = (result as any)?.data || { id: editingId || "", ...articleForm, created_at: new Date().toISOString() };
        setArticles([newArticle, ...articles]);
      } else {
        setArticles(articles.map(a => a.id === editingId ? { ...a, ...articleForm } : a));
      }
      
      broadcastChange("articles");
      setIsCreating(false);
      setEditingId(null);
    });
  };

  const handleDeleteArticle = (id: string) => {
    if(!confirm("Are you sure?")) return;
    startTransition(async () => {
      const result = await deleteCareerArticle(id);
      if (result?.error) { toast.error(result.error); return; }
      toast.success("Article deleted.");
      setArticles(articles.filter(a => a.id !== id));
      broadcastChange("articles");
    });
  };

  const handleToggleArticle = (id: string, current: boolean) => {
    startTransition(async () => {
      await toggleCareerArticleActive(id, !current);
      setArticles(articles.map(a => a.id === id ? { ...a, is_active: !current } : a));
      broadcastChange("articles");
    });
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab("jobs"); setIsCreating(false); setEditingId(null); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "jobs" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Briefcase className="w-4 h-4" /> Custom Jobs
        </button>
        <button
          onClick={() => { setActiveTab("articles"); setIsCreating(false); setEditingId(null); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "articles" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <FileText className="w-4 h-4" /> Career Articles
        </button>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
            if (activeTab === "jobs") setJobForm(EmptyJob());
            else setArticleForm(EmptyArticle());
          }}
          className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> Add {activeTab === "jobs" ? "Job" : "Article"}
        </Button>
      </div>

      {/* JOBS SECTION */}
      {activeTab === "jobs" && (
        <div className="space-y-6">
          {(isCreating || editingId) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900">{isCreating ? "New Custom Job" : "Edit Job"}</h3>
                <button onClick={() => { setIsCreating(false); setEditingId(null); }}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Job Title</Label><Input value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} placeholder="e.g. Software Engineer" /></div>
                <div className="space-y-2"><Label>Company</Label><Input value={jobForm.company} onChange={e => setJobForm({...jobForm, company: e.target.value})} placeholder="e.g. Schoolari" /></div>
                <div className="space-y-2"><Label>Location</Label><Input value={jobForm.location} onChange={e => setJobForm({...jobForm, location: e.target.value})} placeholder="e.g. Remote, NY" /></div>
                <div className="space-y-2"><Label>Employment Type</Label>
                  <select value={jobForm.employment_type} onChange={e => setJobForm({...jobForm, employment_type: e.target.value})} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2"><Label>Apply URL</Label><Input value={jobForm.apply_url} onChange={e => setJobForm({...jobForm, apply_url: e.target.value})} placeholder="https://..." /></div>
                <div className="space-y-2 md:col-span-2"><Label>Description</Label>
                  <textarea rows={4} value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="Job description..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setIsCreating(false); setEditingId(null); }}>Cancel</Button>
                <Button disabled={isPending || !jobForm.title || !jobForm.company} onClick={handleSaveJob} className="bg-slate-900 text-white hover:bg-slate-800">
                  {isPending ? "Saving..." : "Save Job"}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {jobs.length === 0 && !isCreating && (
                <div className="p-12 text-center text-slate-400">No custom jobs created yet.</div>
              )}
              {jobs.map(job => (
                <div key={job.id} className={`p-5 flex items-start gap-4 transition-opacity ${job.is_active ? "" : "opacity-60"}`}>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900">{job.title}</h4>
                    <p className="text-sm text-slate-500 font-medium mb-2">{job.company} · {job.location} · {job.employment_type}</p>
                    <p className="text-sm text-slate-600 line-clamp-2">{job.description}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => handleToggleJob(job.id, job.is_active)} disabled={isPending} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title={job.is_active ? "Deactivate" : "Activate"}>
                      {job.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => { setIsCreating(false); setEditingId(job.id); setJobForm(job); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteJob(job.id)} disabled={isPending} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ARTICLES SECTION */}
      {activeTab === "articles" && (
        <div className="space-y-6">
          {(isCreating || editingId) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900">{isCreating ? "New Article" : "Edit Article"}</h3>
                <button onClick={() => { setIsCreating(false); setEditingId(null); }}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2"><Label>Title</Label><Input value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} placeholder="e.g. How to ace your interview" /></div>
                <div className="space-y-2"><Label>Category</Label><Input value={articleForm.category} onChange={e => setArticleForm({...articleForm, category: e.target.value})} placeholder="e.g. Interview Tips" /></div>
                <div className="space-y-2"><Label>Image URL (optional)</Label><Input value={articleForm.image_url} onChange={e => setArticleForm({...articleForm, image_url: e.target.value})} placeholder="https://..." /></div>
                <div className="space-y-2 md:col-span-2"><Label>External URL (optional)</Label><Input value={articleForm.external_url} onChange={e => setArticleForm({...articleForm, external_url: e.target.value})} placeholder="Link out to another site instead of reading here" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Summary</Label>
                  <textarea rows={2} value={articleForm.summary} onChange={e => setArticleForm({...articleForm, summary: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="Short summary..." />
                </div>
                <div className="space-y-2 md:col-span-2"><Label>Full Content</Label>
                  <textarea rows={6} value={articleForm.content} onChange={e => setArticleForm({...articleForm, content: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="Article content (markdown supported)..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setIsCreating(false); setEditingId(null); }}>Cancel</Button>
                <Button disabled={isPending || !articleForm.title} onClick={handleSaveArticle} className="bg-slate-900 text-white hover:bg-slate-800">
                  {isPending ? "Saving..." : "Save Article"}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {articles.length === 0 && !isCreating && (
              <div className="col-span-1 md:col-span-2 p-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                No career articles created yet.
              </div>
            )}
            {articles.map(article => (
              <div key={article.id} className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col ${article.is_active ? "" : "opacity-60"}`}>
                {article.image_url && (
                  <div className="w-full h-32 bg-slate-100 overflow-hidden">
                    <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded">{article.category}</span>
                  <h4 className="font-bold text-slate-900 mt-2 line-clamp-2">{article.title}</h4>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-3">{article.summary || article.content}</p>
                </div>
                <div className="px-5 pb-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                  <button onClick={() => handleToggleArticle(article.id, article.is_active)} disabled={isPending} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title={article.is_active ? "Deactivate" : "Activate"}>
                    {article.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => { setIsCreating(false); setEditingId(article.id); setArticleForm(article); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteArticle(article.id)} disabled={isPending} className="p-2 rounded-lg hover:bg-red-50 text-red-500 ml-auto"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
