import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function DocumentsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Title & Subtitle */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>

      {/* Drag & Drop Upload Zone Skeleton */}
      <div className="relative border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center bg-white">
        <Skeleton className="w-16 h-16 rounded-full mb-4" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-72 mb-6" />
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>

      {/* Grid Layout of Document Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
            <div className="flex justify-between items-start">
              <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
              <div className="flex gap-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-5/6" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
