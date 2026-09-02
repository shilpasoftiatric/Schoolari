"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { Settings2, Users, Search, Filter, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updateAILimits } from "./actions";
import { getPlanFromPriceId } from "@/lib/subscription";
import { useRouter } from "next/navigation";

function formatCycleMonth(rawCycle?: string) {
  if (!rawCycle || rawCycle === "Current") return "Current Cycle";
  if (/^\d{4}-\d{2}$/.test(rawCycle)) {
    const [y, m] = rawCycle.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  const dateMatches = rawCycle.match(/(\d{4}-\d{2}-\d{2})/g);
  if (dateMatches && dateMatches.length >= 2) {
    const d1 = new Date(dateMatches[0]);
    const d2 = new Date(dateMatches[1]);
    const f1 = d1.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const f2 = d2.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${f1} – ${f2}`;
  } else if (dateMatches && dateMatches.length === 1) {
    const d = new Date(dateMatches[0]);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return rawCycle;
}

interface AILimitsClientProps {
  initialLimits: any[];
  students: any[];
  defaultTab?: "limits" | "usage";
}

export function AILimitsClient({ initialLimits, students, defaultTab }: AILimitsClientProps) {
  const defaultFallback = [
    { plan: "starter", ask_ai_limit: 20, essay_limit: 3, resume_limit: 2, cover_letter_limit: 0, monthly_budget_cap_usd: 15.00 },
    { plan: "scholar", ask_ai_limit: 50, essay_limit: 10, resume_limit: 5, cover_letter_limit: 5, monthly_budget_cap_usd: 25.00 },
    { plan: "elite", ask_ai_limit: 999999, essay_limit: 999999, resume_limit: 999999, cover_letter_limit: 999999, monthly_budget_cap_usd: 50.00 },
  ];

  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [limits, setLimits] = useState(initialLimits.length > 0 ? initialLimits : defaultFallback);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"limits" | "usage">(defaultTab || "limits");
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  const handleTabChange = (tab: "limits" | "usage") => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
      toast.success("Student list updated");
    });
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const name = `${student.student_first_name || student.first_name || ""} ${student.student_last_name || student.last_name || ""}`.toLowerCase();
      const email = (student.student_email || student.parent_email || student.email || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.includes(query) || email.includes(query);

      const resolvedPlan = getPlanFromPriceId(student.stripe_price_id) || "starter";
      const matchesPlan = planFilter === "all" || resolvedPlan === planFilter;

      return matchesSearch && matchesPlan;
    });
  }, [students, searchQuery, planFilter]);

  const handleLimitChange = (index: number, field: string, value: string) => {
    const newLimits = [...limits];
    if (field === "monthly_budget_cap_usd") {
      newLimits[index][field] = value === "" ? 0 : parseFloat(value);
    } else {
      newLimits[index][field] = value === "" ? 0 : parseInt(value, 10);
    }
    setLimits(newLimits);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAILimits(limits);
      toast.success("AI limits and budget caps updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update AI limits");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toggle Switch */}
      <div className="flex justify-start mb-6">
        <div className="bg-slate-100 p-1 rounded-xl flex sm:inline-flex w-full sm:w-auto shadow-inner">
          <button
            onClick={() => handleTabChange("limits")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all text-center ${activeTab === "limits" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
          >
            <Settings2 className="w-4 h-4 shrink-0" /> <span>Global AI Limits</span>
          </button>
          <button
            onClick={() => handleTabChange("usage")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all text-center ${activeTab === "usage" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
          >
            <Users className="w-4 h-4 shrink-0" /> <span>Student Usage</span>
          </button>
        </div>
      </div>

      {activeTab === "limits" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">Global AI Document Limits &amp; Monthly Budget Caps</h2>
              <p className="text-xs text-slate-500 leading-relaxed">Essays and Resumes are limited by document creations. Spend caps protect against API overages silently.</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white font-bold shrink-0">
              {isSaving ? "Saving..." : "Save Limits"}
            </Button>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm text-left min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Plan</th>
                  <th className="px-4 py-3">Ask AI (Questions / mo)</th>
                  <th className="px-4 py-3">Essay Docs / mo</th>
                  <th className="px-4 py-3">Resume Docs / mo</th>
                  <th className="px-4 py-3">Cover Letters / mo</th>
                  <th className="px-4 py-3 rounded-tr-lg">Budget Cap ($ USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {limits.map((limit, idx) => (
                  <tr key={limit.plan}>
                    <td className="px-4 py-4 font-semibold capitalize text-slate-900">{limit.plan}</td>
                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        value={limit.ask_ai_limit > 900000 ? "" : limit.ask_ai_limit}
                        placeholder="Unlimited (999999)"
                        onChange={(e) => handleLimitChange(idx, "ask_ai_limit", e.target.value)}
                        className="w-32"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        value={limit.essay_limit > 900000 ? "" : limit.essay_limit}
                        placeholder="Unlimited"
                        onChange={(e) => handleLimitChange(idx, "essay_limit", e.target.value)}
                        className="w-32"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        value={limit.resume_limit > 900000 ? "" : limit.resume_limit}
                        placeholder="Unlimited"
                        onChange={(e) => handleLimitChange(idx, "resume_limit", e.target.value)}
                        className="w-32"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        value={limit.cover_letter_limit > 900000 ? "" : limit.cover_letter_limit}
                        placeholder="Unlimited"
                        onChange={(e) => handleLimitChange(idx, "cover_letter_limit", e.target.value)}
                        className="w-32"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                        <Input
                          type="number"
                          step="1.00"
                          value={limit.monthly_budget_cap_usd ?? (limit.plan === "starter" ? 15 : limit.plan === "scholar" ? 25 : 50)}
                          onChange={(e) => handleLimitChange(idx, "monthly_budget_cap_usd", e.target.value)}
                          className="pl-7"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-3">* In-document AI tools (brainstorm, review, STAR bullets) are unlimited within created documents until the monthly budget cap is reached.</p>
          </div>
        </div>
      )}

      {/* Student Usage Section */}
      {activeTab === "usage" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col gap-4 mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Student AI Usage &amp; Spend</h2>
              <p className="text-xs text-slate-500 mt-0.5">Live tracking of document creations, questions asked, and estimated API spend.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                    className="pl-9 pr-8 py-2 h-10 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent appearance-none cursor-pointer text-slate-700 font-medium w-full sm:w-36"
                  >
                    <option value="all">All Plans</option>
                    <option value="starter">Starter</option>
                    <option value="scholar">Scholar</option>
                    <option value="elite">Elite</option>
                  </select>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-10 w-10 border-slate-200 text-slate-500 hover:text-violet-600 transition-colors shrink-0"
                  title="Refresh student list"
                >
                  <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-violet-600" : ""}`} />
                </Button>
              </div>
            </div>
          </div>

          <div className={`overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 transition-opacity duration-200 ${isRefreshing ? "opacity-50 pointer-events-none" : ""}`}>
            <table className="w-full text-sm text-left min-w-[850px]">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Student</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Questions Asked</th>
                  <th className="px-4 py-3">Essay Docs</th>
                  <th className="px-4 py-3">Resume Docs</th>
                  <th className="px-4 py-3">Cover Letters</th>
                  <th className="px-4 py-3">Estimated Spend</th>
                  <th className="px-4 py-3 rounded-tr-lg">Cap Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const resolvedPlan = getPlanFromPriceId(student.stripe_price_id) || "starter";
                  const planLimit = limits.find(l => l.plan === resolvedPlan) || limits[0];
                  const budgetCap = Number(planLimit?.monthly_budget_cap_usd || (resolvedPlan === "starter" ? 15 : resolvedPlan === "scholar" ? 25 : 50));
                  const currentSpend = Number(student.usage?.estimated_cost_usd || 0);
                  const isOverBudget = currentSpend >= budgetCap;

                  // Dynamic limit calculations
                  const askCount = student.usage?.ask_ai_count || 0;
                  const askLimit = planLimit?.ask_ai_limit ?? 0;
                  const isAskLimitReached = askLimit < 900000 && askCount >= askLimit;
                  const isAskTriggered = isOverBudget || isAskLimitReached;

                  const essayCount = student.usage?.essay_docs_count ?? student.usage?.essay_count ?? 0;
                  const essayLimit = planLimit?.essay_limit ?? 0;
                  const isEssayLimitReached = essayLimit < 900000 && essayCount >= essayLimit;
                  const isEssayTriggered = isOverBudget || isEssayLimitReached;

                  const resumeCount = student.usage?.resume_docs_count ?? student.usage?.resume_count ?? 0;
                  const resumeLimit = planLimit?.resume_limit ?? 0;
                  const isResumeLimitReached = resumeLimit < 900000 && resumeCount >= resumeLimit;
                  const isResumeTriggered = isOverBudget || isResumeLimitReached;

                  const coverCount = student.usage?.cover_letter_count || 0;
                  const coverLimit = planLimit?.cover_letter_limit ?? 0;
                  const isCoverLimitReached = coverLimit < 900000 && coverCount >= coverLimit;
                  const isCoverTriggered = isOverBudget || isCoverLimitReached;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">{student.student_first_name || student.first_name} {student.student_last_name || student.last_name}</div>
                        <div className="text-xs text-slate-500">{student.student_email || student.parent_email || student.email || "No email provided"}</div>
                      </td>
                      <td className="px-4 py-4 capitalize">
                        <span className="bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                          {resolvedPlan}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600 font-medium text-xs whitespace-nowrap">{formatCycleMonth(student.usage?.current_month)}</td>
                      <td className="px-4 py-4">
                        <span className={`font-semibold ${isAskTriggered ? "text-red-600 font-bold" : "text-slate-950"}`}>{askCount}</span> / {askLimit > 900000 ? "∞" : askLimit}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`font-semibold ${isEssayTriggered ? "text-red-600 font-bold" : "text-slate-950"}`}>{essayCount}</span> / {essayLimit > 900000 ? "∞" : essayLimit}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`font-semibold ${isResumeTriggered ? "text-red-600 font-bold" : "text-slate-950"}`}>{resumeCount}</span> / {resumeLimit > 900000 ? "∞" : resumeLimit}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`font-semibold ${isCoverTriggered ? "text-red-600 font-bold" : "text-slate-950"}`}>{coverCount}</span> / {coverLimit > 900000 ? "∞" : coverLimit}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`font-semibold ${isOverBudget ? "text-red-600" : "text-emerald-700"}`}>
                          ${currentSpend.toFixed(2)}
                        </span>
                        <span className="text-slate-400 text-xs ml-1">/ ${budgetCap.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isOverBudget || (isAskLimitReached && isEssayLimitReached && isResumeLimitReached && isCoverLimitReached) ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700">
                            Limit Triggered
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
                            Active (Under Limits)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">No students found matching your criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
