import { Skeleton } from "@/components/ui/skeleton";

export default function CareerSkeleton() {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Header & Subtitle */}
      <div className="space-y-2">
        <Skeleton className="h-9 sm:h-10 w-64 sm:w-72" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>

      {/* Tracker Notice Banner */}
      <Skeleton className="h-20 w-full rounded-2xl" />

      {/* Tabs Bar Skeleton (Recommended Jobs, Wishlist, Career Resources) */}
      <div className="flex flex-wrap p-1 bg-slate-100 rounded-xl w-fit gap-1">
        <Skeleton className="h-10 w-44 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Search Input and Button */}
      <div className="flex gap-2">
        <Skeleton className="h-14 flex-1 rounded-xl" />
        <Skeleton className="h-14 w-28 rounded-xl shrink-0" />
      </div>

      {/* Grid of Job Cards (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between h-[420px] relative overflow-hidden"
          >
            {/* Top Badges & Heart Icon */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            </div>

            {/* Employer Logo & Job Title */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-3.5 w-1/2" />
                </div>
              </div>
              {/* Description lines */}
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>

            {/* Meta Tags (Location, Job Type, Modality) */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Skeleton className="h-6 w-28 rounded-lg" />
              <Skeleton className="h-6 w-20 rounded-lg" />
              <Skeleton className="h-6 w-24 rounded-lg" />
            </div>

            {/* 4 Status Action Buttons Footer */}
            <div className="pt-4 border-t border-slate-100 space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
