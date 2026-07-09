import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-20" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-start gap-4">
              <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions & Recent Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <Skeleton className="h-4 w-28" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-4 w-36" />
          <Card className="rounded-2xl border border-slate-100 shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function AdminTableSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-4 flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      {/* Table Skeleton */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs">
              <tr>
                <th className="px-6 py-4"><Skeleton className="h-4 w-24" /></th>
                <th className="px-6 py-4"><Skeleton className="h-4 w-16" /></th>
                <th className="px-6 py-4"><Skeleton className="h-4 w-20" /></th>
                <th className="px-6 py-4"><Skeleton className="h-4 w-12" /></th>
                <th className="px-6 py-4"><Skeleton className="h-4 w-20" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-md" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-9 w-24 rounded-lg" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
