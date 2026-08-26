"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Briefcase, Building, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createCoverLetter } from "@/app/actions/essays";
import { toast } from "sonner";

interface CreateCoverLetterModalProps {
  isLimitReached: boolean;
  limit: number;
  resetDate: string;
}

export function CreateCoverLetterModal({
  isLimitReached,
  limit,
  resetDate,
}: CreateCoverLetterModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) {
      toast.error("Please provide both company name and target role.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createCoverLetter(company.trim(), role.trim(), notes.trim());
      if (res?.id) {
        toast.success("Cover letter created!");
        setOpen(false);
        router.push(`/essays/${res.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create cover letter.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLimitReached) {
    return (
      <button
        type="button"
        disabled
        title={`You have reached your monthly limit of ${limit} cover letters. Resets on ${resetDate}.`}
        className="flex items-center gap-2 bg-slate-200 text-slate-500 font-bold py-2.5 px-5 rounded-xl cursor-not-allowed text-sm"
      >
        <Plus className="w-4 h-4" />
        New Cover Letter
      </button>
    );
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm shadow-violet-200 text-sm h-auto cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        New Cover Letter
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white shadow-2xl border border-slate-100">
          <DialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mb-1">
              <Briefcase className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-slate-900">
              Create New Cover Letter
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter the company and role details to start a tailored cover letter draft with AI assistance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" /> Target Company / Organization *
              </label>
              <Input
                placeholder="e.g. Google, NASA, Palantir, Local Clinic"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                disabled={isSubmitting}
                className="rounded-xl border-slate-200 focus:border-violet-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Target Role or Internship Title *
              </label>
              <Input
                placeholder="e.g. Software Engineering Intern, Research Assistant"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                disabled={isSubmitting}
                className="rounded-xl border-slate-200 focus:border-violet-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Specific Notes or Focus (Optional)
              </label>
              <textarea
                placeholder="Paste key requirements or points you want emphasized..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-slate-300 resize-none min-h-[70px]"
              />
            </div>

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !company.trim() || !role.trim()}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl gap-2 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Start Writing
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
