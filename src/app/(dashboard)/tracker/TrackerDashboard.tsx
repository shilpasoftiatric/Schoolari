"use client";

import { useState, useTransition } from "react";
import { updateApplicationStatus, deleteApplication } from "@/app/actions/tracker";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, CheckCircle2, XCircle, Trash2, MoreHorizontal, ExternalLink } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const COLUMNS = [
  { id: "Not Started", label: "Not Started", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "In Progress", label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "Submitted", label: "Submitted", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "Won", label: "Won", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "Lost", label: "Lost", color: "bg-red-50 text-red-700 border-red-200" },
];

export function TrackerDashboard({ initialApplications }: { initialApplications: any[] }) {
  const [applications, setApplications] = useState(initialApplications);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (appId: string, newStatus: string) => {
    // Optimistic UI update
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
    );

    startTransition(async () => {
      try {
        await updateApplicationStatus(appId, newStatus);
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
        await deleteApplication(appId);
      } catch (e) {
        console.error("Failed to delete", e);
        setApplications(initialApplications);
      }
    });
  };

  const appsByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = applications.filter((app) => app.status === col.id);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory h-[calc(100vh-200px)] min-h-[600px]">
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {appsByStatus[col.id]?.map((app) => (
              <Card key={app.id} className={`shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group ${col.id === 'Won' ? 'bg-emerald-50/30' : ''}`}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-bold leading-tight pr-6">
                      {app.scholarships.name}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Move to...</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {COLUMNS.filter(c => c.id !== app.status).map(c => (
                          <DropdownMenuItem key={c.id} onClick={() => handleStatusChange(app.id, c.id)}>
                            {c.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(app.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{app.scholarships.organization_name}</p>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 p-1.5 rounded-lg w-fit">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {app.scholarships.deadline}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-600">
                      {app.scholarships.award_amount}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <a 
                    href={app.scholarships.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full gap-2 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 py-2 rounded-xl transition-colors"
                  >
                    View Application <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </CardFooter>
              </Card>
            ))}
            
            {(!appsByStatus[col.id] || appsByStatus[col.id].length === 0) && (
              <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-medium">
                Empty
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
