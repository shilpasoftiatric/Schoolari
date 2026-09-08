import { Skeleton } from "@/components/ui/skeleton";

export default function EssaysSkeleton() {
  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* ── Section 1: Scholarship & College Essays Skeleton ── */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="h-6 w-64" />
            </div>
            <Skeleton className="h-4 w-72 sm:w-96" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl shrink-0" />
        </div>

        {/* Grid of Essay Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between h-[250px] relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <Skeleton className="w-11 h-11 rounded-xl" />
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
                <Skeleton className="h-6 w-4/5 mb-2" />
                <Skeleton className="h-3.5 w-full mb-1.5" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <Skeleton className="w-3.5 h-3.5 rounded-full" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Job & Internship Cover Letters Skeleton ── */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="h-6 w-72" />
            </div>
            <Skeleton className="h-4 w-72 sm:w-96" />
          </div>
          <Skeleton className="h-10 w-44 rounded-xl shrink-0" />
        </div>

        {/* Grid of Cover Letter Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between h-[250px] relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <Skeleton className="w-11 h-11 rounded-xl" />
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
                <Skeleton className="h-6 w-4/5 mb-2" />
                <Skeleton className="h-3.5 w-full mb-1.5" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <Skeleton className="w-3.5 h-3.5 rounded-full" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
