import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardSkeleton() {
  return (
    <div className="relative min-h-full space-y-8 pb-28 animate-in fade-in duration-500">
      {/* Admin Content Banner Placeholder */}
      <Skeleton className="h-44 sm:h-48 w-full rounded-3xl" />

      {/* Greeting Header & Streak Badge */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 sm:w-80" />
          <Skeleton className="h-4 w-72 sm:w-96" />
        </div>
        <Skeleton className="h-9 w-36 rounded-full shrink-0" />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-11 w-48 rounded-xl" />
        <Skeleton className="h-11 w-44 rounded-xl" />
      </div>

      {/* Progress Overview Card Skeleton */}
      <Card className="shadow-sm border-slate-100 rounded-3xl overflow-hidden">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Three Content Sections Grid Skeleton (Scholarships, Colleges, Coaching) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((sectionIndex) => (
          <div
            key={sectionIndex}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden p-5 sm:p-6 space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Skeleton className="w-6 h-6 rounded-lg" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>

            {/* Today's Priority */}
            <div className="space-y-3">
              <Skeleton className="h-3.5 w-28" />
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl">
                    <Skeleton className="w-4 h-4 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="space-y-3">
              <Skeleton className="h-3.5 w-36" />
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 border border-slate-100 rounded-xl">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Section Footer */}
            <div className="pt-2 border-t border-slate-100">
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Application Tracker Table Card Skeleton */}
      <Card className="shadow-sm border-slate-100 rounded-3xl overflow-hidden">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-4 border-b border-slate-100 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-4 gap-4 py-2.5 border-b border-slate-50 last:border-0 items-center">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
