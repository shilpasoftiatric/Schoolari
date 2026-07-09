import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CareerSkeleton() {
  return (
    <div className="space-y-8 pb-8">
      {/* Title Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Interests & Recommendations Skeleton */}
        <div className="lg:col-span-1 space-y-8">
          {/* Career Interests Panel */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-full" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-11 w-full rounded-xl pt-2" />
          </div>

          {/* Curated Resources */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 space-y-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Resume Management Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
            <Skeleton className="h-9 w-32 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>

          <Card className="rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>

            {/* Resume Builder Form Fields Skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
