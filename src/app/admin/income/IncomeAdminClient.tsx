"use client";

import { Suspense } from "react";
import { FolderOpen, PlaySquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoriesTable } from "./CategoriesTable";
import { VideosTable } from "./VideosTable";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Tab = "categories" | "videos";

function IncomeAdminClientInner({
  initialCategories,
  initialVideos,
}: {
  initialCategories: any[];
  initialVideos: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const activeTab = (searchParams.get("tab") as Tab) || "categories";

  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("categories")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "categories"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <FolderOpen className="w-4 h-4" />
          Categories
          <span className={cn(
            "text-xs font-bold px-1.5 py-0.5 rounded-full",
            activeTab === "categories" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
          )}>
            {initialCategories.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "videos"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <PlaySquare className="w-4 h-4" />
          Videos
          <span className={cn(
            "text-xs font-bold px-1.5 py-0.5 rounded-full",
            activeTab === "videos" ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-500"
          )}>
            {initialVideos.length}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "categories" && (
        <CategoriesTable initialCategories={initialCategories} />
      )}
      {activeTab === "videos" && (
        <VideosTable initialVideos={initialVideos} categories={initialCategories} />
      )}
    </div>
  );
}

export function IncomeAdminClient(props: { initialCategories: any[]; initialVideos: any[] }) {
  return (
    <Suspense fallback={null}>
      <IncomeAdminClientInner {...props} />
    </Suspense>
  );
}
