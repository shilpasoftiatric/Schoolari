"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, Loader2,
  X, Check, AlertCircle, Search, Eye, EyeOff, Play,
  Film, Clock, BarChart2, Tag, CheckSquare, Upload, PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createEarnVideo,
  updateEarnVideo,
  deleteEarnVideo,
  toggleEarnVideoPublished,
  reorderEarnVideo,
  uploadEarnVideoFile,
} from "@/app/actions/admin";

// ─── Types ─────────────────────────────────────────────────

type ActionItem = { id?: string; title: string; sort_order: number };

type Video = {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  video_type: "youtube" | "mp4";
  youtube_url: string | null;
  mp4_storage_path: string | null;
  thumbnail_url: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  watch_time_mins: number | null;
  is_published: boolean;
  sort_order: number;
  earn_video_action_items?: ActionItem[];
  earn_categories?: { name: string } | null;
};

type Category = { id: string; name: string; sort_order: number };

type ModalState =
  | { open: false }
  | { open: true; type: "create" }
  | { open: true; type: "edit"; video: Video };

// ─── Helpers ───────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/watch\?v=([^?&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
    /youtube\.com\/v\/([^?&\s]+)/,
    /youtube\.com\/shorts\/([^?&\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getYouTubeThumbnail(url: string | null): string | null {
  if (!url) return null;
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: "Beginner", color: "bg-emerald-100 text-emerald-700" },
  intermediate: { label: "Intermediate", color: "bg-amber-100 text-amber-700" },
  advanced: { label: "Advanced", color: "bg-red-100 text-red-700" },
};

// ─── Video Form State ──────────────────────────────────────

type FormState = {
  category_id: string;
  title: string;
  description: string;
  video_type: "youtube" | "mp4";
  youtube_url: string;
  mp4File: File | null;
  mp4_storage_path: string;
  thumbnail_url: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  watch_time_mins: string;
  is_published: boolean;
  action_items: [string, string, string];
};

const EMPTY_FORM: FormState = {
  category_id: "",
  title: "",
  description: "",
  video_type: "youtube",
  youtube_url: "",
  mp4File: null,
  mp4_storage_path: "",
  thumbnail_url: "",
  difficulty: "beginner",
  watch_time_mins: "",
  is_published: false,
  action_items: ["", "", ""],
};

// ─── Main Component ────────────────────────────────────────

export function VideosTable({
  initialVideos,
  categories,
}: {
  initialVideos: Video[];
  categories: Category[];
}) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [modal, setModal] = useState<ModalState>({ open: false });

  // Sync server data to local state for real-time updates after revalidatePath
  useEffect(() => {
    setVideos(initialVideos);
  }, [initialVideos]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debounced YouTube preview
  const [ytPreviewId, setYtPreviewId] = useState<string | null>(null);
  useEffect(() => {
    const id = extractYouTubeId(form.youtube_url);
    setYtPreviewId(id);
  }, [form.youtube_url]);

  // ─── Filter / Search ─────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...videos].sort((a, b) => {
      if (a.category_id !== b.category_id) return a.category_id.localeCompare(b.category_id);
      return a.sort_order - b.sort_order;
    });
    if (filterCategory !== "all") result = result.filter(v => v.category_id === filterCategory);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.earn_categories?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [videos, filterCategory, search]);

  // ─── Modal helpers ────────────────────────────────────────
  const openCreate = () => {
    setSaveError("");
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id || "" });
    setModal({ open: true, type: "create" });
  };

  const openEdit = (v: Video) => {
    setSaveError("");
    const items = (v.earn_video_action_items || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(i => i.title);
    const triple: [string, string, string] = [items[0] || "", items[1] || "", items[2] || ""];
    setForm({
      category_id: v.category_id,
      title: v.title,
      description: v.description || "",
      video_type: v.video_type,
      youtube_url: v.youtube_url || "",
      mp4File: null,
      mp4_storage_path: v.mp4_storage_path || "",
      thumbnail_url: v.thumbnail_url || "",
      difficulty: v.difficulty,
      watch_time_mins: v.watch_time_mins?.toString() || "",
      is_published: v.is_published,
      action_items: triple,
    });
    setModal({ open: true, type: "edit", video: v });
  };

  const closeModal = () => { setModal({ open: false }); setSaveError(""); };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const setActionItem = (idx: number, val: string) =>
    setForm(prev => {
      const items: [string, string, string] = [...prev.action_items] as [string, string, string];
      items[idx] = val;
      return { ...prev, action_items: items };
    });

  // ─── Save ─────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setSaveError("Title is required."); return; }
    if (!form.category_id) { setSaveError("Category is required."); return; }
    if (form.video_type === "youtube" && !form.youtube_url.trim()) { setSaveError("YouTube URL is required."); return; }
    if (form.video_type === "mp4" && !form.mp4_storage_path && !form.mp4File) { setSaveError("Please select an MP4 file to upload."); return; }

    setSaveError("");

    let mp4_storage_path = form.mp4_storage_path;
    let thumbnail_url = form.thumbnail_url;

    // Upload MP4 if a new file was selected
    if (form.video_type === "mp4" && form.mp4File) {
      setIsUploading(true);
      setUploadProgress("Uploading video...");
      try {
        const fd = new FormData();
        fd.append("file", form.mp4File);
        const result = await uploadEarnVideoFile(fd);
        mp4_storage_path = result.storagePath;
        // Use public URL as thumbnail placeholder if no thumbnail
        if (!thumbnail_url) thumbnail_url = "";
        setUploadProgress("Upload complete!");
      } catch (err: any) {
        setSaveError(err.message || "Upload failed.");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
        setUploadProgress("");
      }
    }

    // Auto-generate YouTube thumbnail
    if (form.video_type === "youtube") {
      thumbnail_url = getYouTubeThumbnail(form.youtube_url) || "";
      mp4_storage_path = "";
    }

    const payload = {
      category_id: form.category_id,
      title: form.title,
      description: form.description,
      video_type: form.video_type,
      youtube_url: form.video_type === "youtube" ? form.youtube_url : undefined,
      mp4_storage_path: form.video_type === "mp4" ? mp4_storage_path : undefined,
      thumbnail_url,
      difficulty: form.difficulty,
      watch_time_mins: form.watch_time_mins ? parseInt(form.watch_time_mins) : null,
      is_published: form.is_published,
      action_items: form.action_items.filter(t => t.trim()),
    };

    startTransition(async () => {
      try {
        if (modal.open && modal.type === "edit") {
          await updateEarnVideo(modal.video.id, payload);
        } else {
          await createEarnVideo(payload);
        }
        closeModal();
      } catch (err: any) {
        setSaveError(err.message || "Failed to save.");
      }
    });
  };

  // ─── Delete ───────────────────────────────────────────────
  const handleDelete = (v: Video) => {
    if (!confirm(`Delete "${v.title}"? This cannot be undone.`)) return;
    setDeletingId(v.id);
    startTransition(async () => {
      try {
        await deleteEarnVideo(v.id);
        setVideos(prev => prev.filter(x => x.id !== v.id));
      } catch (err: any) { alert(err.message); }
      finally { setDeletingId(null); }
    });
  };

  // ─── Toggle Published ─────────────────────────────────────
  const handleToggle = (v: Video) => {
    setTogglingId(v.id);
    const newVal = !v.is_published;
    setVideos(prev => prev.map(x => x.id === v.id ? { ...x, is_published: newVal } : x));
    startTransition(async () => {
      try {
        await toggleEarnVideoPublished(v.id, newVal);
      } catch {
        setVideos(prev => prev.map(x => x.id === v.id ? { ...x, is_published: !newVal } : x));
      } finally { setTogglingId(null); }
    });
  };

  // ─── Reorder ──────────────────────────────────────────────
  const handleReorder = (v: Video, direction: "up" | "down") => {
    setReorderingId(v.id);
    startTransition(async () => {
      try { await reorderEarnVideo(v.id, direction); }
      finally { setReorderingId(null); }
    });
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex gap-3 flex-1 w-full md:max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search videos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="h-9 border border-slate-200 text-sm rounded-lg px-3 focus:ring-violet-500 bg-white min-w-[150px]"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Button
            onClick={openCreate}
            disabled={categories.length === 0}
            title={categories.length === 0 ? "Create a category first" : undefined}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold h-9 rounded-xl shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Video
          </Button>
        </div>

        {categories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <Tag className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-600 font-semibold">No categories yet</p>
            <p className="text-slate-400 text-sm mt-1">Go to the Categories tab and create at least one category before adding videos.</p>
          </div>
        )}

        {categories.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <PlayCircle className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-600 font-semibold">No videos found</p>
            <p className="text-slate-400 text-sm mt-1 mb-4">{search || filterCategory !== "all" ? "Try adjusting your search or filter." : "Add your first video to get started."}</p>
            {!search && filterCategory === "all" && (
              <Button onClick={openCreate} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold">
                <Plus className="w-4 h-4" /> Add First Video
              </Button>
            )}
          </div>
        )}

        {filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3 w-14">Thumb</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3">Title</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Category</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Difficulty</th>
                <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Actions</th>
                <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3">Published</th>
                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((v, idx) => {
                const thumb = v.video_type === "youtube"
                  ? getYouTubeThumbnail(v.youtube_url)
                  : null;
                const diff = DIFFICULTY_LABELS[v.difficulty];
                const sameCategory = filtered.filter(x => x.category_id === v.category_id);
                const catIdx = sameCategory.findIndex(x => x.id === v.id);

                return (
                  <tr key={v.id} className="group hover:bg-slate-50/50 transition-colors">
                    {/* Thumbnail */}
                    <td className="px-4 py-3">
                      {thumb ? (
                        <img src={thumb} alt={v.title} className="w-12 h-8 object-cover rounded-lg bg-slate-100" />
                      ) : (
                        <div className="w-12 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Film className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                    </td>

                    {/* Title + type badge */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{v.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {v.video_type === "youtube" ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                <Play className="w-3 h-3" /> YouTube
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                <Film className="w-3 h-3" /> MP4
                              </span>
                            )}
                            {v.watch_time_mins && (
                              <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-medium">
                                <Clock className="w-2.5 h-2.5" />{v.watch_time_mins}m
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                        {v.earn_categories?.name || "—"}
                      </span>
                    </td>

                    {/* Difficulty */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${diff.color}`}>{diff.label}</span>
                    </td>

                    {/* Action Items count */}
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-500">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                        {v.earn_video_action_items?.length || 0}
                      </span>
                    </td>

                    {/* Publish toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(v)}
                        disabled={togglingId === v.id}
                        title={v.is_published ? "Unpublish" : "Publish"}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full transition-all ${
                          v.is_published
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {togglingId === v.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : v.is_published ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                        {v.is_published ? "Live" : "Draft"}
                      </button>
                    </td>

                    {/* Controls */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleReorder(v, "up")} disabled={catIdx === 0 || reorderingId === v.id} title="Move up" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleReorder(v, "down")} disabled={catIdx === sameCategory.length - 1 || reorderingId === v.id} title="Move down" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(v)} title="Edit" className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(v)} disabled={deletingId === v.id} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                          {deletingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">
                {modal.type === "create" ? "Add Video" : "Edit Video"}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {saveError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {saveError}
                </div>
              )}

              {/* Row 1: Title + Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={form.title}
                    onChange={e => setField("title", e.target.value)}
                    placeholder="e.g. How to Start Freelancing as a Teen"
                    className="h-10"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.category_id}
                    onChange={e => setField("category_id", e.target.value)}
                    className="w-full h-10 border border-slate-200 text-sm rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                    required
                  >
                    <option value="">Select category...</option>
                    {categories.sort((a, b) => a.sort_order - b.sort_order).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={e => setField("difficulty", e.target.value as any)}
                    className="w-full h-10 border border-slate-200 text-sm rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Short Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setField("description", e.target.value)}
                  placeholder="1–2 sentences visible on the video card..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none transition-all"
                />
              </div>

              {/* Video Type Toggle */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Video Source <span className="text-red-400">*</span></label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setField("video_type", "youtube")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                      form.video_type === "youtube"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <Play className="w-4 h-4" /> YouTube
                  </button>
                  <button
                    type="button"
                    onClick={() => setField("video_type", "mp4")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                      form.video_type === "mp4"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <Film className="w-4 h-4" /> Upload MP4
                  </button>
                </div>

                {/* YouTube URL + Preview */}
                {form.video_type === "youtube" && (
                  <div className="space-y-3">
                    <Input
                      value={form.youtube_url}
                      onChange={e => setField("youtube_url", e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      className="h-10"
                    />
                    {ytPreviewId && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytPreviewId}`}
                          className="w-full h-full"
                          allowFullScreen
                          title="YouTube preview"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* MP4 Upload */}
                {form.video_type === "mp4" && (
                  <div className="space-y-3">
                    <label className={`flex flex-col items-center justify-center gap-2 w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      form.mp4File ? "border-blue-400 bg-blue-50/50" : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/30"
                    }`}>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0] || null;
                          setField("mp4File", f);
                        }}
                      />
                      <Upload className="w-6 h-6 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-500">
                        {form.mp4File ? form.mp4File.name : "Click to select MP4 / video file"}
                      </span>
                      {form.mp4File && (
                        <span className="text-xs text-slate-400">
                          {(form.mp4File.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      )}
                      {form.mp4_storage_path && !form.mp4File && (
                        <span className="text-xs text-blue-600 font-medium">Existing file — select a new one to replace</span>
                      )}
                    </label>
                    {isUploading && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Thumbnail URL <span className="text-slate-300 font-normal">(optional)</span></label>
                      <Input
                        value={form.thumbnail_url}
                        onChange={e => setField("thumbnail_url", e.target.value)}
                        placeholder="https://example.com/thumbnail.jpg"
                        className="h-10"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Watch Time */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  Estimated Watch Time (minutes)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="999"
                  value={form.watch_time_mins}
                  onChange={e => setField("watch_time_mins", e.target.value)}
                  placeholder="e.g. 12"
                  className="h-10 w-32"
                />
              </div>

              {/* Action Items */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                    <CheckSquare className="w-3.5 h-3.5 inline mr-1 text-emerald-500" />
                    Action Items <span className="text-slate-300 font-normal">(up to 3 — shown on student dashboard)</span>
                  </label>
                  <p className="text-xs text-slate-400 mt-0.5">Tasks the student should complete after watching this video.</p>
                </div>
                <div className="space-y-2">
                  {([0, 1, 2] as const).map(idx => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
                      <Input
                        value={form.action_items[idx]}
                        onChange={e => setActionItem(idx, e.target.value)}
                        placeholder={idx === 0 ? "e.g. Create a Fiverr profile" : idx === 1 ? "e.g. Post your first gig" : "e.g. Reach out to 3 potential clients"}
                        className="h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Published toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-800">Published</p>
                  <p className="text-xs text-slate-500">Students can only see published videos.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField("is_published", !form.is_published)}
                  className={`relative w-12 h-6 rounded-full transition-all focus:outline-none ${form.is_published ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_published ? "left-7" : "left-1"}`} />
                </button>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="outline" onClick={closeModal} className="rounded-xl font-semibold">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || isUploading}
                  className="gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold"
                >
                  {(isPending || isUploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {modal.type === "create" ? "Add Video" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
