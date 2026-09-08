import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function TrackerSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Category Filter Tabs Skeleton */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto min-w-0 flex-1 no-scrollbar">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-xl shrink-0" />
          ))}
        </div>
        <div className="flex sm:hidden items-center gap-1 shrink-0">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="w-8 h-8 rounded-lg" />
        </div>
      </div>

      {/* Kanban Board Columns Horizontal Scroll Skeleton */}
      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 min-h-[550px]">
        {[
          { label: "Not Started", w: "w-72 sm:w-80" },
          { label: "In Progress", w: "w-72 sm:w-80" },
          { label: "Submitted / Applied", w: "w-72 sm:w-80" },
          { label: "Interview Scheduled", w: "w-72 sm:w-80" },
          { label: "Won / Offer", w: "w-72 sm:w-80" },
        ].map((col, columnIndex) => (
          <div
            key={columnIndex}
            className={`flex-shrink-0 ${col.w} flex flex-col bg-slate-100/60 rounded-3xl border border-slate-200/80`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="w-6 h-5 rounded-full" />
            </div>

            {/* Column Task Cards */}
            <div className="flex-1 p-3 sm:p-4 space-y-3">
              {[1, 2].map((cardIndex) => (
                <Card key={cardIndex} className="shadow-xs border border-slate-200 p-4 space-y-3 bg-white rounded-2xl">
                  {/* Category Pill */}
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-20 rounded-md" />
                    <Skeleton className="w-4 h-4 rounded" />
                  </div>

                  {/* Title & Organization */}
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>

                  {/* Due Date & Menu Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="w-3.5 h-3.5 rounded-full" />
                      <Skeleton className="h-3.5 w-20" />
                    </div>
                    <Skeleton className="h-6 w-6 rounded-md" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
