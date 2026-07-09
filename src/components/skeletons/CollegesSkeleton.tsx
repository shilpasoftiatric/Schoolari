import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function CollegesSkeleton() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header & Metrics Skeleton */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-12 w-36 rounded-xl" />
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-10" />
            </div>
          </Card>
        ))}
      </div>

      {/* Colleges Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col space-y-4">
            <div className="flex justify-between items-start">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2 flex-1 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-12 w-full rounded-xl bg-slate-50 border border-slate-100" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
