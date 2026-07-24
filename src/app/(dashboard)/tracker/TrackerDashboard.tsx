"use client";

import { useState, useTransition, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, CheckCircle2, XCircle, Trash2, MoreHorizontal, ExternalLink } from "lucide-react";


import { useSearchParams } from "next/navigation";

const COLUMNS = [
  { id: "Not Started", label: "Not Started", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "In Progress", label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "Submitted", label: "Submitted", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "Won", label: "Won", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "Lost", label: "Lost", color: "bg-red-50 text-red-700 border-red-200" },
];

const CATEGORIES = [
  { id: "all", label: "All Items" },
  { id: "scholarship", label: "Scholarships" },
  { id: "essay", label: "Essays" },
  { id: "college", label: "Colleges" },
  { id: "job", label: "Jobs" },
  { id: "custom", label: "Tasks" },
];

export function TrackerDashboard({ initialApplications }: { initialApplications: any[] }) {
  const searchParams = useSearchParams();
  const initialType = searchParams?.get("type") || "all";
  const [activeCategory, setActiveCategory] = useState<string>(initialType);
  const [applications, setApplications] = useState(initialApplications);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        // Revert on failure (simplified)
        setApplications(initialApplications);
      }
    });
  };

  const handleDelete = (appId: string) => {
    if (!confirm("Are you sure you want to remove this from your tracker?")) return;

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
    return app.reference_type?.toLowerCase() === activeCategory.toLowerCase();
  });

  const appsByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = filteredApplications.filter((app) => app.status === col.id);
    return acc;
  }, {} as Record<string, any[]>);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    handleStatusChange(draggableId, destination.droppableId);
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-4">
      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {CATEGORIES.map((cat) => (
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

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory h-[calc(100vh-250px)] min-h-[550px]">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-80 flex flex-col bg-slate-100/50 rounded-3xl border border-slate-200 snap-center">
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
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto p-4 space-y-4 ${snapshot.isDraggingOver ? 'bg-slate-200/30 rounded-2xl' : ''}`}
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
                            <Card className={`shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group py-0 !overflow-visible ${col.id === 'Won' ? 'bg-emerald-50/30' : ''}`}>
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
                                          {COLUMNS.filter(c => c.id !== app.status).map(c => (
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
                              <CardContent className="p-3.5 pt-0">
                                <div className="flex flex-col gap-2 mt-1.5">
                                  {app.due_date && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 p-1.5 rounded-lg w-fit">
                                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                                      {new Date(app.due_date).toLocaleDateString()}
                                    </div>
                                  )}
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
    </div>
  );
}
