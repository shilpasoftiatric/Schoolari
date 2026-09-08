import { Skeleton } from "@/components/ui/skeleton";

export default function ScholarshipsSkeleton() {
  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-500">
      {/* Search Bar & Button Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 items-center w-full">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full sm:w-28 rounded-2xl shrink-0" />
      </div>

      {/* Horizontal Filters Bar Skeleton */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row flex-wrap md:items-center gap-4">
        <div className="flex items-center gap-2 mr-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-14" />
        </div>

        {/* Category Dropdown */}
        <Skeleton className="h-10 w-full md:w-48 rounded-xl" />

        {/* State Dropdown */}
        <Skeleton className="h-10 w-full md:w-32 rounded-xl" />

        {/* Award Dropdown */}
        <Skeleton className="h-10 w-full md:w-36 rounded-xl" />

        {/* Deadline Dropdown */}
        <Skeleton className="h-10 w-full md:w-36 rounded-xl" />

        <div className="hidden md:block flex-1" />

        {/* Reset & Apply Buttons */}
        <Skeleton className="h-10 w-24 rounded-xl hidden md:block" />
        <Skeleton className="h-10 w-full md:w-32 rounded-xl" />
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-end px-1">
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Grid Layout of Scholarship Cards (2 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full space-y-4"
          >
            {/* Header Badges */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>

            {/* Title & Organization */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-1/2" />
            </div>

            {/* Description lines */}
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>

            {/* Meta Tags Row (Deadline, Amount, Eligibility) */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <Skeleton className="h-7 w-28 rounded-lg" />
              <Skeleton className="h-7 w-24 rounded-lg" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>

            {/* Action Buttons Row */}
            <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
              <Skeleton className="h-10 flex-1 rounded-xl" />
              <Skeleton className="h-10 flex-1 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
