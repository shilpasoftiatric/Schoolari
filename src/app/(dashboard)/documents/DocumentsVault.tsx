"use client";

import { useState, useTransition, useRef } from "react";
import { UploadCloud, FileText, FileBadge, File, FileImage, Trash2, Download, Loader2, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadDocumentAction, deleteDocument } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";

const DOCUMENT_TYPES = [
  { value: "transcript", label: "Transcript" },
  { value: "report_card", label: "Report Card" },
  { value: "recommendation_letter", label: "Recommendation Letter" },
  { value: "essay", label: "Essay" },
  { value: "resume", label: "Resume" },
  { value: "certificate", label: "Certificate" },
  { value: "award", label: "Award" },
  { value: "other", label: "Other" },
];

export function DocumentsVault({ initialDocuments, userId }: { initialDocuments: any[], userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await uploadDocumentAction(formData);

    } catch (err: any) {
      alert(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = (id: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to permanently delete this document?")) return;
    startTransition(async () => {
      try {
        await deleteDocument(id, fileUrl);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "certificate":
      case "award":
        return <FileBadge className="w-8 h-8 text-amber-500" />;
      case "transcript":
      case "report_card":
      case "resume":
        return <FileText className="w-8 h-8 text-blue-500" />;
      default:
        return <File className="w-8 h-8 text-slate-400" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8">
      {/* Upload Zone */}
      <div 
        className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all ${
          dragActive ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        />
        
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
          ) : (
            <UploadCloud className="w-8 h-8 text-violet-600" />
          )}
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 mb-2">Upload a document</h3>
        <p className="text-slate-500 text-center max-w-sm mb-6">
          Drag and drop your PDF, Word, or image files here, or click to browse. Max size 10MB.
        </p>
        
        <Button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-slate-900 text-white hover:bg-violet-600 font-bold px-8 rounded-xl shadow-sm transition-all"
        >
          {uploading ? "Uploading..." : "Browse Files"}
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {initialDocuments.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-slate-100 rounded-3xl bg-white shadow-sm">
            <p className="text-slate-500">Your vault is empty. Upload your first document above.</p>
          </div>
        ) : (
          initialDocuments.map((doc) => (
            <div key={doc.id} className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col h-full relative overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                  {getFileIcon(doc.type)}
                </div>
                <div className="flex gap-2">
                  <a 
                    href={doc.file_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button 
                    onClick={() => handleDelete(doc.id, doc.file_url)}
                    disabled={isPending}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-red-100 text-red-500 bg-red-50 hover:bg-red-100 hover:border-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-auto">
                <h4 className="font-bold text-slate-900 line-clamp-1 mb-1" title={doc.name}>
                  {doc.name}
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                    {doc.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {formatBytes(doc.size_bytes)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
