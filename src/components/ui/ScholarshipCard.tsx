"use client";

import { useTransition } from "react";
import { Star, Clock, DollarSign, ArrowRight, ExternalLink } from "lucide-react";
import { trackApplication } from "@/app/actions/scholarships";
import { Button } from "@/components/ui/button";

export function ScholarshipCard({ scholarship }: { scholarship: any }) {
  const [isPending, startTransition] = useTransition();

  const handleApply = (e: React.MouseEvent) => {
    // We don't prevent default because we still want the browser to open the link in a new tab!
    // But we trigger the transition in the background to track it.
    startTransition(async () => {
      try {
        await trackApplication(scholarship.id);
      } catch (err) {
        console.error("Failed to track application", err);
      }
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case "merit-based": return "bg-blue-50 text-blue-700 border-blue-200";
      case "need-based": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "athletic": return "bg-orange-50 text-orange-700 border-orange-200";
      case "diversity": return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
      case "creative": return "bg-pink-50 text-pink-700 border-pink-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="group bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col h-full">
      {/* Decorative gradient blob */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-violet-100 to-fuchsia-100 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Header Badges */}
      <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
        <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border ${getCategoryColor(scholarship.category)}`}>
          {scholarship.category || "General"}
        </span>
        
        {scholarship.featured && (
          <span className="flex items-center gap-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-sm">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            Featured
          </span>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1">
        <h3 className="text-xl font-extrabold text-slate-900 leading-tight mb-2 line-clamp-2 group-hover:text-violet-700 transition-colors">
          {scholarship.name}
        </h3>
        
        <p className="text-sm text-slate-500 line-clamp-2 mb-6">
          {scholarship.description || "No description provided."}
        </p>
      </div>

      {/* Stats Footer */}
      <div className="mt-auto relative z-10 space-y-4">
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Award</span>
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100 text-emerald-600">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              {scholarship.award_amount}
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Deadline</span>
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-rose-100 text-rose-600">
                <Clock className="w-3.5 h-3.5" />
              </div>
              {new Date(scholarship.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <a 
          href={scholarship.link} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={handleApply}
          className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-violet-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md group/btn"
        >
          {isPending ? "Tracking..." : "Apply Now"}
          {!isPending && <ExternalLink className="w-4 h-4 opacity-50 group-hover/btn:opacity-100 transition-opacity" />}
        </a>
      </div>
    </div>
  );
}
