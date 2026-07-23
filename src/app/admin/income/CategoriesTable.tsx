"use client";

import { useState, useTransition, useOptimistic, useEffect } from "react";
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, Loader2, GripVertical,
  FolderOpen, X, Check, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createEarnCategory,
  updateEarnCategory,
  deleteEarnCategory,
  reorderEarnCategory,
} from "@/app/actions/admin";

type Category = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
};

type ModalState =
  | { open: false }
  | { open: true; type: "create" }
  | { open: true; type: "edit"; category: Category };

export function CategoriesTable({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [modal, setModal] = useState<ModalState>({ open: false });

  // Sync server data to local state for real-time updates after revalidatePath
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);
  const [isPending, startTransition] = useTransition();
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  // ─── Helpers ───────────────────────────────────────────────

  const openCreate = () => { setSaveError(""); setModal({ open: true, type: "create" }); };
  const openEdit = (cat: Category) => { setSaveError(""); setModal({ open: true, type: "edit", category: cat }); };
  const closeModal = () => setModal({ open: false });

  // ─── Create / Edit ────────────────────────────────────────

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const description = (fd.get("description") as string).trim();

    if (!name) { setSaveError("Category name is required."); return; }

    setSaveError("");
    startTransition(async () => {
      try {
        if (modal.open && modal.type === "edit") {
          await updateEarnCategory(modal.category.id, { name, description });
          setCategories(prev =>
            prev.map(c => c.id === modal.category.id ? { ...c, name, description: description || null } : c)
          );
        } else {
          await createEarnCategory({ name, description });
          // Optimistic: refetch is handled by revalidatePath, page refreshes automatically
        }
        closeModal();
      } catch (err: any) {
        setSaveError(err.message || "Failed to save. Please try again.");
      }
    });
  };

  // ─── Delete ───────────────────────────────────────────────

  const handleDelete = (cat: Category) => {
    if (!confirm(`Delete "${cat.name}"? All videos in this category will also be deleted.`)) return;
    setDeletingId(cat.id);
    startTransition(async () => {
      try {
        await deleteEarnCategory(cat.id);
        setCategories(prev => prev.filter(c => c.id !== cat.id));
      } catch (err: any) {
        alert(err.message || "Failed to delete.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  // ─── Reorder ──────────────────────────────────────────────

  const handleReorder = (id: string, direction: "up" | "down") => {
    setReorderingId(id);

    // Optimistic UI update
    setCategories(prev => {
      const sorted = [...prev].sort((a, b) => a.sort_order - b.sort_order);
      const idx = sorted.findIndex(c => c.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const newArr = [...sorted];
      const tmp = newArr[idx].sort_order;
      newArr[idx] = { ...newArr[idx], sort_order: newArr[swapIdx].sort_order };
      newArr[swapIdx] = { ...newArr[swapIdx], sort_order: tmp };
      return newArr.sort((a, b) => a.sort_order - b.sort_order);
    });

    startTransition(async () => {
      try {
        await reorderEarnCategory(id, direction);
      } catch {
        // revalidatePath will sync on error
      } finally {
        setReorderingId(null);
      }
    });
  };

  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      {/* ── Section Header ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Categories</h2>
              <p className="text-xs text-slate-500">
                {categories.length} {categories.length === 1 ? "category" : "categories"} · Drag order determines student display order
              </p>
            </div>
          </div>
          <Button
            onClick={openCreate}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        </div>

        {/* ── Table ── */}
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
              <FolderOpen className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-700 font-semibold text-base">No categories yet</p>
            <p className="text-slate-400 text-sm mt-1 mb-4">Create your first category to start adding videos.</p>
            <Button onClick={openCreate} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
              <Plus className="w-4 h-4" /> Add First Category
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wide px-6 py-3 w-10">#</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3">Name</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Description</th>
                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wide px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((cat, idx) => (
                <tr key={cat.id} className="group hover:bg-slate-50/50 transition-colors">
                  {/* Order */}
                  <td className="px-6 py-3 text-slate-400 font-bold text-sm w-10">{idx + 1}</td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-slate-500 text-sm truncate max-w-xs block">
                      {cat.description || <span className="italic text-slate-300">No description</span>}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Reorder */}
                      <button
                        onClick={() => handleReorder(cat.id, "up")}
                        disabled={idx === 0 || reorderingId === cat.id}
                        title="Move up"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        {reorderingId === cat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleReorder(cat.id, "down")}
                        disabled={idx === sorted.length - 1 || reorderingId === cat.id}
                        title="Move down"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEdit(cat)}
                        title="Edit"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(cat)}
                        disabled={deletingId === cat.id}
                        title="Delete"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deletingId === cat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">
                {modal.type === "create" ? "Add Category" : "Edit Category"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {saveError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {saveError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Category Name <span className="text-red-400">*</span>
                </label>
                <Input
                  name="name"
                  placeholder="e.g. Freelancing, Content Creation"
                  defaultValue={modal.type === "edit" ? modal.category.name : ""}
                  className="h-10"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Description <span className="text-slate-300 font-normal">(optional)</span>
                </label>
                <textarea
                  name="description"
                  placeholder="Brief description shown to students..."
                  defaultValue={modal.type === "edit" ? (modal.category.description ?? "") : ""}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-all"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeModal} className="rounded-xl font-semibold">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {modal.type === "create" ? "Create Category" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
