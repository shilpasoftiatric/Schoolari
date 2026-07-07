"use client";

import { useState, useEffect, useRef } from "react";
import { updateEssay, deleteEssay } from "@/app/actions/essays";
import { Save, Trash2, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function EssayEditor({ initialEssay }: { initialEssay: any }) {
  const [title, setTitle] = useState(initialEssay.title || "");
  const [topic, setTopic] = useState(initialEssay.topic || "");
  const [content, setContent] = useState(initialEssay.content || "");
  
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Expose current text to parent or global if needed, but for now we manage it here
  // Actually, the AI Assistant needs access to the topic and content! 
  // We will handle that by passing it back up to the page if needed, or by wrapping them in a context.
  // For simplicity, we can just export a custom event or use a ref, but let's just make the Editor self-contained for now
  // Wait, the AI Assistant is a sibling component. We will lift state to the page level!
  // Let me rethink: I should make EssayEditor accept props for these states so the Page can pass them to the AI Assistant.

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-4 flex-1">
          <Link href="/essays" className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          <Input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Essay Title"
            className="text-lg font-bold bg-transparent border-transparent hover:border-slate-200 focus-visible:ring-violet-500 h-10 px-2 max-w-sm"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            {saveStatus === "saving" && (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
            )}
            {saveStatus === "saved" && (
              <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Saved</>
            )}
            {saveStatus === "error" && (
              <span className="text-red-500">Failed to save</span>
            )}
          </div>
          
          <form action={async () => {
            if(confirm("Are you sure you want to delete this essay?")) {
              await deleteEssay(initialEssay.id);
            }
          }}>
            <button type="submit" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex flex-col flex-1 p-6 gap-4 overflow-y-auto">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
            Prompt / Topic
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="E.g., Discuss an accomplishment, event, or realization that sparked a period of personal growth..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-slate-400"
            rows={3}
          />
        </div>

        <div className="flex-1 flex flex-col min-h-[400px]">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
            Essay Draft
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your essay here..."
            className="flex-1 w-full resize-none rounded-xl border border-slate-200 p-6 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-slate-300"
          />
        </div>
      </div>
    </div>
  );
}
