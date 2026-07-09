import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero Section: Completion Tracker & Basic Info Skeleton */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        {/* Circular progress placeholder */}
        <Skeleton className="w-32 h-32 rounded-full shrink-0 animate-pulse" />

        <div className="flex-1 text-center md:text-left space-y-3">
          <Skeleton className="h-8 w-48 mx-auto md:mx-0" />
          <Skeleton className="h-5 w-64 mx-auto md:mx-0" />
          <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-4">
            <Skeleton className="h-8 w-44 rounded-lg animate-pulse" />
          </div>
        </div>

        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Basic Details Skeleton */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="h-5 w-28" />
            </div>

            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Academic interests & Priorities Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="h-5 w-44" />
            </div>

            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-7 w-24 rounded-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
