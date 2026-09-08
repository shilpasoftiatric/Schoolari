import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 sm:h-10 w-48 sm:w-56" />
          <Skeleton className="h-4 sm:h-5 w-72 sm:w-96" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl shrink-0" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Sidebar Profile Summary Skeleton */}
        <div className="w-full lg:w-[320px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
          {/* Banner */}
          <div className="h-32 bg-slate-200 relative">
            <div className="absolute top-4 right-4">
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>

          {/* Avatar & Name */}
          <div className="px-6 relative pb-6 border-b border-slate-100 text-center">
            <Skeleton className="w-24 h-24 rounded-full border-4 border-white -mt-12 mb-4 mx-auto" />
            <Skeleton className="h-6 w-36 mx-auto mb-2" />
            <Skeleton className="h-4 w-28 mx-auto" />
          </div>

          {/* Details List */}
          <div className="p-6 space-y-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="w-4 h-4 rounded-full mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Main Content Skeleton */}
        <div className="flex-1 space-y-6 w-full min-w-0">
          {/* Academic & Education Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="h-5 w-44" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>

          {/* Extracurriculars & Honors Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="h-5 w-52" />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-7 w-24 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Goals & Target Colleges Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
