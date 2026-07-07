"use client";

import { useState } from "react";
import { generateIncomeIdeas, addIncomeGoal, updateEarnedAmount, deleteIncomeGoal } from "@/app/actions/income";
import { DollarSign, Sparkles, Plus, Trash2, ArrowRight, Loader2, BookOpen, Scissors, BrainCircuit, PlaySquare, Laptop, Lightbulb, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const CURATED_HUSTLES = [
  { icon: BrainCircuit, color: "text-blue-500", bg: "bg-blue-50", title: "Tutoring", earning: "$15-$30 / hr", desc: "Help younger students with subjects you excel in. Great for math, science, or test prep." },
  { icon: Scissors, color: "text-emerald-500", bg: "bg-emerald-50", title: "Lawn & Yard Care", earning: "$20-$50 / lawn", desc: "Offer mowing, raking, or snow shoveling services to neighbors." },
  { icon: BookOpen, color: "text-amber-500", bg: "bg-amber-50", title: "Sell Study Guides", earning: "Passive", desc: "Format and sell your excellent class notes or study guides on platforms like Nexus Notes." },
  { icon: PlaySquare, color: "text-rose-500", bg: "bg-rose-50", title: "Content Creation", earning: "Variable", desc: "Start a YouTube channel or TikTok account about a niche hobby or college prep." },
  { icon: Laptop, color: "text-fuchsia-500", bg: "bg-fuchsia-50", title: "Freelance Services", earning: "$20+ / hr", desc: "Use Fiverr or Upwork to offer graphic design, video editing, or writing." },
  { icon: Lightbulb, color: "text-violet-500", bg: "bg-violet-50", title: "SMB Social Media", earning: "$100+ / mo", desc: "Manage Instagram or TikTok accounts for local small businesses." },
];

export function IncomeDashboard({ initialGoals }: { initialGoals: any[] }) {
  const [goals, setGoals] = useState(initialGoals);
  
  // AI Form State
  const [age, setAge] = useState("");
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("Suburban");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiIdeas, setAiIdeas] = useState<any[]>([]);

  // Add Goal Form
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  
  // Goal Updating
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!age || !skills) return;
    setIsGenerating(true);
    setAiError("");
    setAiIdeas([]);

    try {
      const results = await generateIncomeIdeas(age, skills, location);
      setAiIdeas(results);
    } catch (err: any) {
      if (err.message.includes("MISSING_API_KEY")) {
        setAiError("OpenAI API Key is missing. Please add OPENAI_API_KEY to your .env.local file.");
      } else {
        setAiError(err.message || "Failed to generate ideas.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTarget) return;
    setIsAddingGoal(true);
    try {
      const newGoal = await addIncomeGoal(newTitle, parseFloat(newTarget));
      setGoals([newGoal, ...goals]);
      setNewTitle("");
      setNewTarget("");
    } catch (err) {
      alert("Failed to add goal.");
    } finally {
      setIsAddingGoal(false);
    }
  };

  const handleUpdateProgress = async (id: string, currentEarned: number, addAmount: number) => {
    setUpdatingId(id);
    try {
      const newTotal = currentEarned + addAmount;
      await updateEarnedAmount(id, newTotal);
      setGoals(goals.map(g => g.id === id ? { ...g, earned_amount: newTotal } : g));
    } catch (err) {
      alert("Failed to update progress.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
      await deleteIncomeGoal(id);
      setGoals(goals.filter(g => g.id !== id));
    } catch (err) {
      alert("Failed to delete goal.");
    }
  };

  return (
    <div className="space-y-8 pb-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-emerald-500" />
          Earn Income
        </h1>
        <p className="text-slate-500 mt-2 font-medium max-w-2xl">
          Don't wait for college to start building your savings. Discover actionable ways to earn money right now based on your unique skills, and track your progress.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left/Main Column: Curated & AI */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* AI Generator */}
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-1 shadow-lg shadow-violet-200">
            <div className="bg-white rounded-[22px] p-6 sm:p-8 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 text-violet-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 leading-tight">AI Hustle Generator</h2>
                  <p className="text-sm text-slate-500">Get personalized side-hustle ideas instantly.</p>
                </div>
              </div>

              <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Age</label>
                  <Input value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 16" required className="bg-slate-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Location Type</label>
                  <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="Urban">Urban / City</option>
                    <option value="Suburban">Suburban</option>
                    <option value="Rural">Rural</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Skills, Hobbies, or Interests</label>
                  <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. Video games, writing, good with dogs, know HTML" required className="bg-slate-50" />
                </div>
                <div className="sm:col-span-3 pt-2">
                  <Button type="submit" disabled={isGenerating} className="w-full bg-slate-900 hover:bg-violet-600 text-white rounded-xl font-bold h-12 transition-all">
                    {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Generating Ideas...</> : "Generate My Custom Hustles"}
                  </Button>
                </div>
              </form>

              {aiError && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                  {aiError}
                </div>
              )}

              {aiIdeas.length > 0 && (
                <div className="space-y-4 mt-8 pt-8 border-t border-slate-100">
                  <h3 className="font-bold text-slate-900">Your Personalized Ideas:</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {aiIdeas.map((idea, i) => (
                      <div key={i} className="p-5 rounded-2xl border border-violet-100 bg-violet-50/50">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-extrabold text-violet-900">{idea.title}</h4>
                          <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2 py-1 rounded-md">{idea.potential_earnings}</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{idea.description}</p>
                        <div className="text-xs font-medium text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-100">
                          <span className="font-bold text-slate-700">Startup Tools:</span> {idea.startup_tools}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Curated Hustles */}
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-4">Proven Student Hustles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CURATED_HUSTLES.map((hustle, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-3">
                    <div className={`w-10 h-10 rounded-xl ${hustle.bg} ${hustle.color} flex items-center justify-center`}>
                      <hustle.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                      {hustle.earning}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">{hustle.title}</h3>
                  <p className="text-sm text-slate-500 leading-snug">{hustle.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Goal Tracker */}
        <div className="xl:col-span-1">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl sticky top-6">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-700">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-extrabold text-white">Income Goals</h2>
            </div>

            <form onSubmit={handleAddGoal} className="mb-8 space-y-3">
              <Input 
                value={newTitle} onChange={(e) => setNewTitle(e.target.value)} 
                placeholder="What are you saving for?" 
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" 
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                  <Input 
                    type="number" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} 
                    placeholder="Goal Amount" 
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pl-7" 
                  />
                </div>
                <Button type="submit" disabled={isAddingGoal} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
                  {isAddingGoal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </form>

            <div className="space-y-4">
              {goals.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No active goals. Set a goal above to start tracking your hustle earnings!</p>
              ) : (
                goals.map((goal) => {
                  const percent = Math.min(100, Math.round((goal.earned_amount / goal.target_amount) * 100));
                  return (
                    <div key={goal.id} className="bg-slate-800 rounded-2xl p-4 border border-slate-700 relative group">
                      <button 
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-slate-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      
                      <h4 className="font-bold text-white mb-1 pr-6">{goal.hustle_title}</h4>
                      
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-2xl font-extrabold text-emerald-400">${goal.earned_amount}</span>
                        <span className="text-xs font-medium text-slate-400 mb-1">of ${goal.target_amount}</span>
                      </div>
                      
                      <Progress value={percent} className="h-2 bg-slate-900 mb-3 [&>div]:bg-emerald-500" />
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleUpdateProgress(goal.id, goal.earned_amount, 10)}
                          disabled={updatingId === goal.id}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                        >
                          + $10
                        </button>
                        <button 
                          onClick={() => handleUpdateProgress(goal.id, goal.earned_amount, 50)}
                          disabled={updatingId === goal.id}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                        >
                          + $50
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
