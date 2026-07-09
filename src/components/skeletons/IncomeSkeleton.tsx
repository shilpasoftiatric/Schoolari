import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function IncomeSkeleton() {
  return (
    <div className="space-y-8 pb-8">
      {/* Title Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left/Main Column Skeleton */}
        <div className="xl:col-span-2 space-y-8">
          {/* AI Hustle Generator */}
          <div className="bg-slate-100 rounded-3xl p-6 space-y-6 bg-white border border-slate-200">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="sm:col-span-3 space-y-1.5 pt-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="sm:col-span-3 pt-4">
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          </div>

          {/* Proven Student Hustles */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                  </div>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Goal Setting & Goals List Skeleton */}
        <div className="space-y-8">
          {/* Add Goal Panel */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <Skeleton className="h-6 w-36" />
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <Skeleton className="h-11 w-full rounded-xl pt-2" />
            </div>
          </div>

          {/* Goals List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="w-8 h-8 rounded-lg" />
                  </div>
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
