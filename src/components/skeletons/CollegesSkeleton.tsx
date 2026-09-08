import { Skeleton } from "@/components/ui/skeleton";

export default function CollegesSkeleton() {
  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      {/* Header & Metrics Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-between items-start sm:items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-10 w-56 sm:w-64" />
          <Skeleton className="h-4 sm:h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-12 w-full sm:w-36 rounded-xl shrink-0" />
      </div>

      {/* Metrics Row (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Skeleton (Schoolari Recommendations, My College List) */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      {/* Results Header & Refresh Button */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-52" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>

      {/* Colleges Cards Grid (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between h-[340px] space-y-4"
          >
            {/* Header: Logo, Name, Badges */}
            <div className="flex items-start gap-4">
              <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-5 w-20 rounded-md mt-1" />
              </div>
            </div>

            {/* Why it matches snippet */}
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>

            {/* Acceptance rate & tuition */}
            <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-slate-100">
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-10 flex-1 rounded-xl" />
              <Skeleton className="h-10 flex-1 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
