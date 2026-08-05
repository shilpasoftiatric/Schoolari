import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse max-w-7xl mx-auto">
      {/* Title & Description Skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-6 w-96 rounded-lg" />
      </div>

      {/* Tracker Link Card Skeleton */}
      <div className="bg-slate-100/50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-2 flex-1 w-full">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl shrink-0" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-fit mb-6">
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg ml-2" />
      </div>

      {/* Job Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="rounded-3xl border border-slate-200 p-6 flex flex-col h-full space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
              </div>
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
            </div>
            
            <div className="space-y-2 py-2">
              <Skeleton className="h-4 w-24 rounded" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
