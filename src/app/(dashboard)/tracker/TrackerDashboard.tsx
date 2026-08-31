"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, CheckCircle2, XCircle, Trash2, MoreHorizontal, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { canAccessFeature, type SubscriptionPlan } from "@/lib/subscription";

import { useSearchParams, useRouter } from "next/navigation";
import Swal from "@/lib/swal";
import { toast } from "sonner";
import { JobDetailPanel } from "@/app/(dashboard)/jobs/JobDetailPanel";

const getColumnsForCategory = (category: string) => {
  if (category === "job") {
    return [
      { id: "Not Started", label: "Not Started", color: "bg-slate-100 text-slate-700 border-slate-200" },
      { id: "In Progress", label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200" },
      { id: "Submitted", label: "Applied", color: "bg-amber-50 text-amber-700 border-amber-200" },
      { id: "Won", label: "Offer Received", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      { id: "Lost", label: "Passed", color: "bg-red-50 text-red-700 border-red-200" },
    ];
  }
  if (category === "coaching") {
    return [
      { id: "Not Started", label: "Not Started", color: "bg-slate-100 text-slate-700 border-slate-200" },
      { id: "In Progress", label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200" },
      { id: "Submitted", label: "Submitted", color: "bg-amber-50 text-amber-700 border-amber-200" },
      { id: "Won", label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      { id: "Lost", label: "Archived", color: "bg-red-50 text-red-700 border-red-200" },
    ];
  }
  return [
    { id: "Not Started", label: "Not Started", color: "bg-slate-100 text-slate-700 border-slate-200" },
    { id: "In Progress", label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { id: "Submitted", label: "Submitted", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { id: "Won", label: "Won", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { id: "Lost", label: "Lost", color: "bg-red-50 text-red-700 border-red-200" },
  ];
};

const CATEGORIES = [
  { id: "all", label: "All Items" },
  { id: "scholarship", label: "Scholarships" },
  { id: "college", label: "Colleges" },
  { id: "job", label: "Jobs" },
  { id: "essay", label: "Essays" },
  { id: "coaching", label: "Coaching Tasks" },
];

export function TrackerDashboard({ initialApplications, plan = 'starter' }: { initialApplications: any[], plan?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams?.get("type") || "all";
  const [activeCategory, setActiveCategory] = useState<string>(initialType);
  const [applications, setApplications] = useState(initialApplications);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  // Auto-scroll and Drag Protection State
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const lastDragEndRef = useRef(0);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const pointerXRef = useRef<number>(0);
  const pointerYRef = useRef<number>(0);

  const activeColumns = getColumnsForCategory(activeCategory);
  
  const visibleCategories = CATEGORIES.filter((c) => {
    if (c.id === "all") return true;

    // Always show if the user has any items of this category in tracker
    const hasItems = applications.some((app) => {
      const ref = (app.reference_type || "").toLowerCase();
      if (c.id === "coaching") {
        return ref === "coaching" || ref === "coaching_task" || ref === "coaching task";
      }
      return ref === c.id.toLowerCase();
    });
    if (hasItems) return true;

    // Core tracker categories
    if (c.id === "scholarship" || c.id === "college" || c.id === "job") return true;

    // Essays tab gated by feature access
    if (c.id === "essay" && !canAccessFeature(plan as SubscriptionPlan, "essays")) return false;

    // Coaching tab: show if plan has coaching access or user has coaching items
    if (c.id === "coaching") {
      return canAccessFeature(plan as SubscriptionPlan, "coaching") || hasItems;
    }

    return true;
  });

  useEffect(() => {
    const typeFromUrl = searchParams?.get("type");
    if (typeFromUrl) {
      setActiveCategory(typeFromUrl);
    }
  }, [searchParams]);

  const handleStatusChange = (appId: string, newStatus: string) => {
    // Optimistic UI update
    setApplications((prev) =>
      prev.map((app) => (String(app.id) === String(appId) ? { ...app, status: newStatus } : app))
    );

    const targetCol = activeColumns.find((c) => c.id === newStatus);
    if (targetCol) {
      toast.success(`Moved to ${targetCol.label}`);
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/tracker/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: appId, status: newStatus })
        });
        if (!res.ok) throw new Error("Failed to update status");
      } catch (e) {
        console.error("Failed to update status", e);
        toast.error("Failed to sync status with server.");
      }
    });
  };

  const handleDelete = async (appId: string) => {
    const result = await Swal.fire({
      title: "Remove from tracker?",
      text: "Are you sure you want to remove this item? This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, remove it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    setApplications((prev) => prev.filter((app) => app.id !== appId));

    startTransition(async () => {
      try {
        const res = await fetch("/api/tracker/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: appId })
        });
        if (!res.ok) throw new Error("Failed to delete");
      } catch (e) {
        console.error("Failed to delete", e);
        setApplications(initialApplications);
      }
    });
  };

  const filteredApplications = applications.filter((app) => {
    if (activeCategory === "all") return true;
    const ref = (app.reference_type || "").toLowerCase();
    if (activeCategory === "coaching") {
      return ref === "coaching" || ref === "coaching_task" || ref === "coaching task";
    }
    return ref === activeCategory.toLowerCase();
  }).map(app => {
    // Fix stuck jobs from previous bug where status was saved as 'Applied' instead of 'Submitted'
    if (app.reference_type === "job" && app.status === "Applied") {
      return { ...app, status: "Submitted" };
    }
    return app;
  });

  const appsByStatus = activeColumns.reduce((acc, col) => {
    acc[col.id] = filteredApplications.filter((app) => app.status === col.id);
    return acc;
  }, {} as Record<string, any[]>);

  const [isMounted, setIsMounted] = useState(false);

  // Auto-scroll loop when card is dragged near the left/right screen edges
  const startAutoScrollLoop = () => {
    if (autoScrollRafRef.current) return;

    const scrollLoop = () => {
      if (!isDraggingRef.current || !boardScrollRef.current) {
        autoScrollRafRef.current = null;
        return;
      }

      const container = boardScrollRef.current;
      const rect = container.getBoundingClientRect();
      const clientX = pointerXRef.current;

      // 60px active edge threshold for natural thumb reach
      const edgeThreshold = 60;

      // Left edge auto-scroll (dragged towards left)
      if (clientX > 0 && clientX < rect.left + edgeThreshold) {
        const dist = Math.max(0, rect.left + edgeThreshold - clientX);
        const speed = 10 + Math.round((dist / edgeThreshold) * 8); // 10px to 18px per frame
        container.scrollLeft -= speed;
      }
      // Right edge auto-scroll (dragged towards right across to Won, Lost, etc.)
      else if (clientX > 0 && clientX > rect.right - edgeThreshold) {
        const dist = Math.max(0, clientX - (rect.right - edgeThreshold));
        const speed = 10 + Math.round((dist / edgeThreshold) * 8); // 10px to 18px per frame
        container.scrollLeft += speed;
      }

      autoScrollRafRef.current = requestAnimationFrame(scrollLoop);
    };

    autoScrollRafRef.current = requestAnimationFrame(scrollLoop);
  };

  const stopAutoScrollLoop = () => {
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  };

  useEffect(() => {
    setIsMounted(true);

    const handlePointerMove = (e: any) => {
      let clientX = 0;
      let clientY = 0;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else if (typeof e.clientX === "number") {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      if (clientX > 0) {
        pointerXRef.current = clientX;
      }
      if (clientY > 0) {
        pointerYRef.current = clientY;
      }
    };

    // Use capturing phase so touch positions are received even when child DnD elements intercept
    window.addEventListener("pointermove", handlePointerMove, { capture: true, passive: true });
    window.addEventListener("touchmove", handlePointerMove, { capture: true, passive: true });
    window.addEventListener("mousemove", handlePointerMove, { capture: true, passive: true });
    window.addEventListener("touchend", handlePointerMove, { capture: true, passive: true });
    window.addEventListener("pointerup", handlePointerMove, { capture: true, passive: true });
    window.addEventListener("mouseup", handlePointerMove, { capture: true, passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove, { capture: true } as any);
      window.removeEventListener("touchmove", handlePointerMove, { capture: true } as any);
      window.removeEventListener("mousemove", handlePointerMove, { capture: true } as any);
      window.removeEventListener("touchend", handlePointerMove, { capture: true } as any);
      window.removeEventListener("pointerup", handlePointerMove, { capture: true } as any);
      window.removeEventListener("mouseup", handlePointerMove, { capture: true } as any);
      stopAutoScrollLoop();
    };
  }, []);

  const onDragStart = (start: any) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    startAutoScrollLoop();
  };

  const onDragEnd = (result: DropResult) => {
    isDraggingRef.current = false;
    lastDragEndRef.current = Date.now();
    setIsDragging(false);
    stopAutoScrollLoop();

    const { destination, source, draggableId } = result;

    let targetDroppableId = destination?.droppableId;

    // Fallback: If horizontal scrolling during drag offset @hello-pangea/dnd's internal rects,
    // look up the exact column DOM element under the touch release coordinates,
    // skipping the clone of the item currently being dragged!
    if (!targetDroppableId && pointerXRef.current > 0 && pointerYRef.current > 0) {
      if (typeof document !== "undefined") {
        const elements = document.elementsFromPoint(pointerXRef.current, pointerYRef.current);
        for (const el of elements) {
          // Skip the draggable element clone that is under the finger
          if (el.closest(`[data-rbd-draggable-id="${draggableId}"]`)) {
            continue;
          }
          const droppableEl = el.closest("[data-droppable-id]") || el.closest("[data-rbd-droppable-id]");
          if (droppableEl) {
            const id = droppableEl.getAttribute("data-droppable-id") || droppableEl.getAttribute("data-rbd-droppable-id");
            if (id && activeColumns.some((c) => c.id === id)) {
              targetDroppableId = id;
              break;
            }
          }
        }
      }
    }

    if (!targetDroppableId) return;
    if (targetDroppableId === source.droppableId && destination?.index === source.index) return;

    handleStatusChange(draggableId, targetDroppableId);
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-4">
      {/* Category Filter Tabs & Mobile Column Quick Navigation */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto min-w-0 flex-1 no-scrollbar">
          {visibleCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeCategory.toLowerCase() === cat.id.toLowerCase()
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Mobile Quick Column Slide Buttons */}
        <div className="flex sm:hidden items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => boardScrollRef.current?.scrollBy({ left: -290, behavior: "smooth" })}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shadow-2xs"
            title="Previous column"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => boardScrollRef.current?.scrollBy({ left: 290, behavior: "smooth" })}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shadow-2xs"
            title="Next column"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Column Quick Pill Selectors */}
      <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {activeColumns.map((col, idx) => (
          <button
            key={col.id}
            type="button"
            onClick={() => {
              if (boardScrollRef.current) {
                const targetScroll = idx * (window.innerWidth * 0.82 + 16);
                boardScrollRef.current.scrollTo({ left: targetScroll, behavior: "smooth" });
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs shrink-0 flex items-center gap-1.5 active:bg-violet-50"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${col.color.split(' ')[0]}`} />
            {col.label} ({appsByStatus[col.id]?.length || 0})
          </button>
        ))}
      </div>

      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div
          ref={boardScrollRef}
          className={`flex gap-4 sm:gap-6 overflow-x-auto pb-8 ${isDragging ? "snap-none" : "snap-x snap-proximity"} h-[calc(100vh-250px)] min-h-[550px]`}
        >
          {activeColumns.map((col) => (
            <div
              key={col.id}
              data-droppable-id={col.id}
              className="flex-shrink-0 w-[82vw] sm:w-80 flex flex-col bg-slate-100/50 rounded-3xl border border-slate-200 snap-center"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200/60">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.color.split(' ')[0]}`} />
                  {col.label}
                </h3>
                <Badge variant="secondary" className="bg-white text-slate-600 font-bold">
                  {appsByStatus[col.id]?.length || 0}
                </Badge>
              </div>

              {/* Column Body */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    data-droppable-id={col.id}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto p-4 space-y-4 transition-colors duration-150 ${snapshot.isDraggingOver ? 'bg-violet-100/60 ring-2 ring-violet-500/80 rounded-2xl' : ''}`}
                  >
                    {appsByStatus[col.id]?.map((app, index) => (
                      <Draggable key={String(app.id)} draggableId={String(app.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.8 : 1
                            }}
                          >
                            <Card 
                              onClick={() => {
                                // Block accidental navigation right after dragging
                                if (isDraggingRef.current || Date.now() - lastDragEndRef.current < 450) {
                                  return;
                                }
                                if (app.reference_type === 'job') {
                                  let notes: any = {};
                                  try { notes = JSON.parse(app.notes || '{}'); } catch(e) {}
                                  const parts = app.title.split(' at ');
                                  const job_title = parts[0];
                                  const employer_name = parts[1] || '';
                                  setSelectedJob({
                                    job_id: app.reference_id,
                                    job_title: job_title || app.title,
                                    employer_name: employer_name,
                                    job_city: notes.location || '',
                                    job_description: notes.description || '',
                                    job_apply_link: notes.url || '',
                                  });
                                }
                                else if (app.reference_type === 'scholarship') router.push('/scholarships');
                                else if (app.reference_type === 'essay') router.push('/essays');
                                else if (app.reference_type === 'college') router.push('/colleges');
                              }}
                              className={`shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group py-0 !overflow-visible cursor-pointer ${col.id === 'Won' ? 'bg-emerald-50/30' : ''}`}
                            >
                              <CardHeader className="p-3.5 pb-1">
                                <div className="flex justify-between items-start">
                                  <CardTitle className="text-sm font-bold leading-tight pr-6">
                                    {app.title}
                                  </CardTitle>
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setOpenMenuId(openMenuId === app.id ? null : app.id);
                                      }}
                                      onPointerDown={(e) => e.stopPropagation()}
                                      className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                      title="Options"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>

                                    {openMenuId === app.id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-40"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(null);
                                          }}
                                        />
                                        <div
                                          className="absolute right-0 top-8 z-50 w-44 bg-white rounded-xl shadow-xl border border-slate-200 p-1 text-xs font-semibold animate-in fade-in zoom-in-95 duration-150"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                            Move to...
                                          </div>
                                          {activeColumns.filter(c => c.id !== app.status).map(c => (
                                            <button
                                              key={c.id}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(null);
                                                handleStatusChange(app.id, c.id);
                                              }}
                                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-violet-50 hover:text-violet-700 transition-colors flex items-center gap-2"
                                            >
                                              <div className={`w-2 h-2 rounded-full ${c.color.split(' ')[0]}`} />
                                              {c.label}
                                            </button>
                                          ))}
                                          <div className="my-1 border-t border-slate-100" />
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenMenuId(null);
                                              handleDelete(app.id);
                                            }}
                                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 font-bold"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" /> Remove
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500">
                                    {app.reference_type}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="p-3.5 pt-0 space-y-2">
                                <div className="flex flex-col gap-2 mt-1.5">
                                  {app.due_date && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 p-1.5 rounded-lg w-fit">
                                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                                      {new Date(app.due_date).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>

                                {/* Mobile Instant Status Switcher for 1-Tap Moves */}
                                <div className="flex sm:hidden items-center justify-between gap-2 pt-2 border-t border-slate-100/80">
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                    Move:
                                  </span>
                                  <select
                                    value={app.status}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(app.id, e.target.value);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2 py-1 border-0 focus:ring-2 focus:ring-violet-500 cursor-pointer"
                                  >
                                    {activeColumns.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </CardContent>
                              {app.reference_type === "scholarship" && app.reference_id && (
                                <CardFooter className="p-4 pt-0">
                                  <a
                                    href={`/scholarships?search=${encodeURIComponent(app.title)}`}
                                    className="flex items-center justify-center w-full gap-2 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 py-2 rounded-xl transition-colors"
                                  >
                                    View Original <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </CardFooter>
                              )}

                              {((app.reference_type || "").toLowerCase() === "coaching" || (app.reference_type || "").toLowerCase() === "coaching_task") && (
                                <CardFooter className="p-4 pt-0">
                                  <a
                                    href="/coaching"
                                    className="flex items-center justify-center w-full gap-2 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 py-2 rounded-xl transition-colors"
                                  >
                                    View in Coaching <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </CardFooter>
                              )}
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}

                    {provided.placeholder}

                    {(!appsByStatus[col.id] || appsByStatus[col.id].length === 0) && (
                      <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-medium">
                        Empty
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {selectedJob && (
        <JobDetailPanel 
          job={selectedJob} 
          isOpen={!!selectedJob} 
          onClose={() => setSelectedJob(null)} 
          isTracked={true}
          onSave={() => {}}
        />
      )}
    </div>
  );
}
