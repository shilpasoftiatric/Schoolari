import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function ResumeSkeleton() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 w-full animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 sm:h-10 w-72 sm:w-80" />
            <Skeleton className="w-8 h-8 rounded-full hidden sm:block" />
          </div>
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-12 w-36 rounded-xl" />
      </div>

      {/* Grid of Resumes Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between h-[260px] relative overflow-hidden"
          >
            <div>
              {/* Top icon and badge */}
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <Skeleton className="h-6 w-24 rounded-md" />
              </div>

              {/* Title & Summary */}
              <div className="space-y-2 mb-4">
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>

            {/* Bottom timestamp */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
              <Skeleton className="w-3.5 h-3.5 rounded-full" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
