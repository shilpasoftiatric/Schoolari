import { Skeleton } from "@/components/ui/skeleton";

export default function CoachingSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 max-w-full overflow-hidden pb-12">
      {/* 1. Header with Coach Illustration placeholder */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 pb-1">
        <div className="space-y-1.5 max-w-xl">
          <Skeleton className="h-8 sm:h-10 w-48 sm:w-64" />
          <Skeleton className="h-4 sm:h-5 w-full max-w-md" />
        </div>
        <Skeleton className="w-full md:w-80 h-32 rounded-2xl shrink-0" />
      </div>

      {/* 2. Two-Column Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── LEFT COLUMN (2 Cols) ── */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Card 1: Upcoming Coaching Sessions */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-9 w-32 rounded-xl shrink-0" />
            </div>

            {/* Sessions List */}
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Date Box */}
                    <Skeleton className="w-16 h-20 sm:w-18 sm:h-20 rounded-2xl shrink-0" />
                    {/* Title & Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-44" />
                        <Skeleton className="h-5 w-16 rounded-md" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3.5 w-24" />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center gap-2 shrink-0">
                    <Skeleton className="h-9 w-28 rounded-xl" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: After Every Session Diagram */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-sm space-y-4">
            <div className="space-y-1">
              <Skeleton className="h-5 w-72" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </div>

            {/* 3-Step Visual Diagram */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex flex-col items-center text-center space-y-2 flex-1">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Alert Banner */}
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>

        {/* ── RIGHT COLUMN (1 Col) ── */}
        <div className="lg:col-span-1 space-y-6 min-w-0">
          {/* Card 1: Your Coach */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
            <Skeleton className="h-5 w-24" />
            <div className="flex items-center gap-3.5">
              <Skeleton className="w-14 h-14 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>

          {/* Card 2: Quick Actions */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-3">
            <Skeleton className="h-5 w-28 mb-1" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
