"use client";

import { useState, useMemo } from "react";
import { Search, Filter, RefreshCcw, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScholarshipCard } from "@/components/ui/ScholarshipCard";

export function ScholarshipsList({ initialScholarships }: { initialScholarships: any[] }) {
  const [search, setSearch] = useState("");
  
  // Hardcoded categories as requested
  const categories = [
    "Arts and Design",
    "Business",
    "Education",
    "General",
    "Health and Medicine",
    "Humanities",
    "Social Sciences",
    "STEM",
    "Other"
  ];
  // Draft filter state (before clicking Apply)
  const [draftCategories, setDraftCategories] = useState<string[]>([]);
  const [draftDeadline, setDraftDeadline] = useState<string>("all");

  // Applied filter state
  const [appliedCategories, setAppliedCategories] = useState<string[]>([]);
  const [appliedDeadline, setAppliedDeadline] = useState<string>("all");

  const toggleCategory = (cat: string) => {
    setDraftCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleApply = () => {
    setAppliedCategories(draftCategories);
    setAppliedDeadline(draftDeadline);
  };

  const handleReset = () => {
    setDraftCategories([]);
    setDraftDeadline("all");
    setAppliedCategories([]);
    setAppliedDeadline("all");
    setSearch("");
  };

  const filtered = useMemo(() => {
    let result = [...initialScholarships];
    
    // 1. Filter by Categories
    if (appliedCategories.length > 0) {
      result = result.filter(s => appliedCategories.includes(s.category));
    }
    
    // 2. Filter by Deadline
    if (appliedDeadline !== "all") {
      const now = new Date();
      const deadlineDate = new Date();
      if (appliedDeadline === "30") deadlineDate.setDate(now.getDate() + 30);
      else if (appliedDeadline === "90") deadlineDate.setDate(now.getDate() + 90);
      else if (appliedDeadline === "180") deadlineDate.setDate(now.getDate() + 180);

      result = result.filter(s => {
        if (!s.deadline) return true;
        const d = new Date(s.deadline);
        return d >= now && d <= deadlineDate;
      });
    }

    // 3. Filter by Search Query
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => 
        s.name?.toLowerCase().includes(q) || 
        s.description?.toLowerCase().includes(q) ||
        s.eligible_majors?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [initialScholarships, search, appliedCategories, appliedDeadline]);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      
      {/* Sidebar Filters */}
      <aside className="w-full lg:w-72 shrink-0 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm h-fit lg:sticky lg:top-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-violet-500" /> Filters
          </h2>
          <button onClick={handleReset} className="text-xs font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors">
            <RefreshCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        {/* Category Checklist */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Categories / Studies</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {categories.map((cat: any) => (
              <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${draftCategories.includes(cat) ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300 bg-white group-hover:border-violet-400'}`}>
                  {draftCategories.includes(cat) && <Check className="w-3.5 h-3.5" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={draftCategories.includes(cat)} 
                  onChange={() => toggleCategory(cat)} 
                />
                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Deadline Range */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Deadline Range</h3>
          <select 
            value={draftDeadline} 
            onChange={(e) => setDraftDeadline(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">Any Deadline</option>
            <option value="30">Next 30 Days</option>
            <option value="90">Next 3 Months</option>
            <option value="180">Next 6 Months</option>
          </select>
        </div>

        <Button onClick={handleApply} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl h-11">
          Apply Filters
        </Button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6 min-w-0">
        
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <Input 
            type="text"
            placeholder="Search scholarships by name, major, or keywords..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-14 w-full bg-white border-slate-200 rounded-2xl text-base shadow-sm focus-visible:ring-violet-500 font-medium"
          />
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-end px-1">
          <p className="text-slate-500 font-medium text-sm">
            Showing <strong className="text-slate-900">{filtered.length}</strong> scholarships
          </p>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No scholarships found</h3>
            <p className="text-slate-500 max-w-sm">
              We couldn't find any active scholarships matching your criteria. Try resetting your filters or adjusting your search.
            </p>
            <Button onClick={handleReset} variant="outline" className="mt-6 rounded-xl font-bold">
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((scholarship) => (
              <ScholarshipCard key={scholarship.id} scholarship={scholarship} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
