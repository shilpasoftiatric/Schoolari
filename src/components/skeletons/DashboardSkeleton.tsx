import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-28">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>

      {/* Quick Actions Skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-11 w-48 rounded-xl" />
        <Skeleton className="h-11 w-44 rounded-xl" />
      </div>

      {/* Progress Overview Card Skeleton */}
      <Card className="shadow-sm border-slate-100">
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
                  <Skeleton className="h-6 w-10" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Three Content Sections Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((sectionIndex) => (
          <Card key={sectionIndex} className="shadow-sm border-slate-100 flex flex-col justify-between overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100/50 bg-slate-50/30">
              <CardTitle className="text-base flex items-center justify-between font-extrabold text-slate-800">
                <div className="flex items-center gap-2 w-full">
                  <Skeleton className="w-5 h-5 rounded-md" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-4 flex-1">
              {/* Today's Priority */}
              <div className="space-y-3">
                <Skeleton className="h-3 w-32" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2">
                      <Skeleton className="w-4 h-4 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div className="space-y-3">
                <Skeleton className="h-3 w-32" />
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between p-2 border border-slate-100 rounded-xl">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Goals */}
              <div className="space-y-3">
                <Skeleton className="h-3 w-36" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2">
                      <Skeleton className="w-4 h-4 rounded-md" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scholarship Tracker Skeleton */}
      <Card className="shadow-sm border-slate-100">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 border-b border-slate-100 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-4 gap-4 py-2 border-b border-slate-50 last:border-0">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ways to Earn Skeleton */}
      <Card className="shadow-sm border-slate-100 bg-gradient-to-br from-emerald-50/20 to-teal-50/20 border-emerald-100/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2 bg-white/70 p-4 rounded-2xl border border-emerald-100/20 shadow-sm">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Suggestions Row Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm border-slate-100">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2].map((j) => (
                <div key={j} className="flex flex-col gap-1.5 p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
