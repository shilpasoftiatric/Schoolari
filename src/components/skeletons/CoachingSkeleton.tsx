import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function CoachingSkeleton() {
  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Title Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Left Column: Inbox List Skeleton */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>

          <div className="flex-1 p-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-2xl border border-slate-100 bg-white space-y-3">
                <div className="flex gap-3 items-start">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3.5 w-12" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Message View Skeleton */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full min-h-[400px]">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>

          <div className="flex-1 p-6 space-y-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
