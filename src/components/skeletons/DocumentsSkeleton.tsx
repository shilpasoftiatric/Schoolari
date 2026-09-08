import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentsSkeleton() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-10 w-56 sm:w-64" />
          <Skeleton className="h-4 sm:h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl shrink-0" />
      </div>

      {/* Drag & Drop Upload Zone Skeleton */}
      <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center bg-white space-y-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="space-y-1.5 text-center flex flex-col items-center">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Skeleton className="h-11 w-44 rounded-xl" />
          <Skeleton className="h-11 w-36 rounded-xl" />
        </div>
      </div>

      {/* Document Group 1 Skeleton (Resumes & Cover Letters) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-md" />
          <Skeleton className="h-5 w-36" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-[180px] space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
                <div className="flex gap-1.5">
                  <Skeleton className="w-9 h-9 rounded-xl" />
                  <Skeleton className="w-9 h-9 rounded-xl" />
                </div>
              </div>

              <div className="pt-2">
                <Skeleton className="h-5 w-4/5 mb-2" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-4 w-14" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
