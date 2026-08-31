"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAIState } from "@/context/AIStateContext";
import Swal from "@/lib/swal";
import { toast } from "sonner";
import {
  ResumeDocument,
  UserResumesPayload,
  ResumeTemplateTheme,
  ATSTailorResult
} from "@/types/resume";
import {
  getResumesAction,
  saveResumesAction,
  exportResumeToVaultAction,
  checkResumeCreationLimitAction
} from "@/app/actions/resume";
import {
  generateResumeFromProfileAction,
  tailorResumeToJobAIAction,
  importResumeWithAIAction
} from "@/app/actions/resume-ai";
import {
  ContactEditor,
  EducationEditor,
  ExperienceEditor,
  ExtracurricularsEditor,
  AwardsEditor,
  SkillsEditor
} from "./ResumeSectionEditors";
import { ResumePreview } from "./ResumePreview";
import { StarBulletModal } from "./StarBulletModal";
import { Button } from "@/components/ui/button";
import { AILoader } from "@/components/ui/AILoader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  GraduationCap,
  Briefcase,
  BookOpen,
  Trophy,
  Code,
  Sparkles,
  Target,
  Plus,
  Save,
  Check,
  Eye,
  Edit3,
  Loader2,
  FileText,
  ChevronDown,
  Upload,
  Trash2,
  ArrowLeft,
  Clock
} from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface ResumeBuilderClientProps {
  initialPayload: UserResumesPayload;
}

export function ResumeBuilderClient({ initialPayload = null, aiUsage }: { initialPayload?: UserResumesPayload | null, aiUsage?: any }) {
  const { resumeData, setResumeData } = useAIState();
  const [payload, setPayload] = useState<UserResumesPayload | null>(initialPayload || resumeData);
  const isLimitReached = aiUsage ? aiUsage.resume.used >= aiUsage.resume.limit : false;
  const isStrictlyOverLimit = aiUsage ? aiUsage.resume.used > aiUsage.resume.limit : false;
  const isOverBudget = aiUsage ? aiUsage.estimated_cost_usd >= aiUsage.monthly_budget_cap_usd : false;
  const isAiBlocked = isOverBudget;

  const updatePayloadState = (newPayload: UserResumesPayload | null) => {
    setPayload(newPayload);
    setResumeData(newPayload);
  };

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const editingResumeId = searchParams.get("id");

  const [activeId, setActiveId] = useState<string>(
    editingResumeId || payload?.active_resume_id || payload?.resumes?.[0]?.id || ""
  );

  useEffect(() => {
    if (editingResumeId) {
      setActiveId(editingResumeId);
    }
  }, [editingResumeId]);

  const [loading, setLoading] = useState(!payload);
  const [resumeDropdownOpen, setResumeDropdownOpen] = useState(false);

  // Saving & prefilling states
  const [isSaving, setIsSaving] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isSavingVault, setIsSavingVault] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [selectedSection, setSelectedSection] = useState<
    "contact" | "education" | "experience" | "extracurriculars" | "awards" | "skills"
  >("contact");

  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  // AI STAR modal state
  const [starModalOpen, setStarModalOpen] = useState(false);
  const [starOriginalText, setStarOriginalText] = useState("");
  const [starRoleTitle, setStarRoleTitle] = useState("");
  const starOnApplyRef = useRef<(newText: string) => void>(() => { });

  // ATS Tailor modal state
  const [atsModalOpen, setAtsModalOpen] = useState(false);
  const [atsJobText, setAtsJobText] = useState("");
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsResult, setAtsResult] = useState<ATSTailorResult | null>(null);

  // Step 1: Choose Resume Type modal state
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [startStep, setStartStep] = useState<"options" | "type">("options");
  const [selectedNewType, setSelectedNewType] = useState<
    "academic" | "professional" | "both"
  >("professional");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      // Only intercept if they are scrolling vertically
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    // Need passive: false to allow e.preventDefault()
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (resumeData) {
      setPayload(resumeData);
      setActiveId((prev) => prev || resumeData.active_resume_id || resumeData.resumes[0]?.id || "");
      setLoading(false);
    }
  }, [resumeData]);

  if (loading || !payload) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-violet-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="font-semibold animate-pulse">Loading resume workspace...</span>
      </div>
    );
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (isImporting || isSaving || isPrefilling) return;

    setIsImporting(true);
    setTypeModalOpen(false);

    try {
      const { checkResumeCreationLimitAction } = await import("@/app/actions/resume");
      const check = await checkResumeCreationLimitAction();
      if (!check.canCreate) {
        await Swal.fire({
          title: "Monthly Resume Limit Reached",
          text: check.error || `You have reached your monthly resume limit (${check.limit} resumes). Your access resets on ${check.resetDate}. Upgrade your plan for more access.`,
          icon: "warning",
          confirmButtonText: "Upgrade Plan",
          confirmButtonColor: "#4f46e5",
          showCancelButton: true,
          cancelButtonText: "Close"
        }).then((res) => {
          if (res.isConfirmed) {
            window.location.href = "/profile";
          }
        });
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const generated = await importResumeWithAIAction(formData);
      generated.is_unsaved = true;

      const newPayload = {
        resumes: [...payload.resumes, generated],
        active_resume_id: generated.id
      };

      updatePayloadState(newPayload);
      setActiveId(generated.id);

      Swal.fire({
        title: "Resume Imported!",
        text: "AI successfully parsed your resume and improved your bullet points using the STAR method. Please review them carefully.",
        icon: "success",
        confirmButtonColor: "#4f46e5"
      });

    } catch (err: any) {
      toast.error(err.message || "Failed to import resume.");
      setTypeModalOpen(true); // Re-open on error
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const activeResume =
    payload.resumes.find((r) => r.id === activeId) || payload.resumes[0];

  const updateActiveResume = (updatedOrUpdater: ResumeDocument | ((prev: ResumeDocument) => ResumeDocument)) => {
    setPayload((prevPayload) => {
      if (!prevPayload) return null;
      const active = prevPayload.resumes.find((r) => r.id === activeId);
      if (!active) return prevPayload;

      const updated = typeof updatedOrUpdater === "function" ? updatedOrUpdater(active) : updatedOrUpdater;

      const newPayload = {
        ...prevPayload,
        resumes: prevPayload.resumes.map((r) =>
          r.id === updated.id ? updated : r
        )
      };
      setResumeData(newPayload);
      return newPayload;
    });
  };

  const formatResumeTitle = (r: ResumeDocument) => {
    const firstName = r.header?.first_name || "Student";
    const lastName = r.header?.last_name || "";
    const typeText = r.resume_type === "academic" ? "Academic" : r.resume_type === "professional" ? "Professional" : "Resume";
    return lastName ? `${firstName} ${lastName} - ${typeText} Resume` : `${firstName} - ${typeText} Resume`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    let payloadToSave = payload;
    const currentResumeIndex = payload.resumes.findIndex(r => r.id === activeId);
    if (currentResumeIndex !== -1) {
      const updatedResumes = [...payload.resumes];
      updatedResumes[currentResumeIndex] = {
        ...updatedResumes[currentResumeIndex],
        title: formatResumeTitle(updatedResumes[currentResumeIndex]),
        is_unsaved: false
      };
      payloadToSave = { ...payload, resumes: updatedResumes };
      updatePayloadState(payloadToSave);
    }

    try {
      await saveResumesAction(payloadToSave);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.message || "Error saving resume");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditResume = (id: string) => {
    setActiveId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDeleteResume = async (e: React.MouseEvent, resumeId: string) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: "Delete Resume?",
      text: "Are you sure you want to delete this resume? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancel",
      cancelButtonColor: "#94a3b8"
    });

    if (!result.isConfirmed) return;

    if (isSaving || isPrefilling) return;
    const remainingResumes = payload.resumes.filter((r) => r.id !== resumeId);
    const newActiveId = activeId === resumeId ? (remainingResumes[0]?.id || "") : activeId;
    const newPayload = {
      resumes: remainingResumes,
      active_resume_id: newActiveId
    };

    setIsSaving(true);
    try {
      await saveResumesAction(newPayload);
      updatePayloadState(newPayload);
      if (newActiveId) {
        setActiveId(newActiveId);
      }
      toast.success("Resume deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete resume");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewResume = async (
    type: "academic" | "professional" | "both" = "professional"
  ) => {
    if (isSaving || isPrefilling) return;
    setIsSaving(true);

    try {
      const check = await checkResumeCreationLimitAction();
      if (!check.canCreate) {
        await Swal.fire({
          title: "Monthly Resume Limit Reached",
          text: check.error || `You have reached your monthly resume limit (${check.limit} resumes). Your access resets on ${check.resetDate}. Upgrade your plan for more access.`,
          icon: "warning",
          confirmButtonText: "Upgrade Plan",
          confirmButtonColor: "#4f46e5",
          showCancelButton: true,
          cancelButtonText: "Close"
        }).then((res) => {
          if (res.isConfirmed) {
            window.location.href = "/profile";
          }
        });
        return;
      }

      const newId = "resume-" + Date.now();
      const newDoc: ResumeDocument = {
        id: newId,
        is_unsaved: true,
        title:
          type === "academic"
            ? "Academic Resume — College & Scholarships"
            : type === "professional"
              ? "Professional Resume — Jobs & Internships"
              : "Academic & Professional Resume",
        resume_type: type,
        template_theme: "classic",
        header: {
          first_name: activeResume?.header?.first_name || "",
          last_name: activeResume?.header?.last_name || "",
          email: activeResume?.header?.email || "",
          phone: activeResume?.header?.phone || "",
          city_state: activeResume?.header?.city_state || "",
          summary: "",
          target_job_or_internship: "",
          college_or_career_goals: ""
        },
        education: [],
        experience: [],
        extracurriculars: [],
        awards: [],
        skills: {
          technical: [],
          soft: [],
          languages: [],
          certifications: []
        },
        last_modified: new Date().toISOString()
      };

      const newPayload: UserResumesPayload = {
        resumes: [...payload.resumes, newDoc],
        active_resume_id: newId
      };

      updatePayloadState(newPayload);
      setActiveId(newId);

      const params = new URLSearchParams(searchParams.toString());
      params.set("id", newId);
      router.push(`${pathname}?${params.toString()}`);
      toast.success("Blank resume created successfully");
      setTypeModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save new resume");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrefillFromProfile = async (
    targetType?: "academic" | "professional" | "both",
    isNew: boolean = false
  ) => {
    if (isSaving || isPrefilling) return;
    setIsPrefilling(true);

    const typeToUse = targetType || activeResume?.resume_type || "professional";

    try {
      if (isNew) {
        const check = await checkResumeCreationLimitAction();
        if (!check.canCreate) {
          await Swal.fire({
            title: "Monthly Resume Limit Reached",
            text: check.error || `You have reached your monthly resume limit (${check.limit} resumes). Your access resets on ${check.resetDate}. Upgrade your plan for more access.`,
            icon: "warning",
            confirmButtonText: "Upgrade Plan",
            confirmButtonColor: "#4f46e5",
            showCancelButton: true,
            cancelButtonText: "Close"
          }).then((res) => {
            if (res.isConfirmed) {
              window.location.href = "/profile";
            }
          });
          return;
        }
      } else {
        const result = await Swal.fire({
          title: "Generate AI Resume?",
          text: `Generate a complete ${typeToUse.toUpperCase()} resume from your Schoolari profile using Claude Sonnet 4.6? This will update the current resume fields.`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Generate with AI",
          confirmButtonColor: "#4f46e5",
          cancelButtonColor: "#94a3b8"
        });
        if (!result.isConfirmed) {
          return;
        }
      }

      const generated = await generateResumeFromProfileAction(typeToUse);
      if (isNew) {
        const newId = "resume-" + Date.now();
        generated.id = newId;
        generated.is_unsaved = true;
        generated.title =
          typeToUse === "academic"
            ? "Academic Resume — College & Scholarships"
            : typeToUse === "professional"
              ? "Professional Resume — Jobs & Internships"
              : "Academic & Professional Resume";
        generated.resume_type = typeToUse;

        const newPayload: UserResumesPayload = {
          resumes: [...payload.resumes, generated],
          active_resume_id: newId
        };

        updatePayloadState(newPayload);
        setActiveId(newId);

        const params = new URLSearchParams(searchParams.toString());
        params.set("id", newId);
        router.push(`${pathname}?${params.toString()}`);
        toast.success("✨ Success! Your new resume has been prefilled from your profile.");
      } else {
        generated.id = activeResume.id;
        generated.title =
          typeToUse === "academic"
            ? "Academic Resume — College & Scholarships"
            : typeToUse === "professional"
              ? "Professional Resume — Jobs & Internships"
              : "Academic & Professional Resume";
        generated.resume_type = typeToUse;
        updateActiveResume(generated);
        toast.success("✨ Success! Your resume has been prefilled from your profile.");
      }
      setTypeModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "AI Prefill error");
    } finally {
      setIsPrefilling(false);
    }
  };

  const handleRunATSTailor = async () => {
    if (!atsJobText.trim()) return;
    setAtsLoading(true);
    try {
      const result = await tailorResumeToJobAIAction(activeResume, atsJobText);
      setAtsResult(result);
      setAtsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "ATS check error");
    } finally {
      setAtsLoading(false);
    }
  };

  const handleSaveToVault = async () => {
    const defaultTitle = formatResumeTitle(activeResume);
    const { value: customName, isConfirmed } = await Swal.fire({
      title: "Name your Resume",
      text: "Give your resume a custom display name before saving it to your Document Vault.",
      input: "text",
      inputPlaceholder: "e.g., Engineering Internship Resume July 2026",
      inputValue: activeResume.title !== "Academic & Professional Resume" ? activeResume.title : defaultTitle,
      showCancelButton: true,
      confirmButtonText: "Save to Vault",
      confirmButtonColor: "#8b5cf6", // matching violet theme
      cancelButtonColor: "#94a3b8",
      inputValidator: (value) => {
        if (!value.trim()) {
          return "Please enter a name for your resume!";
        }
      }
    });

    if (!isConfirmed) return;

    setIsSavingVault(true);

    let payloadToSave = payload;
    const currentResumeIndex = payload.resumes.findIndex(r => r.id === activeId);
    if (currentResumeIndex !== -1) {
      const updatedResumes = [...payload.resumes];
      updatedResumes[currentResumeIndex] = {
        ...updatedResumes[currentResumeIndex],
        title: customName.trim(),
        is_unsaved: false
      };
      payloadToSave = { ...payload, resumes: updatedResumes };
      updatePayloadState(payloadToSave);

      // Also update activeResume locally to reflect immediately in UI if used
      updateActiveResume(updatedResumes[currentResumeIndex]);
    }

    try {
      // Just save the resume. The Document Vault is now automatically synchronized to display all Resumes.
      await saveResumesAction(payloadToSave);

      toast.success("Available in your Document Vault!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save to Vault");
    } finally {
      setIsSavingVault(false);
    }
  };

  const openStarModal = (
    bulletText: string,
    roleTitle: string,
    onApplyCallback: (newText: string) => void
  ) => {
    setStarOriginalText(bulletText);
    setStarRoleTitle(roleTitle);
    starOnApplyRef.current = onApplyCallback;
    setStarModalOpen(true);
  };

  const sections = [
    { id: "contact", label: "Contact", icon: User },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "experience", label: "Experience", icon: Briefcase },
    { id: "extracurriculars", label: "Extracurriculars", icon: BookOpen },
    { id: "awards", label: "Honors & Awards", icon: Trophy },
    { id: "skills", label: "Skills & Certs", icon: Code }
  ] as const;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/60">
      <AILoader
        isOpen={isPrefilling || atsLoading || isImporting}
        message={
          isImporting
            ? "Importing resume and improving bullet points with AI..."
            : isPrefilling
              ? "Prefilling your resume with AI..."
              : "Tailoring resume for ATS..."
        }
      />
      {!editingResumeId ? (
        // DASHBOARD VIEW
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                Resume Builder Workspace
                <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-600">
                  <FileText className="w-4 h-4" />
                </div>
              </h1>
              <p className="text-slate-500 text-lg max-w-2xl font-medium">
                Build, organize, and perfect your ATS-friendly resumes with AI-optimized STAR bullet points.
              </p>
            </div>

            {isLimitReached ? (
              <button
                disabled
                title={`You have reached your monthly limit of ${aiUsage?.resume.limit || 1} resumes. Resets on ${aiUsage?.resetDate || 'the 1st of next month'}.`}
                className="flex items-center gap-2 bg-slate-200 text-slate-500 font-bold py-3 px-6 rounded-xl cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                New Resume
              </button>
            ) : (
              <button
                onClick={() => {
                  setStartStep("options");
                  setTypeModalOpen(true);
                }}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm shadow-violet-200"
              >
                <Plus className="w-5 h-5" />
                New Resume
              </button>
            )}
          </div>

          {isLimitReached && (aiUsage?.resume.limit || 0) < 900000 && (
            <div className="bg-violet-50 border border-violet-100 text-violet-800 px-4 py-3 rounded-xl flex items-center justify-between text-sm">
              <span>
                Monthly Resume Documents: <strong>{aiUsage?.resume.used || 0} of {aiUsage?.resume.limit || 0}</strong> created this month.{" "}
                You have reached your monthly limit. Access resets on {aiUsage?.resetDate || 'the 1st of next month'}.
              </span>
              <Link href="/profile" className="font-bold underline ml-4 hover:text-violet-950">Upgrade Plan</Link>
            </div>
          )}

          {/* Grid of Resumes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {payload.resumes.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">No resumes yet</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    Create a new resume from scratch, import from profile, or upload an existing PDF.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isLimitReached}
                  onClick={() => {
                    setStartStep("options");
                    setTypeModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" /> Create Your First Resume
                </button>
              </div>
            ) : (
              payload.resumes.map((resume) => (
                <div
                  key={resume.id}
                  onClick={() => handleEditResume(resume.id)}
                  className="group bg-white rounded-3xl border border-slate-200 hover:border-violet-300 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden h-[260px]"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 rounded-bl-full pointer-events-none" />

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${resume.resume_type === 'academic'
                            ? 'bg-violet-50 text-violet-600 border border-violet-100'
                            : resume.resume_type === 'professional'
                              ? 'bg-blue-50 text-blue-600 border border-blue-100'
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                          {resume.resume_type || 'both'}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-violet-700 transition-colors">
                      {resume.title || "Untitled Resume"}
                    </h3>

                    <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-1 font-medium">
                      {resume.header?.summary || "No summary provided."}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mt-auto pt-4 border-t border-slate-100">
                      <Clock className="w-3.5 h-3.5" />
                      Updated {resume.last_modified ? new Date(resume.last_modified).toLocaleDateString() : new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        // EDITOR VIEW
        <>
          {/* Top Action Bar (Hidden when printing) */}
          <div className="print:hidden bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-2xs relative z-20">
            {/* Main Header Row */}
            <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-100/80 relative z-30">
              {/* Row 1 on Mobile: Back Button, Selector, Create New, and Save */}
              <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto relative z-30">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-none">
                  <button
                    type="button"
                    onClick={() => router.push(pathname)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-950 text-xs font-bold transition-all border border-slate-200 shrink-0"
                    title="Back to Saved Resumes"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Back</span>
                  </button>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="relative flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 sm:flex-none">
                    {/* Custom Theme Dropdown Button */}
                    <button
                      type="button"
                      onClick={() => setResumeDropdownOpen((prev) => !prev)}
                      className="bg-slate-50/90 border border-slate-200/80 hover:border-violet-300 rounded-xl sm:rounded-2xl px-2.5 sm:px-3.5 py-1.5 transition-all inline-flex items-center justify-between gap-1.5 sm:gap-2 max-w-full shadow-2xs hover:bg-white text-left group min-w-0 flex-1 sm:flex-none"
                    >
                      <span className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[130px] sm:max-w-[280px]">
                        {activeResume?.title || "My Resume"}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-violet-600 transition-transform duration-200 shrink-0 ${resumeDropdownOpen ? "rotate-180 text-violet-600" : ""
                          }`}
                      />
                    </button>

                    {/* Fullscreen Backdrop to close dropdown when clicking outside */}
                    {resumeDropdownOpen && (
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setResumeDropdownOpen(false)}
                      />
                    )}

                    {/* Custom Popover Menu */}
                    {resumeDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-[280px] sm:w-[340px] bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-2xl z-[100] p-2 animate-in fade-in-0 zoom-in-95 duration-150">
                        <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100/80 mb-1">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                            Your Saved Resumes
                          </span>
                          <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                            {payload.resumes.length} total
                          </span>
                        </div>

                        <div className="max-h-[260px] overflow-y-auto space-y-1 pr-1">
                          {payload.resumes.map((r) => {
                            const isSelected = r.id === activeId;
                            return (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                  handleEditResume(r.id);
                                  setResumeDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-2xl transition-all flex items-center justify-between gap-2.5 group/item ${isSelected
                                  ? "bg-violet-50/80 border border-violet-200/80 text-violet-950 font-black shadow-2xs"
                                  : "hover:bg-slate-50 border border-transparent text-slate-700 hover:text-slate-900 font-semibold"
                                  }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs truncate">
                                    {r.title}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1.5">
                                    <span>
                                      {r.resume_type === "academic"
                                        ? "🎓 Academic"
                                        : r.resume_type === "professional"
                                          ? "💼 Professional"
                                          : "✨ Both"}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                    <Check className="w-3 h-3" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="h-px bg-slate-100 my-1.5" />

                        <button
                          type="button"
                          disabled={isLimitReached}
                          onClick={() => {
                            setResumeDropdownOpen(false);
                            setTypeModalOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-md shadow-violet-500/20 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" /> Create New Resume
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isLimitReached}
                      onClick={() => setTypeModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl bg-violet-50/80 hover:bg-violet-100 text-violet-700 text-[11px] sm:text-xs font-bold border border-violet-200/80 transition-all shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      title="Switch, Create or Choose Resume Type"
                    >
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">Create New</span>
                      <span className="sm:hidden">New</span>
                    </button>
                  </div>
                </div>

                {/* Save Button (Right side on mobile & desktop) */}
                <div className="sm:hidden">
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    title="Save Changes"
                    size="sm"
                    className={`h-8.5 px-3 flex shrink-0 items-center justify-center rounded-xl shadow-xs text-xs font-bold gap-1.5 transition-all ${saveSuccess
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{saveSuccess ? "Saved" : "Save"}</span>
                  </Button>
                </div>
              </div>

              {/* Row 2 on Mobile / Right side on Desktop: AI Tools & Desktop Save Button */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    onClick={() => handlePrefillFromProfile()}
                    disabled={isPrefilling || isAiBlocked}
                    size="sm"
                    title="Automatically construct a tailored resume using the data saved in your Schoolari profile."
                    className="h-8.5 sm:h-9.5 px-2.5 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm shadow-violet-500/20 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none truncate justify-center"
                  >
                    {isPrefilling ? (
                      <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin mr-1 shrink-0" />
                    ) : (
                      <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 text-yellow-300 shrink-0" />
                    )}
                    <span className="truncate">AI Prefill</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setAtsModalOpen(true)}
                    disabled={isAiBlocked}
                    variant="outline"
                    size="sm"
                    title="Analyze your resume against a specific job description to boost your ATS score."
                    className="h-8.5 sm:h-9.5 px-2.5 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold text-indigo-700 border-indigo-200/80 bg-indigo-50/80 hover:bg-indigo-100/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none truncate justify-center"
                  >
                    <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 text-indigo-600 shrink-0" />
                    <span className="truncate">ATS Match</span>
                  </Button>
                </div>

                <div className="hidden sm:block">
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    title="Save Changes"
                    className={`h-9.5 w-9.5 p-0 flex shrink-0 items-center justify-center rounded-xl shadow-sm transition-all ${saveSuccess
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {isOverBudget ? (
            <div className="bg-red-50 border-y border-red-200 text-red-800 px-4 py-3 text-sm flex items-center justify-center font-medium z-20 relative mt-4 animate-in slide-in-from-top duration-300">
              ⚠️ You have reached your monthly AI spend limit. Your access resets on {aiUsage?.resetDate || "the 1st of next month"}. Upgrade your plan for more access.
            </div>
          ) : isStrictlyOverLimit ? (
            <div className="bg-orange-50 border-y border-orange-200 text-orange-800 px-4 py-3 text-sm flex items-center justify-center font-medium z-20 relative mt-4 animate-in slide-in-from-top duration-300">
              ⚠️ You have reached your monthly limit for this feature. Your limit resets on {aiUsage?.resetDate || "the 1st of next month"}. Upgrade your plan for more access.
            </div>
          ) : null}

          {/* Mobile Switcher (Edit vs Preview) */}
          <div className="print:hidden sm:hidden flex border-b border-slate-200 bg-white z-20">
            <button
              onClick={() => setMobileTab("edit")}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 flex items-center justify-center gap-1.5 ${mobileTab === "edit"
                ? "border-violet-600 text-violet-600 bg-violet-50/40"
                : "border-transparent text-slate-500"
                }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Editor Studio
            </button>
            <button
              onClick={() => setMobileTab("preview")}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 flex items-center justify-center gap-1.5 ${mobileTab === "preview"
                ? "border-violet-600 text-violet-600 bg-violet-50/40"
                : "border-transparent text-slate-500"
                }`}
            >
              <Eye className="w-3.5 h-3.5" /> ATS Live Preview
            </button>
          </div>

          {/* Main Responsive 2-Column Layout */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full relative z-20">
            {/* LEFT COLUMN: Section Nav & Editors (Colspan 6) */}
            <div
              className={`print:hidden lg:col-span-6 flex flex-col gap-4 sm:gap-5 ${mobileTab === "preview" ? "hidden sm:flex" : "flex"
                }`}
            >
              {/* Section Navigation Tabs */}
              <div
                ref={tabsContainerRef}
                className="flex overflow-x-auto p-1.5 gap-1.5 rounded-2xl bg-slate-200/60 border border-slate-300/40 no-scrollbar"
              >
                {sections.map((sec) => {
                  const Icon = sec.icon;
                  const isSelected = selectedSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedSection(sec.id)}
                      className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${isSelected
                        ? "bg-white text-violet-700 font-extrabold shadow-sm border border-slate-200/60"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? "text-violet-600" : "text-slate-400"}`} />
                      {sec.label}
                    </button>
                  );
                })}
              </div>

              {/* Section Editor Box */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3.5 sm:p-6 shadow-sm flex-1">
                {selectedSection === "contact" && (
                  <ContactEditor
                    resume={activeResume}
                    onChange={updateActiveResume}
                    onOpenStarModal={openStarModal}
                    isLimitReached={isAiBlocked}
                  />
                )}
                {selectedSection === "education" && (
                  <EducationEditor
                    resume={activeResume}
                    onChange={updateActiveResume}
                    onOpenStarModal={openStarModal}
                    isLimitReached={isAiBlocked}
                  />
                )}
                {selectedSection === "experience" && (
                  <ExperienceEditor
                    resume={activeResume}
                    onChange={updateActiveResume}
                    onOpenStarModal={openStarModal}
                    isLimitReached={isAiBlocked}
                  />
                )}
                {selectedSection === "extracurriculars" && (
                  <ExtracurricularsEditor
                    resume={activeResume}
                    onChange={updateActiveResume}
                    onOpenStarModal={openStarModal}
                    isLimitReached={isAiBlocked}
                  />
                )}
                {selectedSection === "awards" && (
                  <AwardsEditor
                    resume={activeResume}
                    onChange={updateActiveResume}
                    onOpenStarModal={openStarModal}
                    isLimitReached={isAiBlocked}
                  />
                )}
                {selectedSection === "skills" && (
                  <SkillsEditor
                    resume={activeResume}
                    onChange={updateActiveResume}
                    onOpenStarModal={openStarModal}
                    isLimitReached={isAiBlocked}
                  />
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Live 1-Page ATS Preview (Colspan 6) */}
            <div
              className={`lg:col-span-6 flex flex-col ${mobileTab === "edit" ? "hidden sm:flex" : "flex"
                }`}
            >
              <div className="sticky top-20">
                <ResumePreview
                  resume={activeResume}
                  theme={activeResume.template_theme || "classic"}
                  onThemeChange={(theme: ResumeTemplateTheme) =>
                    updateActiveResume({ ...activeResume, template_theme: theme })
                  }
                  atsResult={atsResult}
                  onSaveToVault={handleSaveToVault}
                  isSavingVault={isSavingVault}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* AI STAR Bullet Modal */}
      <StarBulletModal
        isOpen={starModalOpen}
        onClose={() => setStarModalOpen(false)}
        originalBullet={starOriginalText}
        roleTitle={starRoleTitle}
        onApply={(newText) => starOnApplyRef.current(newText)}
      />

      {/* ATS Job Tailoring Dialog */}
      <Dialog open={atsModalOpen} onOpenChange={setAtsModalOpen}>
        <DialogContent className="sm:max-w-xl max-w-[95vw] w-full rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl overflow-hidden">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900">
                  ATS Match & Tailor
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Paste a target internship, scholarship, or job description to analyze your ATS score.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <h4 className="text-xs font-black text-slate-900 mb-1 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-indigo-600" /> ATS Check</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Makes sure your resume can be read by company software that filters applicants before a human sees it</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <h4 className="text-xs font-black text-slate-900 mb-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Match</h4>
              <p className="text-[10px] text-slate-500 leading-tight">See how well your resume matches a specific job or internship you want to apply for</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <h4 className="text-xs font-black text-slate-900 mb-1 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-violet-600" /> Tailor</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Let AI rewrite parts of your resume to better fit a specific job posting</p>
            </div>
          </div>

          <div className="mb-4 space-y-3">
            <label className="text-xs font-extrabold text-slate-700 block">
              Job / Internship / Scholarship Description
            </label>
            <textarea
              value={atsJobText}
              onChange={(e) => setAtsJobText(e.target.value)}
              placeholder="Paste the full position overview, required skills, and qualifications here..."
              rows={6}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-700"
            />
          </div>

          <DialogFooter className="flex items-center justify-between border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAtsModalOpen(false)}
              className="rounded-xl text-xs font-bold text-slate-500"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRunATSTailor}
              disabled={atsLoading || !atsJobText.trim()}
              title="Analyze your resume against the provided job description and generate tailored ATS improvements."
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              {atsLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Analyzing ATS...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Run All Analysis
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 1: Choose Resume Type Modal */}
      <Dialog open={typeModalOpen} onOpenChange={(open) => {
        setTypeModalOpen(open);
        if (!open) setTimeout(() => setStartStep("options"), 200);
      }}>
        <DialogContent className="sm:max-w-xl max-w-[95vw] w-full rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl overflow-hidden">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-violet-100/80 flex items-center justify-center text-violet-600 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900">
                  {startStep === "options" ? "Get Started" : "Choose Resume Type"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {startStep === "options"
                    ? "Choose how you want to build your Student Resume."
                    : "Select how you want Claude AI to tailor your Student Resume."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {startStep === "options" ? (
            <div className="my-4 space-y-4">
              <div
                onClick={() => setStartStep("type")}
                className="p-5 rounded-2xl border border-slate-200 hover:border-violet-600 hover:bg-violet-50/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Build a new resume with AI</h3>
                    <p className="text-sm text-slate-500 mt-1">Generate a structured resume from your Schoolari profile using AI.</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => { if (!isImporting) fileInputRef.current?.click() }}
                className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all cursor-pointer group relative overflow-hidden"
              >
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={isImporting}
                />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Upload my existing resume and improve it with AI</h3>
                    <p className="text-sm text-slate-500 mt-1">AI will analyze, rewrite weak sections, and import it into the builder.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="my-4 space-y-3">
                <div
                  onClick={() => setSelectedNewType("academic")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${selectedNewType === "academic"
                    ? "border-violet-600 bg-violet-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎓</span>
                      <span className="text-sm font-black text-slate-900">
                        Academic Resume
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      College & Scholarships
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Optimized for college admissions and scholarship applications. Focuses on honors, GPA, research projects, and academic goals.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedNewType("professional")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${selectedNewType === "professional"
                    ? "border-violet-600 bg-violet-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💼</span>
                      <span className="text-sm font-black text-slate-900">
                        Professional Resume
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      Jobs & Internships
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Optimized for job and internship applications. Highlights quantifiable impact STAR bullets, leadership roles, and technical skills.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedNewType("both")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${selectedNewType === "both"
                    ? "border-violet-600 bg-violet-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">✨</span>
                      <span className="text-sm font-black text-slate-900">
                        Both (Combined Resume)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      All-In-One
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Build both using the same information. A comprehensive 1-page resume synthesizing academic honors and professional leadership.
                  </p>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStartStep("options")}
                  className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold text-slate-700"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving || isPrefilling || isLimitReached}
                  onClick={() => handleCreateNewResume(selectedNewType)}
                  className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Creating...
                    </>
                  ) : (
                    "Start Blank Resume"
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => handlePrefillFromProfile(selectedNewType, true)}
                  disabled={isSaving || isPrefilling || isLimitReached}
                  title="Automatically construct a tailored resume using the data saved in your Schoolari profile."
                  className="w-full sm:w-auto h-10 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPrefilling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> AI
                      Prefilling...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-yellow-300" /> AI
                      Pre-Fill from Profile (Recommended)
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
