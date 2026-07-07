"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateEssay, deleteEssay, createEssay } from "@/app/actions/essays";
import { Save, Trash2, CheckCircle2, Loader2, ArrowLeft, Bot, Sparkles, BookOpen, AlertCircle, PenTool } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { generateBrainstorm, reviewEssay } from "@/app/actions/ai";

const PROMPT_LIBRARY = [
  "Discuss an accomplishment, event, or realization that sparked a period of personal growth.",
  "Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time.",
  "Reflect on a time when you questioned or challenged a belief or idea.",
  "Describe a problem you've solved or a problem you'd like to solve.",
  "Discuss your reasons for pursuing the major you have selected."
];

export function EssayWorkspace({ initialEssay }: { initialEssay: any | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialEssay?.title || "");
  const [topic, setTopic] = useState(initialEssay?.topic || "");
  const [content, setContent] = useState(initialEssay?.content || "");
  
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error" | "saved">("idle");

  const [activeTab, setActiveTab] = useState<"library" | "ai">("ai");
  const [aiOutput, setAiOutput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      if (initialEssay?.id) {
        // Update existing essay
        await updateEssay(initialEssay.id, { title, topic, content });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        // Create new essay
        const { id } = await createEssay(title, topic, content);
        setSaveStatus("saved");
        router.push(`/essays/${id}`);
      }
    } catch (err) {
      setSaveStatus("error");
    }
  };

  const handleBrainstorm = async () => {
    if (!topic.trim()) {
      setAiError("Please enter a topic or prompt first!");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiOutput("");
    try {
      const result = await generateBrainstorm(topic);
      setAiOutput(result);
    } catch (err: any) {
      if (err.message.includes("MISSING")) {
        setAiError("OpenAI API Key is missing. Please add OPENAI_API_KEY to your .env.local file.");
      } else {
        setAiError("Failed to generate brainstorm. Try again.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleReview = async () => {
    if (!content.trim() || content.length < 50) {
      setAiError("Please write at least a few sentences before requesting a review.");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiOutput("");
    try {
      const result = await reviewEssay(content);
      setAiOutput(result);
    } catch (err: any) {
      if (err.message.includes("MISSING")) {
        setAiError("OpenAI API Key is missing. Please add OPENAI_API_KEY to your .env.local file.");
      } else {
        setAiError("Failed to review essay. Try again.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6">
      
      {/* Editor Side (Left) */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
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
            
            <Button onClick={handleSave} disabled={saveStatus === "saving"} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 font-bold shadow-sm">
              <Save className="w-4 h-4" /> Save
            </Button>

            {initialEssay?.id && (
              <form action={async () => {
                if(confirm("Are you sure you want to delete this essay?")) {
                  await deleteEssay(initialEssay.id);
                }
              }}>
                <button type="submit" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex flex-col flex-1 p-6 gap-4 overflow-y-auto hide-scrollbar">
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
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 flex justify-between">
              Essay Draft
              <span className="text-slate-300 font-normal normal-case">{content.split(/\s+/).filter(Boolean).length} words</span>
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

      {/* Assistant Side (Right) */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-shrink-0">
        <div className="flex w-full border-b border-slate-100">
          <button 
            onClick={() => setActiveTab("ai")}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "ai" ? "text-violet-600 border-b-2 border-violet-600 bg-violet-50/30" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <Sparkles className="w-4 h-4" />
            AI Assistant
          </button>
          <button 
            onClick={() => setActiveTab("library")}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "library" ? "text-violet-600 border-b-2 border-violet-600 bg-violet-50/30" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <BookOpen className="w-4 h-4" />
            Prompt Library
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          
          {activeTab === "library" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 mb-6">Select a common prompt to instantly insert it into your topic field.</p>
              {PROMPT_LIBRARY.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setTopic(p)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:shadow-md transition-all group"
                >
                  <p className="text-sm text-slate-700 leading-relaxed group-hover:text-violet-700 transition-colors">{p}</p>
                </button>
              ))}
            </div>
          )}

          {activeTab === "ai" && (
            <div className="flex flex-col h-full">
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button 
                  onClick={handleBrainstorm}
                  disabled={aiLoading}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50"
                >
                  <Bot className="w-6 h-6 mb-2" />
                  <span className="text-xs font-bold text-center">Brainstorm Topic</span>
                </button>
                <button 
                  onClick={handleReview}
                  disabled={aiLoading}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <PenTool className="w-6 h-6 mb-2" />
                  <span className="text-xs font-bold text-center">Review Draft</span>
                </button>
              </div>

              {aiError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{aiError}</p>
                </div>
              )}

              <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 overflow-y-auto text-sm text-slate-700 leading-relaxed shadow-inner">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-violet-500 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="font-medium animate-pulse">AI is thinking...</span>
                  </div>
                ) : aiOutput ? (
                  <div className="prose prose-sm prose-slate max-w-none">
                    {/* Very basic markdown rendering for the output */}
                    {aiOutput.split('\n').map((line, i) => (
                      <p key={i} className="mb-2">{line.replace(/\*\*/g, '')}</p> 
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center gap-2">
                    <Sparkles className="w-8 h-8 opacity-20" />
                    <p>Select an action above to get AI assistance on your essay.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
