"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveOnboardingStep, getProfile } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, PhoneInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Check, ArrowRight, X, ChevronDown } from "lucide-react";
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

const GRADE_LEVEL_OPTIONS = ["9th Grade", "10th Grade", "11th Grade", "12th Grade", "College Freshman", "College Sophomore", "College Junior", "College Senior", "Graduate Student"];
const UNWEIGHTED_GPA_OPTIONS = ["Under 2.0", "2.0–2.5", "2.5–3.0", "3.0–3.5", "3.5–4.0", "4.1 and higher", "Not sure"];
const WEIGHTED_GPA_OPTIONS = ["Under 2.0", "2.0–2.5", "2.5–3.0", "3.0–3.5", "3.5–4.0", "4.1 and higher", "Not applicable", "Not sure"];
const EXPECTED_GRAD_YEARS = ["2026", "2027", "2028", "2029", "2030"];
const APPLIED_OPTIONS = ["Yes", "No", "Currently applying"];
const ENROLLED_OPTIONS = ["Yes", "No"];

const INTENDED_MAJORS = ["Business Administration", "Computer Science", "Nursing", "Psychology", "Biology", "Criminal Justice", "Education", "Engineering", "Communications", "Accounting", "Marketing", "Finance", "Political Science", "Graphic Design", "Information Technology", "Health Sciences", "Social Work", "English", "Architecture", "Other", "Undecided"];
const PREFERRED_COLLEGE_TYPES = ["Public", "Private", "HBCU", "Community College", "Trade School", "Military", "No Preference"];
const EXTRACURRICULAR_OPTIONS = ["Athletics & Sports", "Academics & STEM", "Arts & Creative Expression", "Leadership", "Community Service", "School Organizations", "Career & Workforce Development", "Entrepreneurship", "Civic & Government Engagement", "Faith & Cultural Organizations", "Employment & Family Responsibilities", "Personal Projects & Special Interests"];
const CAREER_INTERESTS_OPTIONS = ["Business & Entrepreneurship", "Computer Science & Technology", "Engineering", "Healthcare", "Education", "Law", "Government & Public Service", "Arts, Media & Design", "Finance & Accounting", "Science & Research", "Skilled Trades & Construction", "Agriculture & Environmental Science", "Hospitality & Tourism", "Marketing & Communications", "Sports & Recreation", "Military & Public Safety", "Transportation & Logistics", "Architecture & Urban Planning", "Social & Human Services", "Aviation & Aerospace", "Other", "Undecided"];
const ETHNICITY_OPTIONS = ["Hispanic/Latino", "African American", "Asian American", "Native American", "White", "Other", "Prefer not to say"];
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const PRIORITIES_OPTIONS = [
  "Finding scholarships",
  "Writing essays",
  "Choosing colleges",
  "Building a resume",
  "Finding internships or jobs",
  "Earning money now"
];

const STEPS = [
  { id: 1, name: "Let's Get to Know You" },
  { id: 2, name: "Your Academic Journey" },
  { id: 3, name: "Your Story" },
  { id: 4, name: "Your Goals" },
  { id: 5, name: "Success Vault" },
];

const toggleArrayValue = (arr: string[], value: string) =>
  arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value];

function MultiSelectDropdown({ options, selected, onChange, placeholder }: { options: string[], selected: string[], onChange: (val: string[]) => void, placeholder: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-600 text-left text-slate-600"
      >
        <span className="truncate pr-2">
          {selected.length > 0 ? selected.join(", ") : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 opacity-50 shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg p-2">
          {options.map(option => (
            <label key={option} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selected, option]);
                  } else {
                    onChange(selected.filter(i => i !== option));
                  }
                }}
                className="rounded border-slate-300 text-violet-600 focus:ring-violet-600 w-4 h-4"
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isParentAccount, setIsParentAccount] = useState(false);

  // Storage upload states
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; type: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<"transcript" | "report_card" | "recommendation_letter" | "essay" | "resume" | "certificate" | "award" | "other">("other");

  useEffect(() => {
    if (searchParams.get("payment_success") === "true") {
      window.history.replaceState(null, "", "/onboarding");
    }
  }, [searchParams]);

  const [form, setForm] = useState({
    account_type: "",
    student_first_name: "",
    student_last_name: "",
    student_email: "",
    student_phone: "",
    parent_first_name: "",
    parent_last_name: "",
    parent_email: "",
    parent_phone: "",
    high_school_name: "",
    state: "",
    grade_level: "",

    unweighted_gpa: "",
    weighted_gpa: "",
    expected_graduation_year: "",
    applied_to_college: "",
    enrolled_in_college: "",
    intended_major: [] as string[],
    preferred_college_type: [] as string[],
    top_3_schools: ["", "", ""],

    extracurricular_activities: [] as string[],
    career_interest: [] as string[],
    ethnicity: [] as string[],
    gender: "",

    schoolari_goals: [] as string[],
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
        setIsParentAccount(profile.account_type === "parent");
        setForm((prev) => ({
          ...prev,
          account_type: profile.account_type || "",
          student_first_name: profile.student_first_name || "",
          student_last_name: profile.student_last_name || "",
          student_email: profile.student_email || "",
          student_phone: profile.student_phone || "",
          parent_first_name: profile.parent_first_name || "",
          parent_last_name: profile.parent_last_name || "",
          parent_email: profile.parent_email || "",
          parent_phone: profile.parent_phone || "",
          high_school_name: profile.high_school_name || "",
          state: profile.state || "",
          grade_level: profile.grade_level || "",

          unweighted_gpa: profile.unweighted_gpa || "",
          weighted_gpa: profile.weighted_gpa || "",
          expected_graduation_year: profile.expected_graduation_year || "",
          applied_to_college: profile.applied_to_college || "",
          enrolled_in_college: profile.enrolled_in_college || "",
          intended_major: profile.intended_major || [],
          preferred_college_type: profile.preferred_college_type || [],
          top_3_schools: profile.top_3_schools?.length ? profile.top_3_schools : ["", "", ""],

          extracurricular_activities: profile.extracurricular_activities || [],
          career_interest: profile.career_interest || [],
          ethnicity: profile.ethnicity || [],
          gender: profile.gender || "",

          schoolari_goals: profile.schoolari_goals || [],
        }));
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

      await supabase.from('documents').insert({
        user_id: userData.user.id,
        name: file.name,
        type: uploadType,
        file_url: publicUrlData.publicUrl,
        size_bytes: file.size
      });

      setUploadedDocs([...uploadedDocs, { name: file.name, type: uploadType }]);
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

    if (currentStep === 1) {
      if (!form.student_first_name || !form.student_last_name || !form.student_email || !form.student_phone) {
        setError("Please fill out all student fields."); return;
      }
      if (!form.parent_first_name || !form.parent_last_name || !form.parent_email || !form.parent_phone) {
        setError("Please fill out all parent fields."); return;
      }
      if (!form.grade_level || !form.state || !form.high_school_name) {
        setError("Please fill out the school and state fields."); return;
      }
    }

    if (currentStep === 4 && form.schoolari_goals.length === 0) {
      setError("Please select at least one goal."); return;
    }

    startTransition(async () => {
      const payload: any = { ...form };
      if (currentStep === 5) {
        payload.onboarding_complete = true;
      }

      // Filter out empty top_3_schools
      payload.top_3_schools = form.top_3_schools.filter(Boolean);

      const nextStep = currentStep === 5 ? 5 : currentStep + 1;
      const result = await saveOnboardingStep(nextStep, payload);

      if (result.error) {
        setError(result.error);
      } else {
        if (currentStep === 5) {
          setDone(true);
        } else {
          setStep(nextStep);
          window.scrollTo(0, 0);
        }
      }
    });
  };

  const handleSkip = () => {
    startTransition(async () => {
      const nextStep = step === 5 ? 5 : step + 1;

      if (step === 5) {
        const result = await saveOnboardingStep(5, { parent_skipped_to_end: true });
        if (result.error) {
          setError(result.error);
        } else {
          setDone(true);
        }
      } else {
        // Do not validate, do not call saveOnboardingStep, just increment the UI state locally
        setStep(nextStep);
        window.scrollTo(0, 0);
      }
    });
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
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Welcome to Schoolari!</h2>
          <p className="text-slate-500 mb-6">
            {form.student_first_name || "Student"}, your account is ready. We've personalized your experience based on your profile so you can access the tools, resources, and guidance that matter most to your goals.
          </p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shadow-lg shadow-purple-200"
          >
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="fixed top-0 left-0 w-full bg-slate-50/95 backdrop-blur-sm z-50 pt-6 pb-6 sm:pt-8 sm:pb-14">
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
            <h2 className="text-3xl font-extrabold text-slate-900">{STEPS.find(s => s.id === step)?.name}</h2>
            {isParentAccount && step === 2 && (
              <div className="mt-4 p-4 bg-violet-50 border border-violet-100 rounded-xl text-violet-700 text-sm font-medium">
                Parents: The rest of this onboarding is optional. You may skip to the dashboard or fill this out on behalf of your student.
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="space-y-8">
            {step === 1 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Student's First Name</Label>
                    <Input value={form.student_first_name} onChange={(e) => setForm({ ...form, student_first_name: e.target.value })} className="h-12 rounded-xl" placeholder="John" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Student's Last Name</Label>
                    <Input value={form.student_last_name} onChange={(e) => setForm({ ...form, student_last_name: e.target.value })} className="h-12 rounded-xl" placeholder="Doe" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Student's Email Address</Label>
                    <Input value={form.student_email} onChange={(e) => setForm({ ...form, student_email: e.target.value })} disabled={form.account_type === 'student'} className={form.account_type === 'student' ? "h-12 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed" : "h-12 rounded-xl"} placeholder="john@example.com" type="email" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Student's Cell Phone</Label>
                    <PhoneInput value={form.student_phone} onChange={(val) => setForm({ ...form, student_phone: val })} disabled={form.account_type === 'student'} className={form.account_type === 'student' ? "bg-slate-100 cursor-not-allowed" : ""} />
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Parent's First Name</Label>
                    <Input value={form.parent_first_name} onChange={(e) => setForm({ ...form, parent_first_name: e.target.value })} className="h-12 rounded-xl" placeholder="Jane" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Parent's Last Name</Label>
                    <Input value={form.parent_last_name} onChange={(e) => setForm({ ...form, parent_last_name: e.target.value })} className="h-12 rounded-xl" placeholder="Doe" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Parent's Email Address</Label>
                    <Input value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} disabled={form.account_type === 'parent'} className={form.account_type === 'parent' ? "h-12 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed" : "h-12 rounded-xl"} placeholder="jane@example.com" type="email" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Parent's Cell Phone</Label>
                    <PhoneInput value={form.parent_phone} onChange={(val) => setForm({ ...form, parent_phone: val })} disabled={form.account_type === 'parent'} className={form.account_type === 'parent' ? "bg-slate-100 cursor-not-allowed" : ""} />
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Student Grade Level</Label>
                  <select value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-600">
                    <option value="" disabled>Select grade...</option>
                    {GRADE_LEVEL_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">High School Name</Label>
                  <Input value={form.high_school_name} onChange={(e) => setForm({ ...form, high_school_name: e.target.value })} className="h-12 rounded-xl" placeholder="Lincoln High School" />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Current Unweighted GPA</Label>
                    <select value={form.unweighted_gpa} onChange={(e) => setForm({ ...form, unweighted_gpa: e.target.value })} className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-600">
                      <option value="" disabled>Select range...</option>
                      {UNWEIGHTED_GPA_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Current Weighted GPA</Label>
                    <select value={form.weighted_gpa} onChange={(e) => setForm({ ...form, weighted_gpa: e.target.value })} className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-600">
                      <option value="" disabled>Select range...</option>
                      {WEIGHTED_GPA_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Expected Graduation Year</Label>
                  <select value={form.expected_graduation_year} onChange={(e) => setForm({ ...form, expected_graduation_year: e.target.value })} className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-600">
                    <option value="" disabled>Select year...</option>
                    {EXPECTED_GRAD_YEARS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Applied to college yet?</Label>
                    <select value={form.applied_to_college} onChange={(e) => setForm({ ...form, applied_to_college: e.target.value })} className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-600">
                      <option value="" disabled>Select...</option>
                      {APPLIED_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Enrolled in college?</Label>
                    <select value={form.enrolled_in_college} onChange={(e) => setForm({ ...form, enrolled_in_college: e.target.value })} className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-600">
                      <option value="" disabled>Select...</option>
                      {ENROLLED_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Intended Major (multi-select)</Label>
                  <MultiSelectDropdown
                    options={INTENDED_MAJORS}
                    selected={form.intended_major}
                    onChange={(val) => setForm({ ...form, intended_major: val })}
                    placeholder="Select majors..."
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Preferred College Type (multi-select)</Label>
                  <div className="flex flex-wrap gap-2">
                    {PREFERRED_COLLEGE_TYPES.map((option) => {
                      const isActive = form.preferred_college_type.includes(option);
                      return (
                        <button key={option} onClick={() => setForm({ ...form, preferred_college_type: toggleArrayValue(form.preferred_college_type, option) })}
                          className={cn("px-4 py-2 text-sm font-medium rounded-full border transition-all", isActive ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
                        >{option}</button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Top 3 schools you are interested in applying to (optional)</Label>
                  {[0, 1, 2].map(i => (
                    <Input key={i} value={form.top_3_schools[i]} onChange={(e) => {
                      const newSchools = [...form.top_3_schools];
                      newSchools[i] = e.target.value;
                      setForm({ ...form, top_3_schools: newSchools });
                    }} className="h-12 rounded-xl mb-2" placeholder={`School ${i + 1}`} />
                  ))}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Extracurricular activities (multi-select)</Label>
                  <MultiSelectDropdown
                    options={EXTRACURRICULAR_OPTIONS}
                    selected={form.extracurricular_activities}
                    onChange={(val) => setForm({ ...form, extracurricular_activities: val })}
                    placeholder="Select activities..."
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Career interest (multi-select)</Label>
                  <MultiSelectDropdown
                    options={CAREER_INTERESTS_OPTIONS}
                    selected={form.career_interest}
                    onChange={(val) => setForm({ ...form, career_interest: val })}
                    placeholder="Select interests..."
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Ethnicity (Optional, multi-select)</Label>
                  <div className="flex flex-wrap gap-2">
                    {ETHNICITY_OPTIONS.map((option) => {
                      const isActive = form.ethnicity.includes(option);
                      return (
                        <button key={option} onClick={() => setForm({ ...form, ethnicity: toggleArrayValue(form.ethnicity, option) })}
                          className={cn("px-4 py-2 text-sm font-medium rounded-full border transition-all", isActive ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
                        >{option}</button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Gender (Optional, multi-select)</Label>
                  <div className="flex flex-wrap gap-2">
                    {GENDER_OPTIONS.map((option) => {
                      const isActive = form.gender === option;
                      return (
                        <button key={option} onClick={() => setForm({ ...form, gender: option })}
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
                <Label className="text-sm font-bold text-slate-700 mb-4 block">Select your goals (multi-select)</Label>
                <div className="flex flex-col gap-3">
                  {PRIORITIES_OPTIONS.map((option) => {
                    const isActive = form.schoolari_goals.includes(option);
                    return (
                      <button key={option} onClick={() => setForm({ ...form, schoolari_goals: toggleArrayValue(form.schoolari_goals, option) })}
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
                <div className="text-center mb-6">
                  <p className="text-slate-600 font-medium">If you have a transcript, resume, or recommendation letter ready, upload it now so it's safely stored in your Schoolari Vault.</p>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Document Type</Label>
                  <select value={uploadType} onChange={(e) => setUploadType(e.target.value as "transcript" | "report_card" | "recommendation_letter" | "essay" | "resume" | "certificate" | "award" | "other")} className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-600">
                    <option value="transcript">Transcript</option>
                    <option value="resume">Resume</option>
                    <option value="recommendation_letter">Recommendation Letters</option>
                    <option value="essay">Essays</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="mx-auto rounded-xl h-11 border-slate-300 font-semibold text-slate-700"
                  >
                    {uploading ? (
                      <><span className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin mr-2" /> Uploading...</>
                    ) : (
                      <>Upload Document</>
                    )}
                  </Button>
                  <p className="mt-3 text-xs text-slate-500">PDF, DOC, or images up to 10MB</p>
                </div>

                {uploadedDocs.length > 0 && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Uploaded to Vault</h4>
                    <ul className="space-y-2">
                      {uploadedDocs.map((doc, idx) => (
                        <li key={idx} className="flex items-center text-sm font-medium text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                          <span className="truncate flex-1">{doc.name}</span>
                          <span className="text-xs text-slate-400 uppercase">{doc.type.replace('_', ' ')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 flex items-center justify-between gap-4">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep(step - 1); window.scrollTo(0, 0); }}
                  className="h-12 rounded-xl border-slate-200 font-semibold text-slate-700 px-6 hidden sm:flex"
                  disabled={isPending}
                >
                  Back
                </Button>
              )}
              <div className="flex gap-3 flex-1 sm:justify-end">
                {(step === 5 || (step > 1 && isParentAccount)) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSkip}
                    className="h-12 rounded-xl font-semibold text-slate-500 px-6"
                    disabled={isPending}
                  >
                    Skip
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => handleNext(step)}
                  disabled={isPending}
                  className="h-12 rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white flex-1 sm:flex-none px-8 shadow-md shadow-violet-200 transition-all"
                >
                  {isPending ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : step === 5 ? "Finish Setup" : "Continue"}
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
