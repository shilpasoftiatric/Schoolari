"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { 
  UploadCloud, 
  FileText, 
  FileBadge, 
  File, 
  FileImage, 
  Trash2, 
  Download, 
  Loader2, 
  Link2, 
  Edit,
  Pencil,
  RefreshCw,
  X,
  CheckCircle2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import Swal from "@/lib/swal";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { renameDocumentAction, replaceDocumentAction } from "@/app/actions/documents";

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
  const router = useRouter();
  const [localDocuments, setLocalDocuments] = useState<any[]>(initialDocuments);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("transcript");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rename Document State
  const [renamingDoc, setRenamingDoc] = useState<any | null>(null);
  const [newName, setNewName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Replace Document State
  const [replacingDoc, setReplacingDoc] = useState<any | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalDocuments(initialDocuments);
  }, [initialDocuments]);

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setUploading(true);
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", uploadType);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData
      });
      const errJson = await res.json();
      if (!res.ok) {
        throw new Error(errJson.error || "Failed to upload document");
      }

      if (errJson.document) {
        const newDoc = { ...errJson.document, source: "upload", is_virtual: false };
        setLocalDocuments(prev => [newDoc, ...prev]);
      }

      toast.success(`Uploaded ${file.name} successfully!`, { id: toastId });
      router.refresh();

    } catch (err: any) {
      toast.error(err.message || "Failed to upload document", { id: toastId });
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

  const handleDelete = async (id: string, fileUrl: string, isVirtual: boolean) => {
    if (isVirtual) return; // Virtual documents are managed in their respective builders
    
    const result = await Swal.fire({
      title: "Delete Document?",
      text: "Are you sure you want to permanently delete this document from the Vault?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;
    
    // Optimistic UI update
    const previousDocs = [...localDocuments];
    setLocalDocuments(prev => prev.filter(doc => doc.id !== id));

    startTransition(async () => {
      try {
        if (!isVirtual) {
          const res = await fetch("/api/documents/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_url: fileUrl, doc_id: id }),
          });
          if (!res.ok) {
            const errJson = await res.json();
            throw new Error(errJson.error || "Failed to delete document");
          }
        }
        toast.success("Document removed from Vault.");
        router.refresh();
      } catch (err: any) {
        setLocalDocuments(previousDocs); // Revert on failure
        toast.error(err.message || "Failed to delete document");
      }
    });
  };

  // ── Rename Document ──────────────────────────────────────────────────────────
  const openRenameModal = (doc: any) => {
    setRenamingDoc(doc);
    setNewName(doc.name);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingDoc || !newName.trim()) return;

    setIsRenaming(true);
    try {
      await renameDocumentAction(renamingDoc.id, newName.trim());
      setLocalDocuments(prev =>
        prev.map(d => (d.id === renamingDoc.id ? { ...d, name: newName.trim() } : d))
      );
      setRenamingDoc(null);
      toast.success("Document renamed successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to rename document");
    } finally {
      setIsRenaming(false);
    }
  };

  // ── Replace Document File ───────────────────────────────────────────────────
  const openReplaceFilePicker = (doc: any) => {
    setReplacingDoc(doc);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = "";
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceFile = async (file: File) => {
    if (!file || !replacingDoc) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setIsReplacing(true);
    const toastId = toast.loading(`Uploading replacement version (${file.name})...`);

    try {
      const formData = new FormData();
      formData.set("id", replacingDoc.id);
      formData.set("existingFileUrl", replacingDoc.file_url);
      formData.set("file", file);

      const res = await replaceDocumentAction(formData);
      if (res?.document) {
        setLocalDocuments(prev =>
          prev.map(d =>
            d.id === replacingDoc.id
              ? { ...d, file_url: res.document.file_url, size_bytes: res.document.size_bytes }
              : d
          )
        );
      }
      setReplacingDoc(null);
      toast.success(`Successfully replaced with new version (${file.name})!`, { id: toastId });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to replace document", { id: toastId });
    } finally {
      setIsReplacing(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "certificate":
      case "award":
        return <FileBadge className="w-8 h-8 text-amber-500" />;
      case "transcript":
      case "report_card":
      case "resume":
      case "essay":
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

  // Group documents
  const resumes = localDocuments.filter(d => d.type === "resume");
  const essays = localDocuments.filter(d => d.type === "essay");
  const others = localDocuments.filter(d => d.type !== "resume" && d.type !== "essay");

  const DocumentCard = ({ doc }: { doc: any }) => (
    <div key={doc.id} className="group bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between h-full min-h-[175px] relative overflow-hidden">
      <div className="flex items-start justify-between mb-5 gap-3">
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0">
          {getFileIcon(doc.type)}
        </div>
        <div className="flex items-center gap-2">
          {doc.is_virtual ? (
            <Link 
              href={doc.file_url}
              className="px-4 h-9 rounded-xl flex items-center justify-center border border-violet-200 text-violet-600 hover:bg-violet-600 hover:text-white transition-colors text-xs font-bold shadow-xs"
            >
              <Edit className="w-4 h-4 mr-1.5" /> Edit / View
            </Link>
          ) : (
            <>
              <a 
                href={doc.file_url} 
                target="_blank" 
                rel="noreferrer"
                title="Download / View"
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 transition-colors"
              >
                <Download className="w-4 h-4" />
              </a>

              <button 
                type="button"
                onClick={() => openRenameModal(doc)}
                title="Rename document"
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>

              <button 
                type="button"
                onClick={() => openReplaceFilePicker(doc)}
                disabled={isReplacing && replacingDoc?.id === doc.id}
                title="Replace file with new version"
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
              >
                {isReplacing && replacingDoc?.id === doc.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>

              <button 
                type="button"
                onClick={() => handleDelete(doc.id, doc.file_url, doc.is_virtual)}
                disabled={isPending}
                title="Delete document"
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-red-100 text-red-500 bg-red-50 hover:bg-red-100 hover:border-red-200 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="mt-auto pt-2">
        <h4 className="font-bold text-slate-900 line-clamp-1 mb-2 text-base" title={doc.name}>
          {doc.name}
        </h4>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg">
            {doc.type.replace('_', ' ')}
          </span>
          <span className="text-xs text-slate-400 font-semibold">
            {doc.is_virtual ? (
              <span className="text-violet-600 font-bold text-xs">{doc.source === "resume_builder" ? "Resume Builder" : "Essay Builder"}</span>
            ) : (
              formatBytes(doc.size_bytes)
            )}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-12">
      {/* Hidden File Input for Replace File */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleReplaceFile(file);
          }
        }}
      />

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
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
        />
        
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
          ) : (
            <UploadCloud className="w-8 h-8 text-violet-600" />
          )}
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 mb-2">Upload a document</h3>
        <p className="text-slate-500 text-center max-w-sm mb-4">
          Drag and drop your PDF, Word, or image files here, or click to browse. Max size 10MB.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <span className="text-sm font-semibold text-slate-500">Document Type:</span>
          <select 
            value={uploadType} 
            onChange={(e) => setUploadType(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-xs"
          >
            {DOCUMENT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        
        <Button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-slate-900 text-white hover:bg-violet-600 font-bold px-8 rounded-xl shadow-xs transition-all"
        >
          {uploading ? "Uploading..." : "Browse Files"}
        </Button>
      </div>

      {/* Resumes Section */}
      {(resumes.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-2xl font-extrabold text-slate-900 border-b border-slate-200 pb-2">Resumes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
          </div>
        </div>
      )}

      {/* Essays Section */}
      {(essays.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-2xl font-extrabold text-slate-900 border-b border-slate-200 pb-2">Essays</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {essays.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
          </div>
        </div>
      )}

      {/* Other Documents Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 border-b border-slate-200 pb-2">Other Documents</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Upload any other files related to your college or scholarship applications — award letters, certificates, test scores, financial aid documents, or anything else you want to keep organized.
          </p>
        </div>
        {others.length === 0 ? (
          <div className="py-12 text-center border border-slate-100 rounded-3xl bg-white shadow-xs">
            <p className="text-slate-500">No other documents uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {others.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
          </div>
        )}
      </div>
      
      {/* Empty State when completely empty */}
      {localDocuments.length === 0 && resumes.length === 0 && essays.length === 0 && (
        <div className="col-span-full py-12 text-center border border-slate-100 rounded-3xl bg-white shadow-xs">
          <p className="text-slate-500">Your vault is entirely empty. Upload your first document or start building your resume/essays.</p>
        </div>
      )}

      {/* Rename Document Modal */}
      {renamingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Rename Document</h3>
                  <p className="text-xs text-slate-500">Change the custom display name</p>
                </div>
              </div>
              <button 
                onClick={() => setRenamingDoc(null)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Document Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g. Stanford Recommendation Letter"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setRenamingDoc(null)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isRenaming || !newName.trim()}
                  className="bg-slate-900 hover:bg-violet-600 text-white rounded-xl text-xs font-bold px-5"
                >
                  {isRenaming ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                    </>
                  ) : (
                    "Save Name"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
