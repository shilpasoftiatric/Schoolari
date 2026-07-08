"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveOnboardingStep, getProfile } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, CheckCircle2, Check, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
  "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
  "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
  "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const GRADE_LEVEL_OPTIONS = ["9th", "10th", "11th", "12th", "College Freshman", "College Sophomore", "College Junior", "College Senior", "Other"];
const GPA_RANGE_OPTIONS = ["Under 2.0", "2.0–2.5", "2.5–3.0", "3.0–3.5", "3.5–4.0"];
const SCHOOL_TYPE_OPTIONS = ["4-year university", "Community college", "Trade school", "Not sure"];
const CAREER_OPTIONS = [
  "Business & Management", "Computer Science & IT", "Engineering", "Healthcare & Nursing", 
  "Pre-Med & Medicine", "Biology & Life Sciences", "Psychology & Counseling", "Education & Teaching", 
  "Law & Criminal Justice", "Arts & Design", "Communications & Journalism", "Finance & Accounting", 
  "Marketing & Advertising", "Data Science & Analytics", "Political Science & Government", 
  "Architecture & Construction", "Environmental Science", "Trades & Vocational", 
  "Culinary & Hospitality", "Social Work & Human Services", "Not sure yet"
];
const ETHNICITY_OPTIONS = ["Hispanic/Latino", "African American", "Asian American", "Native American", "White", "Other", "Prefer not to say"];
const FINANCIAL_NEED_OPTIONS = ["Yes", "No", "Not sure"];
const INVOLVEMENT_OPTIONS = ["Sports", "Arts", "Community service", "Student government", "STEM clubs", "Religious organizations", "None"];
const PRIORITIES_OPTIONS = [
  "Finding scholarships",
  "Writing essays",
  "Choosing colleges",
  "Building a resume",
  "Finding internships or jobs",
  "Earning money now"
];

const STEPS = [
  { id: 1, name: "Who are you?" },
  { id: 2, name: "Academic profile" },
  { id: 3, name: "Background" },
  { id: 4, name: "Priorities" },
  { id: 5, name: "Documents" },
];

const STEP_HEADING: Record<number, string> = {
  1: "Who are you?",
  2: "Academic profile",
  3: "Background",
  4: "What do you need most help with?",
  5: "Document quick-start",
};

const toggleArrayValue = (arr: string[], value: string) =>
  arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Storage upload states
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get("payment_success") === "true") {
      Swal.fire({
        title: "Payment Successful!",
        text: "Welcome to Schoolari! Let's get your profile set up.",
        icon: "success",
        confirmButtonColor: "#8b5cf6",
        timer: 3000,
        timerProgressBar: true,
      });
      window.history.replaceState(null, "", "/onboarding");
    }
  }, [searchParams]);

  const [form, setForm] = useState({
    account_type: "",
    first_name: "",
    grade_level: "",
    state: "",
    gpa_range: "",
    career_interests: "",
    school_type: "",
    ethnicity_tags: [] as string[],
    financial_need: "",
    involvement_tags: [] as string[],
    dashboard_priorities: [] as string[],
  });

  useEffect(() => {
    async function fetchProfile() {
      const profile = await getProfile();
      if (profile) {
        if (profile.onboarding_complete) {
          router.replace("/dashboard");
          return;
        }
        setStep(profile.onboarding_step || 1);
        setForm({
          account_type: profile.account_type || "",
          first_name: profile.first_name || "",
          grade_level: profile.grade_level || "",
          state: profile.state || "",
          gpa_range: profile.gpa_range || "",
          career_interests: profile.career_interests?.[0] || "",
          school_type: profile.school_type || "",
          ethnicity_tags: profile.ethnicity_tags || [],
          financial_need: profile.financial_need || "",
          involvement_tags: profile.involvement_tags || [],
          dashboard_priorities: profile.dashboard_priorities || [],
        });
      }
      setLoadingInitial(false);
    }
    fetchProfile();
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createClient();
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not logged in");

      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `vault/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Insert into documents table
      await supabase.from('documents').insert({
        user_id: userData.user.id,
        name: file.name,
        type: 'other',
        file_url: publicUrlData.publicUrl,
        size_bytes: file.size
      });

      setUploadedDocs([...uploadedDocs, { name: file.name }]);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Document uploaded!',
        showConfirmButton: false,
        timer: 3000
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire('Upload Error', err.message, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleNext = async (currentStep: number) => {
    setError("");

    if (currentStep === 1 && (!form.account_type || !form.first_name.trim() || !form.grade_level || !form.state)) {
      setError("Please fill out all fields."); return;
    }
    if (currentStep === 2 && (!form.gpa_range || !form.career_interests || !form.school_type)) {
      setError("Please fill out all fields."); return;
    }
    if (currentStep === 4 && form.dashboard_priorities.length === 0) {
      setError("Please select at least one area you need help with."); return;
    }

    startTransition(async () => {
      const payload: any = {};
      if (currentStep === 1) {
        payload.account_type = form.account_type;
        payload.first_name = form.first_name;
        payload.grade_level = form.grade_level;
        payload.state = form.state;
      } else if (currentStep === 2) {
        payload.gpa_range = form.gpa_range;
        payload.career_interests = [form.career_interests];
        payload.school_type = form.school_type;
      } else if (currentStep === 3) {
        payload.ethnicity_tags = form.ethnicity_tags;
        payload.financial_need = form.financial_need;
        payload.involvement_tags = form.involvement_tags;
      } else if (currentStep === 4) {
        payload.dashboard_priorities = form.dashboard_priorities;
      } else if (currentStep === 5) {
        payload.onboarding_complete = true;
      }

      const nextStep = currentStep === 5 ? 5 : currentStep + 1;
      const result = await saveOnboardingStep(nextStep, payload);

      if (result.error) {
        setError(result.error);
      } else {
        if (currentStep === 5) {
          setDone(true);
        } else {
          setStep(nextStep);
        }
      }
    });
  };

  const handleSkip = () => {
    handleNext(step); // Just proceed to next step saving empty/current state
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 max-w-lg w-full text-center border border-slate-100">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Your dashboard is ready!</h2>
          <p className="text-slate-500 mb-6">
            Nice work, {form.first_name || "there"}. We've customized your widgets and goals based on your profile.
          </p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shadow-lg shadow-purple-200"
          >
            Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-32 pb-12 px-4 sm:px-6 lg:px-8">

      {/* Fixed Custom Stepper */}
      <div className="fixed top-0 left-0 w-full bg-slate-50/95 backdrop-blur-sm z-50 py-6 sm:py-8">
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between w-full">
            {STEPS.map((s, index) => {
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="relative flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 bg-white",
                      isCompleted ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" :
                        isCurrent ? "border-emerald-500 text-emerald-600 ring-4 ring-emerald-500/10" :
                          "border-slate-200 text-slate-400"
                    )}>
                      {isCompleted ? <Check className="w-5 h-5" /> : <span className="font-semibold text-sm">{s.id}</span>}
                    </div>

                    <div className="absolute top-12 left-1/2 -translate-x-1/2 w-28 text-center hidden sm:block">
                      <span className={cn(
                        "text-xs font-medium transition-colors duration-300",
                        isCompleted ? "text-slate-800" :
                          isCurrent ? "text-emerald-700 font-bold" :
                            "text-slate-400"
                      )}>
                        {s.name}
                      </span>
                    </div>
                  </div>

                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "flex-auto h-[2px] mx-2 transition-all duration-300",
                      step > s.id ? "bg-emerald-500" : "bg-slate-200"
                    )} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-2xl w-full mx-auto">
        <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900">{STEP_HEADING[step]}</h2>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="space-y-8">
            {step === 1 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Are you a student or a parent setting up this account?</Label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setForm({ ...form, account_type: 'student' })}
                      className={cn("flex-1 h-12 rounded-xl border transition-colors font-medium", form.account_type === 'student' ? "border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-600" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
                    >Student</button>
                    <button
                      onClick={() => setForm({ ...form, account_type: 'parent' })}
                      className={cn("flex-1 h-12 rounded-xl border transition-colors font-medium", form.account_type === 'parent' ? "border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-600" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
                    >Parent</button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Student's first name</Label>
                  <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="h-12 rounded-xl border-slate-200" placeholder="e.g. John" />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Grade level</Label>
                  <select value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-600">
                    <option value="" disabled>Select grade...</option>
                    {GRADE_LEVEL_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">State</Label>
                  <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-600">
                    <option value="" disabled>Select state...</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Current GPA</Label>
                  <select value={form.gpa_range} onChange={(e) => setForm({ ...form, gpa_range: e.target.value })} className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-600">
                    <option value="" disabled>Select range...</option>
                    {GPA_RANGE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Intended major or career interest</Label>
                  <select value={form.career_interests} onChange={(e) => setForm({ ...form, career_interests: e.target.value })} className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-600">
                    <option value="" disabled>Select major...</option>
                    {CAREER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Type of school interested in</Label>
                  <select value={form.school_type} onChange={(e) => setForm({ ...form, school_type: e.target.value })} className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-600">
                    <option value="" disabled>Select school type...</option>
                    {SCHOOL_TYPE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Ethnicity (Optional, multi-select)</Label>
                  <div className="flex flex-wrap gap-2">
                    {ETHNICITY_OPTIONS.map((option) => {
                      const isActive = form.ethnicity_tags.includes(option);
                      return (
                        <button key={option} onClick={() => setForm({ ...form, ethnicity_tags: toggleArrayValue(form.ethnicity_tags, option) })}
                          className={cn("px-4 py-2 text-sm font-medium rounded-full border transition-all", isActive ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
                        >{option}</button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Do you qualify for financial need?</Label>
                  <div className="flex flex-wrap gap-2">
                    {FINANCIAL_NEED_OPTIONS.map((option) => (
                      <button key={option} onClick={() => setForm({ ...form, financial_need: option })}
                        className={cn("px-4 py-2 text-sm font-medium rounded-full border transition-all", form.financial_need === option ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
                      >{option}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Extracurricular activities (Optional, multi-select)</Label>
                  <div className="flex flex-wrap gap-2">
                    {INVOLVEMENT_OPTIONS.map((option) => {
                      const isActive = form.involvement_tags.includes(option);
                      return (
                        <button key={option} onClick={() => setForm({ ...form, involvement_tags: toggleArrayValue(form.involvement_tags, option) })}
                          className={cn("px-4 py-2 text-sm font-medium rounded-full border transition-all", isActive ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
                        >{option}</button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <Label className="text-sm font-bold text-slate-700 mb-4 block">Select what you need the most help with (multi-select)</Label>
                <div className="flex flex-col gap-3">
                  {PRIORITIES_OPTIONS.map((option) => {
                    const isActive = form.dashboard_priorities.includes(option);
                    return (
                      <button key={option} onClick={() => setForm({ ...form, dashboard_priorities: toggleArrayValue(form.dashboard_priorities, option) })}
                        className={cn("flex items-center px-5 py-4 text-left text-sm font-medium rounded-xl border transition-all", isActive ? "border-violet-600 bg-violet-50 text-violet-900 ring-1 ring-violet-600" : "border-slate-200 text-slate-700 hover:bg-slate-50")}
                      >
                        <div className={cn("w-5 h-5 rounded border mr-4 flex items-center justify-center", isActive ? "bg-violet-600 border-violet-600 text-white" : "border-slate-300")}>
                          {isActive && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <p className="text-slate-600">If you have a transcript, resume, or recommendation letter ready, upload it now so it's safely stored in your Vault.</p>

                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50">
                  <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                    <UploadCloud className="w-8 h-8 text-violet-500" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">Upload a document</h3>
                  <p className="text-sm text-slate-500 mb-6">PDF, DOCX, or Images up to 10MB</p>

                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />

                  <Button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="rounded-xl px-8 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm">
                    {uploading ? "Uploading..." : "Select File"}
                  </Button>
                </div>

                {uploadedDocs.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-700">Uploaded Documents</h4>
                    {uploadedDocs.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-medium">
                        <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2" />{doc.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setStep(step - 1)} className={cn("text-slate-500 hover:text-slate-900 rounded-xl", step === 1 && "invisible")}>
                Back
              </Button>

              <div className="flex items-center gap-4">
                {(step === 3 || step === 5) && (
                  <button onClick={handleSkip} className="text-sm font-semibold text-slate-400 hover:text-slate-600">
                    Skip for now
                  </button>
                )}
                <Button disabled={isPending || uploading} onClick={() => handleNext(step)} className="h-11 rounded-xl px-6 font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md">
                  {isPending ? "Saving..." : step === 5 ? "Finish" : "Continue"}
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
