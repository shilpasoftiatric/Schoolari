import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function TrackerSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="space-y-2 mb-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>

      {/* Kanban Board Columns Horizontal Scroll */}
      <div className="flex gap-6 overflow-x-auto pb-8 h-[calc(100vh-200px)] min-h-[600px]">
        {[1, 2, 3, 4, 5].map((columnIndex) => (
          <div key={columnIndex} className="flex-shrink-0 w-80 flex flex-col bg-slate-100/50 rounded-3xl border border-slate-200">
            {/* Column Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="w-6 h-5 rounded-full" />
            </div>

            {/* Column Body Cards */}
            <div className="flex-1 p-4 space-y-4">
              {[1, 2].map((cardIndex) => (
                <Card key={cardIndex} className="shadow-sm border border-slate-200 p-4 space-y-3">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-12" />
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
