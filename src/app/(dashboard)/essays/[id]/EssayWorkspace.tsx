"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateEssay, deleteEssay, createEssay } from "@/app/actions/essays";
import { 
  Save, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft, 
  Bot, 
  Sparkles, 
  BookOpen, 
  AlertCircle, 
  PenTool, 
  Copy, 
  RotateCcw, 
  Wand2, 
  Sliders 
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { generateBrainstorm, reviewEssay, refineEssayDraft, improveEssayDraft } from "@/app/actions/ai";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [activeTab, setActiveTab] = useState<"library" | "ai">("ai");
  const [aiOutput, setAiOutput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Follow-up actions state
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState("");

  // Refs for tracking changes and auto-save
  const latestContentRef = useRef(content);
  const latestTitleRef = useRef(title);
  const latestTopicRef = useRef(topic);

  useEffect(() => {
    latestContentRef.current = content;
    latestTitleRef.current = title;
    latestTopicRef.current = topic;
  }, [content, title, topic]);

  // 2-MINUTE AUTO-SAVE ENGINE (120,000ms)
  useEffect(() => {
    const autoSaveInterval = setInterval(async () => {
      if (initialEssay?.id && latestContentRef.current.trim()) {
        try {
          setSaveStatus("saving");
          await updateEssay(initialEssay.id, {
            title: latestTitleRef.current,
            topic: latestTopicRef.current,
            content: latestContentRef.current
          });
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setLastAutoSaveTime(timeStr);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2500);
        } catch (err) {
          console.error("Auto-save error:", err);
          setSaveStatus("error");
        }
      }
    }, 120000); // 2 minutes

    return () => clearInterval(autoSaveInterval);
  }, [initialEssay?.id]);

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      if (initialEssay?.id) {
        await updateEssay(initialEssay.id, { title, topic, content });
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastAutoSaveTime(timeStr);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        const { id } = await createEssay(title, topic, content);
        setSaveStatus("saved");
        router.push(`/essays/${id}`);
      }
    } catch (err) {
      setSaveStatus("error");
    }
  };

  const handleCopyText = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      setAiError(err.message || "Failed to generate brainstorm.");
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
      setAiError(err.message || "Failed to review essay.");
    } finally {
      setAiLoading(false);
    }
  };

  // Follow-Up Action 1: Refine It (Custom tone/focus)
  const handleRefineSubmit = async () => {
    if (!refineInstruction.trim()) return;
    setIsRefineModalOpen(false);
    setAiLoading(true);
    setAiError("");
    try {
      const refinedText = await refineEssayDraft(content, refineInstruction);
      setContent(refinedText);
      setRefineInstruction("");
      if (initialEssay?.id) {
        await updateEssay(initialEssay.id, { content: refinedText });
      }
    } catch (err: any) {
      setAiError("Failed to refine essay. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  // Follow-Up Action 2: Improve It (Grammar & Flow Polish)
  const handleImproveDraft = async () => {
    if (!content.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const improvedText = await improveEssayDraft(content);
      setContent(improvedText);
      if (initialEssay?.id) {
        await updateEssay(initialEssay.id, { content: improvedText });
      }
    } catch (err: any) {
      setAiError("Failed to improve essay. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  // Follow-Up Action 3: Start Over (Return to Interview Wizard)
  const handleStartOver = () => {
    if (confirm("Are you sure you want to start over? This will return you to the AI interview wizard.")) {
      router.push("/essays/new");
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6">
      
      {/* Editor Side (Left) */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Top Toolbar */}
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

          <div className="flex items-center gap-3">
            {/* Auto-Save & Manual Save Status */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              {saveStatus === "saving" && (
                <><Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" /> Saving...</>
              )}
              {saveStatus === "saved" && (
                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {lastAutoSaveTime ? `Auto-saved at ${lastAutoSaveTime}` : "Saved"}</>
              )}
              {saveStatus === "idle" && lastAutoSaveTime && (
                <span className="text-slate-400 text-[11px]">Auto-saved {lastAutoSaveTime}</span>
              )}
              {saveStatus === "error" && (
                <span className="text-red-500 font-bold">Failed to save</span>
              )}
            </div>
            
            <Button onClick={handleCopyText} variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs border-slate-200">
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Copy Text"}
            </Button>

            <Button onClick={handleSave} disabled={saveStatus === "saving"} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 font-bold shadow-sm text-xs">
              <Save className="w-4 h-4" /> Save
            </Button>

            {initialEssay?.id && (
              <form action={async () => {
                if(confirm("Are you sure you want to delete this essay?")) {
                  await deleteEssay(initialEssay.id);
                }
              }}>
                <button type="submit" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Delete Essay">
                  <Trash2 className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* 3 Follow-Up Options Toolbar */}
        <div className="flex flex-wrap items-center justify-between px-6 py-2.5 bg-violet-50/40 border-b border-violet-100 text-xs font-semibold">
          <div className="flex items-center gap-2 text-violet-700 font-bold">
            <Sparkles className="w-4 h-4" /> AI Actions:
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRefineModalOpen(true)}
              disabled={aiLoading || !content}
              className="h-8 rounded-lg bg-white border-violet-200 text-violet-700 hover:bg-violet-50 text-xs gap-1.5 font-bold"
            >
              <Sliders className="w-3.5 h-3.5" /> Refine It
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleImproveDraft}
              disabled={aiLoading || !content}
              className="h-8 rounded-lg bg-white border-violet-200 text-violet-700 hover:bg-violet-50 text-xs gap-1.5 font-bold"
            >
              <Wand2 className="w-3.5 h-3.5" /> Improve It
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleStartOver}
              className="h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs gap-1.5 font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Start Over
            </Button>
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
              rows={2}
            />
          </div>

          <div className="flex-1 flex flex-col min-h-[360px]">
            <div className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 flex justify-between items-center">
              <span>Essay Draft</span>
              <div className="flex items-center gap-3 text-slate-500 font-semibold normal-case">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{charCount} characters</span>
              </div>
            </div>
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
            AI Coach
          </button>
          <button 
            onClick={() => setActiveTab("library")}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "library" ? "text-violet-600 border-b-2 border-violet-600 bg-violet-50/30" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <BookOpen className="w-4 h-4" />
            Prompts
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          
          {activeTab === "library" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 mb-6">Select a common prompt to insert into your prompt field.</p>
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
                  <span className="text-xs font-bold text-center">Brainstorm Angles</span>
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
                    {aiOutput.split('\n').map((line, i) => (
                      <p key={i} className="mb-2">{line.replace(/\*\*/g, '')}</p> 
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center gap-2">
                    <Sparkles className="w-8 h-8 opacity-20" />
                    <p>Select an AI action above or use the Refine/Improve buttons to polish your draft.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Refine Instruction Modal */}
      <Dialog open={isRefineModalOpen} onOpenChange={setIsRefineModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-violet-600" /> Refine Essay Tone or Focus
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tell AI how you want to adjust the draft while keeping your personal stories intact.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <textarea
              value={refineInstruction}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRefineInstruction(e.target.value)}
              placeholder="e.g., Make the opening more inspiring, focus more on my leadership, or adjust tone to be more formal..."
              className="w-full rounded-xl border border-slate-200 text-sm p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsRefineModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleRefineSubmit} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold">
              Refine Essay <Sparkles className="w-4 h-4 ml-1.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
