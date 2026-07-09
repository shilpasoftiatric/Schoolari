import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ScholarshipsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Title & Subtitle */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-80 sm:w-96" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters Skeleton */}
        <aside className="w-full lg:w-72 shrink-0 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm h-fit">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>

          <div className="space-y-6">
            {/* Category Filter */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-full" />
                ))}
              </div>
            </div>

            {/* Deadline Filter */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <Skeleton className="h-4 w-28" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-1">
                    <Skeleton className="w-4 h-4 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>

            {/* Apply Button */}
            <Skeleton className="h-11 w-full rounded-xl pt-2" />
          </div>
        </aside>

        {/* Search & Grid Content Skeleton */}
        <div className="flex-1 space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>

          {/* Grid Layout of Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-slate-200 shadow-sm overflow-hidden flex flex-col p-6 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24 rounded-full" />
                    <Skeleton className="h-6 w-5/6" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                  <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-5/6" />
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-t border-b border-slate-100">
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Skeleton className="h-10 w-28 rounded-xl" />
                  <Skeleton className="h-10 w-24 rounded-xl" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
