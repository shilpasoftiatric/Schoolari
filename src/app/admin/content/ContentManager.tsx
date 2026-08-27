"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Lightbulb, Quote, Megaphone, CalendarDays, Star, Layout, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContent, updateContent, deleteContent, toggleContentActive } from "@/app/actions/admin-content";
import { toast } from "sonner";

type ContentType = "tip" | "quote" | "announcement" | "event" | "featured_scholarship" | "banner";

const CONTENT_TYPES: { value: ContentType; label: string; icon: any; color: string; description: string }[] = [
  { value: "tip", label: "Today's Tip", icon: Lightbulb, color: "bg-yellow-100 text-yellow-700", description: "Daily actionable advice" },
  { value: "quote", label: "Quote", icon: Quote, color: "bg-purple-100 text-purple-700", description: "Motivational quotes" },
  { value: "announcement", label: "Announcement", icon: Megaphone, color: "bg-blue-100 text-blue-700", description: "Platform announcements" },
  { value: "event", label: "Upcoming Event", icon: CalendarDays, color: "bg-rose-100 text-rose-700", description: "Webinars, deadlines, events" },
  { value: "featured_scholarship", label: "Featured Scholarship", icon: Star, color: "bg-amber-100 text-amber-700", description: "Highlighted scholarships" },
  { value: "banner", label: "Dashboard Banner", icon: Layout, color: "bg-indigo-100 text-indigo-700", description: "Full-width banners" },
];

function EmptyForm() {
  return {
    type: "tip" as ContentType,
    title: "",
    body: "",
    cta_label: "",
    cta_url: "",
    scheduled_at: "",
    expires_at: "",
    is_active: true,
  };
}

import { useRouter } from "next/navigation";

export function ContentManager({ initialItems }: { initialItems: any[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filterType, setFilterType] = useState<ContentType | "all">("all");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EmptyForm());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const filtered = filterType === "all" ? items : items.filter((i) => i.type === filterType);

  const handleCreate = () => {
    startTransition(async () => {
      const result = await createContent(form);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Content created!");
      setIsCreating(false);
      setForm(EmptyForm());
      router.refresh();
    });
  };

  const handleUpdate = (id: string) => {
    startTransition(async () => {
      const result = await updateContent(id, {
        title: form.title,
        body: form.body,
        cta_label: form.cta_label,
        cta_url: form.cta_url,
        is_active: form.is_active,
        scheduled_at: form.scheduled_at || undefined,
        expires_at: form.expires_at || undefined,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Content updated!");
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...form } : it)));
      setEditingId(null);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteContent(id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Content deleted.");
      setItems((prev) => prev.filter((it) => it.id !== id));
    });
  };

  const handleToggle = (id: string, current: boolean) => {
    startTransition(async () => {
      await toggleContentActive(id, !current);
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, is_active: !current } : it)));
    });
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      type: item.type,
      title: item.title,
      body: item.body,
      cta_label: item.cta_label || "",
      cta_url: item.cta_url || "",
      scheduled_at: item.scheduled_at ? item.scheduled_at.slice(0, 16) : "",
      expires_at: item.expires_at ? item.expires_at.slice(0, 16) : "",
      is_active: item.is_active,
    });
    setIsCreating(false);
  };

  const getTypeMeta = (type: string) =>
    CONTENT_TYPES.find((t) => t.value === type) || CONTENT_TYPES[0];

  return (
    <div className="space-y-6">
      {/* Type Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterType("all")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${filterType === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
        >
          All
        </button>
        {CONTENT_TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${filterType === t.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500 font-medium">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</p>
        <Button
          onClick={() => { setIsCreating(true); setEditingId(null); setForm(EmptyForm()); }}
          className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> New Content
        </Button>
      </div>

      {/* Create / Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-extrabold text-slate-900">
              {isCreating ? "New Content Item" : "Edit Content Item"}
            </h2>
            <button onClick={() => { setIsCreating(false); setEditingId(null); }}>
              <X className="w-5 h-5 text-slate-400 hover:text-slate-700" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isCreating && (
              <div className="md:col-span-2 space-y-2">
                <Label>Content Type</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONTENT_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all text-left ${form.type === t.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <div>
                          <p>{t.label}</p>
                          <p className={`text-[10px] font-normal ${form.type === t.value ? "text-slate-400" : "text-slate-400"}`}>{t.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="md:col-span-2 space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Content title..." />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Body / Content</Label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={4}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                placeholder="Write the full content..."
              />
            </div>
            <div className="space-y-2">
              <Label>CTA Button Label <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input value={form.cta_label} onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))} placeholder="e.g. Learn More" />
            </div>
            <div className="space-y-2">
              <Label>CTA URL <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input value={form.cta_url} onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Schedule (show from) <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Expires At <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <button
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${form.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_active ? "left-7" : "left-1"}`} />
              </button>
              <span className="text-sm font-medium text-slate-700">{form.is_active ? "Active (visible to students)" : "Inactive (hidden)"}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setIsCreating(false); setEditingId(null); }}>Cancel</Button>
            <Button
              onClick={() => (isCreating ? handleCreate() : handleUpdate(editingId!))}
              disabled={isPending}
              className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
            >
              {isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {isCreating ? "Create" : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      {/* Items Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <p className="text-slate-400 font-medium">No content yet. Click "New Content" to add something.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const meta = getTypeMeta(item.type);
            const Icon = meta.icon;
            return (
              <div key={item.id} className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden transition-all ${item.is_active ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${meta.color}`}>
                      <Icon className="w-3.5 h-3.5" /> {meta.label}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-3 mb-4">{item.body}</p>
                  {item.scheduled_at && (
                    <p className="text-xs text-slate-400 font-medium">
                      Starts: {new Date(item.scheduled_at).toLocaleString()}
                    </p>
                  )}
                  {item.expires_at && (
                    <p className="text-xs text-slate-400 font-medium">
                      Expires: {new Date(item.expires_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="px-5 pb-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => handleToggle(item.id, item.is_active)}
                    disabled={isPending}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    title={item.is_active ? "Deactivate" : "Activate"}
                  >
                    {item.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors ml-auto"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
