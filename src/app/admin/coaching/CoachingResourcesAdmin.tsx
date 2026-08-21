"use client";

import React, { useState } from "react";
import { 
  BookOpen, 
  FileText, 
  Sparkles, 
  Download, 
  Upload, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  CoachingResourceItem, 
  uploadCoachingResource, 
  deleteCoachingResource,
  getCoachingResources 
} from "@/app/actions/admin-coaching";

const ICON_MAP: Record<string, any> = {
  BookOpen,
  FileText,
  Sparkles,
  Download,
};

interface CoachingResourcesAdminProps {
  initialResources: CoachingResourceItem[];
}

export function CoachingResourcesAdmin({ initialResources }: CoachingResourcesAdminProps) {
  const [resources, setResources] = useState<CoachingResourceItem[]>(initialResources);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshResources = async () => {
    try {
      const updated = await getCoachingResources();
      setResources(updated);
    } catch (err) {
      console.error("Failed to refresh coaching resources:", err);
    }
  };

  const handleFileUpload = async (resourceId: string, file: File) => {
    if (!file) return;

    // Validate size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size exceeds 25MB limit.");
      return;
    }

    setUploadingId(resourceId);
    const toastId = toast.loading(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.set("resourceId", resourceId);
      formData.set("file", file);

      const res = await uploadCoachingResource(formData);
      if (res?.error) {
        toast.error(res.error, { id: toastId });
      } else {
        toast.success(`Successfully uploaded "${file.name}"!`, { id: toastId });
        await refreshResources();
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed.", { id: toastId });
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async (resourceId: string, title: string) => {
    if (!confirm(`Are you sure you want to remove the uploaded file for "${title}"?`)) {
      return;
    }

    setDeletingId(resourceId);
    const toastId = toast.loading(`Removing file...`);

    try {
      const res = await deleteCoachingResource(resourceId);
      if (res?.error) {
        toast.error(res.error, { id: toastId });
      } else {
        toast.success(`Removed uploaded file for "${title}".`, { id: toastId });
        await refreshResources();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to remove file.", { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-200 text-[10px] font-extrabold uppercase tracking-wider rounded-full border border-indigo-400/30">
              Student Downloads
            </span>
            <span className="text-xs text-indigo-200/80">4 Categories</span>
          </div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Coaching Resources & Handouts Management
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Upload guidebooks, cheat sheets, templates, and roadmaps. When uploaded here, students can instantly download them from the &quot;Coaching Resources&quot; popup on their Coaching page.
          </p>
        </div>
      </div>

      {/* Resource Cards Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
        {resources.map((item) => {
          const Icon = ICON_MAP[item.iconName] || BookOpen;
          const isUploading = uploadingId === item.id;
          const isDeleting = deletingId === item.id;
          const fileInputId = `file-input-${item.id}`;

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all p-5 flex flex-col justify-between group"
            >
              <div>
                {/* Category & Icon */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0 shadow-2xs font-bold`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        {item.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  {item.fileUrl ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full border border-amber-200 shrink-0">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      No File
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-4 leading-relaxed line-clamp-2">
                  {item.description}
                </p>

                {/* Uploaded File Info Box */}
                {item.fileUrl ? (
                  <div className="mb-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate" title={item.fileName || "Uploaded document"}>
                          {item.fileName || "Uploaded Document"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.fileSize ? formatFileSize(item.fileSize) : "Ready for download"}
                          {item.updatedAt && ` • ${new Date(item.updatedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>

                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
                      title="Preview file in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-amber-50/60 border border-dashed border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Upload a PDF or document for students to download.</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <input
                  id={fileInputId}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(item.id, file);
                      e.target.value = "";
                    }
                  }}
                />

                <Button
                  type="button"
                  size="sm"
                  variant={item.fileUrl ? "outline" : "default"}
                  disabled={isUploading || isDeleting}
                  onClick={() => document.getElementById(fileInputId)?.click()}
                  className={`gap-1.5 text-xs h-9 font-bold flex-1 ${
                    item.fileUrl 
                      ? "hover:border-indigo-300 hover:text-indigo-700" 
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : item.fileUrl ? (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Replace File
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Upload File
                    </>
                  )}
                </Button>

                {item.fileUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isUploading || isDeleting}
                    onClick={() => handleDelete(item.id, item.title)}
                    className="h-9 px-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove uploaded file"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
