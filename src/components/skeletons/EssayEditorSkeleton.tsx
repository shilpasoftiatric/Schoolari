import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function EssayEditorSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6">
      {/* Editor Side (Left) */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>

        {/* Editor Fields */}
        <div className="p-6 space-y-4 flex-1 flex flex-col">
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-1 flex-1 flex flex-col pt-2">
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="w-full flex-1 rounded-2xl min-h-[250px]" />
          </div>
        </div>
      </div>

      {/* AI Assistant Sidebar (Right) */}
      <aside className="w-full lg:w-[420px] shrink-0 flex flex-col bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-sm h-full">
        {/* Header Tabs */}
        <div className="flex bg-slate-100 p-1 border-b border-slate-200">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>

        {/* AI Sidebar Content */}
        <div className="flex-1 p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-150">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </aside>
    </div>
  );
}
