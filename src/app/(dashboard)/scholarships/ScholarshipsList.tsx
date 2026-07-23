"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, RefreshCcw, Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScholarshipCard } from "@/components/ui/ScholarshipCard";

const ALL_CATEGORIES = [
  "Agriculture, Food & Natural Resources",
  "Architecture & Construction",
  "Arts & Design",
  "Business & Entrepreneurship",
  "Communications, Journalism & Media",
  "Computer Science & Information Technology",
  "Education",
  "Engineering",
  "General (Open to All Majors)",
  "Health & Medicine",
  "Hospitality, Tourism & Culinary Arts",
  "Humanities",
  "Law, Criminal Justice & Public Safety",
  "Mathematics",
  "Performing Arts (Music, Dance, Theater)",
  "Science",
  "Social Sciences",
  "STEM (General)",
  "Trade & Technical Careers (Skilled Trades)",
  "Transportation, Aviation & Logistics",
  "Veterinary & Animal Sciences",
  "Other"
];

const US_STATES = [
  "All", "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

export function ScholarshipsList({
  initialScholarships,
  applicationStatusMap = {},
}: {
  initialScholarships: any[];
  applicationStatusMap?: Record<string, string>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [draftCategories, setDraftCategories] = useState<string[]>(
    searchParams.getAll("category")
  );
  const [draftDeadline, setDraftDeadline] = useState<string>(searchParams.get("deadline") || "all");
  const [draftState, setDraftState] = useState<string>(searchParams.get("state") || "All");
  const [draftAward, setDraftAward] = useState<string>(searchParams.get("award") || "all");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Update drafts if URL changes (e.g., user hits back button)
  useEffect(() => {
    setDraftCategories(searchParams.getAll("category"));
    setDraftDeadline(searchParams.get("deadline") || "all");
    setDraftState(searchParams.get("state") || "All");
    setDraftAward(searchParams.get("award") || "all");
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  const toggleCategory = (cat: string) => {
    setDraftCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleApply = (newCat?: string[], newState?: string, newAward?: string, newDeadline?: string) => {
    const params = new URLSearchParams();
    const c = newCat !== undefined ? newCat : draftCategories;
    const s = newState !== undefined ? newState : draftState;
    const a = newAward !== undefined ? newAward : draftAward;
    const d = newDeadline !== undefined ? newDeadline : draftDeadline;
    
    if (c.length > 0) {
      c.forEach(cat => params.append("category", cat));
    }
    if (d !== "all") params.set("deadline", d);
    if (s !== "All") params.set("state", s);
    if (a !== "all") params.set("award", a);
    if (search.trim()) params.set("search", search.trim());
    
    router.push(`?${params.toString()}`);
  };

  const handleReset = () => {
    setDraftCategories([]);
    setDraftDeadline("all");
    setDraftState("All");
    setDraftAward("all");
    setSearch("");
    router.push("?");
  };

  const filtered = initialScholarships; // Data is now pre-filtered from server

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Search Bar & Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center w-full">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <Input 
            type="text"
            placeholder="Search scholarships by name, major, or keywords..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="pl-12 h-14 w-full bg-white border-slate-200 rounded-2xl text-base shadow-sm focus-visible:ring-violet-500 font-medium"
          />
        </div>
        <Button onClick={() => handleApply()} className="bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl h-14 px-8 w-full sm:w-auto shrink-0">
          Search
        </Button>
      </div>

      {/* Horizontal Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row flex-wrap md:items-center gap-4">
        <div className="flex items-center justify-between md:justify-start w-full md:w-auto shrink-0">
          <div className="flex items-center gap-2 font-bold text-slate-700 mr-2">
            <Filter className="w-4 h-4 text-violet-500" /> Filters
          </div>
          <button onClick={handleReset} className="md:hidden text-xs font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors">
            <RefreshCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
        
        <div className="relative flex-1 md:flex-none md:min-w-[240px]">
          <button 
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 flex items-center justify-between"
          >
            <span className="truncate">
              {draftCategories.length === 0 ? "All Categories" : 
               draftCategories.length === 1 ? draftCategories[0] : 
               `Categories (${draftCategories.length})`}
            </span>
            <ChevronDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
          </button>
          
          {isCategoryOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsCategoryOpen(false)} />
              <div className="absolute top-full left-0 mt-2 w-[280px] bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto custom-scrollbar p-2">
                {ALL_CATEGORIES.map(cat => (
                  <label key={cat} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer group min-h-[2.5rem]">
                    <div className={`w-4 h-4 mt-0.5 shrink-0 rounded border flex items-center justify-center transition-colors ${draftCategories.includes(cat) ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300 bg-white group-hover:border-violet-400'}`}>
                      {draftCategories.includes(cat) && <Check className="w-3 h-3" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={draftCategories.includes(cat)}
                      onChange={(e) => {
                        const newCats = e.target.checked 
                          ? [...draftCategories, cat] 
                          : draftCategories.filter(c => c !== cat);
                        setDraftCategories(newCats);
                      }}
                    />
                    <span className="text-sm font-medium text-slate-700 leading-tight select-none">{cat}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <select 
          value={draftState} 
          onChange={(e) => setDraftState(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1 md:flex-none"
        >
          {US_STATES.map(state => <option key={state} value={state}>{state === "All" ? "All States" : state}</option>)}
        </select>

        <select 
          value={draftAward} 
          onChange={(e) => setDraftAward(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1 md:flex-none"
        >
          <option value="all">Any Amount</option>
          <option value="under_500">Under $500</option>
          <option value="500_1000">$500 – $1,000</option>
          <option value="1000_2500">$1,000 – $2,500</option>
          <option value="2500_5000">$2,500 – $5,000</option>
          <option value="5000_10000">$5,000 – $10,000</option>
          <option value="above_10000">Above $10,000</option>
        </select>

        <select 
          value={draftDeadline} 
          onChange={(e) => setDraftDeadline(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1 md:flex-none"
        >
          <option value="all">Any Deadline</option>
          <option value="30">Next 30 Days</option>
          <option value="90">Next 3 Months</option>
          <option value="180">Next 6 Months</option>
        </select>

        <div className="hidden md:block flex-1"></div>

        <button onClick={handleReset} className="text-xs font-bold text-slate-400 hover:text-slate-700 flex items-center justify-center gap-1 transition-colors px-2 shrink-0 w-full md:w-auto h-10 md:h-auto">
          <RefreshCcw className="w-3.5 h-3.5" /> Reset Filters
        </button>

        <Button onClick={() => handleApply()} className="bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl h-10 px-6 shrink-0 w-full md:w-auto">
          Apply Filters
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6 min-w-0">

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
              <ScholarshipCard
                key={scholarship.id}
                scholarship={scholarship}
                userActionStatus={applicationStatusMap[scholarship.id] ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
