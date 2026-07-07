"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOnboardingStep, getProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
  "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
  "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
  "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const GRADE_LEVEL_OPTIONS = [
  "High School Freshman", "High School Sophomore", "High School Junior", "High School Senior",
  "College Freshman", "College Sophomore", "College Junior", "College Senior",
  "Graduate Student", "Other"
];

const GPA_RANGE_OPTIONS = ["4.0+", "3.5 - 3.9", "3.0 - 3.4", "2.5 - 2.9", "Below 2.5", "Not sure"];

const FIELDS_OF_STUDY = [
  "Engineering", "Business", "Healthcare", "Education", "Arts & Design", "Law", "Social Sciences",
  "STEM", "Computer Science", "Undecided", "Other",
];

const BACKGROUND_OPTIONS = [
  "First-generation college student", "Low income / financial need", "Military-connected family", "Single-parent household",
  "Hispanic/Latino", "African American", "Asian American", "Native American", "Other heritage", "Prefer not to say",
];

const INVOLVEMENT_OPTIONS = [
  "Sports / Athletics", "Community service / Volunteering", "Religious organization", "Student government",
  "Arts / Music / Theater", "Academic clubs", "ROTC", "None of the above",
];

const START_DATE_OPTIONS = ["Fall 2025", "Fall 2026", "Fall 2027", "Fall 2028", "Already enrolled", "Not sure"];
const CHALLENGE_OPTIONS = ["Finding scholarships", "Paying for college", "Writing essays", "Not sure where to start"];

const STEP_HEADING: Record<number, string> = {
  1: "Who are you?",
  2: "Academic profile",
  3: "Background",
  4: "Goals",
};

const STEP_SUBTEXT: Record<number, string> = {
  1: "Tell us a little about yourself so we can personalize your experience.",
  2: "These details help us match you to scholarships faster.",
  3: "Optional context can unlock more targeted opportunities.",
  4: "Set your goals so we can route you to the right next steps.",
};

const toggleArrayValue = (arr: string[], value: string) =>
  arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value];

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [form, setForm] = useState({
    first_name: "",
    state: "",
    grade_level: "",
    gpa_range: "",
    fields_of_study: [] as string[],
    background_tags: [] as string[],
    involvement_tags: [] as string[],
    college_start: "",
    biggest_challenge: "",
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
          first_name: profile.first_name || "",
          state: profile.state || "",
          grade_level: profile.grade_level || "",
          gpa_range: profile.gpa_range || "",
          fields_of_study: profile.fields_of_study || [],
          background_tags: profile.background_tags || [],
          involvement_tags: profile.involvement_tags || [],
          college_start: profile.college_start || "",
          biggest_challenge: profile.biggest_challenge || "",
        });
      }
      setLoadingInitial(false);
    }
    fetchProfile();
  }, [router]);

  const progress = (step / 4) * 100;

  const handleNext = async (currentStep: number) => {
    setError("");

    // Validation
    if (currentStep === 1 && (!form.first_name.trim() || !form.state)) {
      setError("Please fill out all fields.");
      return;
    }
    if (currentStep === 2 && (!form.grade_level || !form.gpa_range || form.fields_of_study.length === 0)) {
      setError("Please fill out all fields.");
      return;
    }

    startTransition(async () => {
      const payload: any = {};
      if (currentStep === 1) {
        payload.first_name = form.first_name;
        payload.state = form.state;
      } else if (currentStep === 2) {
        payload.grade_level = form.grade_level;
        payload.gpa_range = form.gpa_range;
        payload.fields_of_study = form.fields_of_study;
      } else if (currentStep === 3) {
        payload.background_tags = form.background_tags;
        payload.involvement_tags = form.involvement_tags;
      } else if (currentStep === 4) {
        payload.college_start = form.college_start;
        payload.biggest_challenge = form.biggest_challenge;
        payload.onboarding_complete = true;
      }

      const nextStep = currentStep === 4 ? 4 : currentStep + 1;
      const result = await saveOnboardingStep(nextStep, payload);
      
      if (result.error) {
        setError(result.error);
      } else {
        if (currentStep === 4) {
          setDone(true);
        } else {
          setStep(nextStep);
        }
      }
    });
  };

  const handleSkip = () => {
    if (step === 3) handleNext(3); // Just save empty arrays
    if (step === 4) handleNext(4); // Just save empty strings and finish
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
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Your profile is ready!</h2>
          <p className="text-slate-500 mb-6">
            Nice work, {form.first_name || "there"}. We saved your profile and your scholarship matches are ready.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl mb-8">
            <p className="text-sm font-semibold text-slate-700">
              {form.state || "State not set"} <span className="text-slate-300 mx-2">|</span> {form.grade_level || "Grade not set"} <span className="text-slate-300 mx-2">|</span> {form.gpa_range || "GPA not set"}
            </p>
          </div>
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shadow-lg shadow-purple-200"
          >
            Find My Scholarships <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full mx-auto">
        <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          
          {/* Header & Progress */}
          <div className="mb-8">
            <p className="text-sm font-bold text-slate-400 mb-2">Step {step} of 4</p>
            <Progress value={progress} className="h-2.5 [&>div]:bg-violet-600 bg-slate-100" />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900">{STEP_HEADING[step]}</h2>
            <p className="mt-2 text-slate-500">{STEP_SUBTEXT[step]}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="space-y-8">
            {/* --- STEP 1 --- */}
            {step === 1 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">First name</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="h-12 rounded-xl border-slate-200 focus-visible:ring-violet-600"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">State</Label>
                  <select
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>Select your state...</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* --- STEP 2 --- */}
            {step === 2 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Grade level</Label>
                  <select
                    value={form.grade_level}
                    onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                    className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2"
                  >
                    <option value="" disabled>Select grade level...</option>
                    {GRADE_LEVEL_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">What is your GPA range?</Label>
                  <div className="flex flex-wrap gap-2">
                    {GPA_RANGE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => setForm({ ...form, gpa_range: option })}
                        className={cn(
                          "px-4 py-2 text-sm font-medium rounded-full border transition-all",
                          form.gpa_range === option
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Field of study (select all that apply)</Label>
                  <div className="flex flex-wrap gap-2">
                    {FIELDS_OF_STUDY.map((option) => {
                      const isActive = form.fields_of_study.includes(option);
                      return (
                        <button
                          key={option}
                          onClick={() => setForm({ ...form, fields_of_study: toggleArrayValue(form.fields_of_study, option) })}
                          className={cn(
                            "px-4 py-2 text-sm font-medium rounded-full border transition-all",
                            isActive
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* --- STEP 3 --- */}
            {step === 3 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Do any of these apply to you?</Label>
                  <div className="flex flex-wrap gap-2">
                    {BACKGROUND_OPTIONS.map((option) => {
                      const isActive = form.background_tags.includes(option);
                      return (
                        <button
                          key={option}
                          onClick={() => setForm({ ...form, background_tags: toggleArrayValue(form.background_tags, option) })}
                          className={cn(
                            "px-4 py-2 text-sm font-medium rounded-full border transition-all",
                            isActive
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Are you involved in any of these?</Label>
                  <div className="flex flex-wrap gap-2">
                    {INVOLVEMENT_OPTIONS.map((option) => {
                      const isActive = form.involvement_tags.includes(option);
                      return (
                        <button
                          key={option}
                          onClick={() => setForm({ ...form, involvement_tags: toggleArrayValue(form.involvement_tags, option) })}
                          className={cn(
                            "px-4 py-2 text-sm font-medium rounded-full border transition-all",
                            isActive
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* --- STEP 4 --- */}
            {step === 4 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">College start date</Label>
                  <select
                    value={form.college_start}
                    onChange={(e) => setForm({ ...form, college_start: e.target.value })}
                    className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2"
                  >
                    <option value="" disabled>Select a start date...</option>
                    {START_DATE_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">What's your biggest challenge right now?</Label>
                  <select
                    value={form.biggest_challenge}
                    onChange={(e) => setForm({ ...form, biggest_challenge: e.target.value })}
                    className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2"
                  >
                    <option value="" disabled>Select your biggest challenge...</option>
                    {CHALLENGE_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                className={cn("text-slate-500 hover:text-slate-900 rounded-xl", step === 1 && "invisible")}
              >
                Back
              </Button>
              
              <div className="flex items-center gap-4">
                {(step === 3 || step === 4) && (
                  <button onClick={handleSkip} className="text-sm font-semibold text-slate-400 hover:text-slate-600">
                    Skip for now
                  </button>
                )}
                <Button
                  disabled={isPending}
                  onClick={() => handleNext(step)}
                  className="h-11 rounded-xl px-6 font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md"
                >
                  {isPending ? "Saving..." : step === 4 ? "Finish" : "Continue"}
                </Button>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
