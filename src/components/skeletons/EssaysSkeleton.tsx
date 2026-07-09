import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function EssaysSkeleton() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-12 w-36 rounded-xl" />
      </div>

      {/* Grid of Essay Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center gap-1.5">
              <Skeleton className="w-3.5 h-3.5 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
