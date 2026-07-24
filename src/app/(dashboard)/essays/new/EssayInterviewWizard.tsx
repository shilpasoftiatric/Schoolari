"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  GraduationCap, 
  Award, 
  Briefcase, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { generateFirstDraftEssay } from "@/app/actions/ai";
import { createEssay } from "@/app/actions/essays";

export type EssayType = "Scholarship Application" | "College Application" | "Other Application";

interface QuestionConfig {
  id: string;
  question: string;
  hint?: string;
  placeholder: string;
  type: "text" | "textarea" | "select_prompt";
  options?: string[];
  required?: boolean;
}

const SCHOLARSHIP_QUESTIONS: QuestionConfig[] = [
  {
    id: "title",
    question: "What is the name of the scholarship you're applying for?",
    placeholder: "e.g. Coca-Cola Scholars Program, Gates Scholarship",
    type: "text",
    required: true
  },
  {
    id: "prompt",
    question: "What is the essay prompt or question they're asking you to answer?",
    hint: "Paste the exact essay prompt from the scholarship website.",
    placeholder: "e.g. Describe your leadership experiences and how they have impacted your school or community...",
    type: "textarea",
    required: true
  },
  {
    id: "wordLimit",
    question: "What is the word or character limit?",
    placeholder: "e.g. 500 words, 250 words, 3000 characters",
    type: "text"
  },
  {
    id: "qualification",
    question: "What makes you uniquely qualified for this scholarship?",
    hint: "Write 2–3 sentences highlighting your strengths, dedication, or background.",
    placeholder: "e.g. My passion for computer science paired with 100+ volunteer hours mentoring middle school students...",
    type: "textarea",
    required: true
  },
  {
    id: "academicAchievement",
    question: "What is your biggest academic achievement so far?",
    placeholder: "e.g. Maintaining a 3.9 GPA while taking 4 AP courses, winning 1st place in regional Science Olympiad...",
    type: "textarea"
  },
  {
    id: "challenge",
    question: "Describe a challenge you've faced and how you overcame it",
    placeholder: "e.g. Struggling with AP Calculus initially, organizing peer study groups, and improving my grade to an A-...",
    type: "textarea"
  },
  {
    id: "goals",
    question: "What are your career or college goals?",
    placeholder: "e.g. Pursuing a BS in Computer Engineering to become a cybersecurity specialist protecting public infrastructure...",
    type: "textarea"
  },
  {
    id: "identity",
    question: "Is there anything specific about your background, community, or identity that's relevant to this scholarship?",
    placeholder: "e.g. First-generation college student from an immigrant family passionate about increasing Tech access...",
    type: "textarea"
  },
  {
    id: "memorable",
    question: "What do you want the scholarship committee to remember about you after reading your essay?",
    placeholder: "e.g. That I am resilient, community-minded, and committed to using my degree to solve real-world problems.",
    type: "textarea"
  }
];

const COMMON_APP_PROMPTS = [
  "Discuss an accomplishment, event, or realization that sparked a period of personal growth and a new understanding of yourself or others.",
  "Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time. Why does it captivate you?",
  "Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?",
  "Describe a problem you've solved or a problem you'd like to solve. Explain its significance to you and what steps you took or could take to identify a solution.",
  "Share an essay on any topic of your choice. It can be one you've already written, one that responds to a different prompt, or one of your own design.",
  "Custom / Other College Prompt (Paste below)"
];

const COLLEGE_QUESTIONS: QuestionConfig[] = [
  {
    id: "title",
    question: "Which college are you applying to?",
    placeholder: "e.g. Stanford University, UC Berkeley, University of Michigan",
    type: "text",
    required: true
  },
  {
    id: "prompt",
    question: "Which essay prompt are you responding to?",
    hint: "Select a Common App prompt or paste your specific college prompt.",
    placeholder: "Paste essay prompt here...",
    type: "select_prompt",
    options: COMMON_APP_PROMPTS,
    required: true
  },
  {
    id: "wordLimit",
    question: "What is the word limit?",
    placeholder: "e.g. 650 words (Common App limit), 250 words",
    type: "text"
  },
  {
    id: "experience",
    question: "Tell me about a meaningful experience that shaped who you are",
    placeholder: "e.g. Building my first website for a local food pantry during junior year...",
    type: "textarea",
    required: true
  },
  {
    id: "challenge",
    question: "What's a challenge you've overcome and what did it teach you?",
    placeholder: "e.g. Overcoming public speaking anxiety by joining the Model UN team...",
    type: "textarea"
  },
  {
    id: "proudest",
    question: "What are you most proud of in your high school career?",
    placeholder: "e.g. Founding our school's Coding Club and growing membership from 4 to 35 students...",
    type: "textarea"
  },
  {
    id: "studyReason",
    question: "What do you want to study and why?",
    placeholder: "e.g. Computer Science because I love solving complex algorithmic puzzles and creating human-centric software...",
    type: "textarea",
    required: true
  },
  {
    id: "fit",
    question: "What makes you a good fit for this specific college?",
    placeholder: "e.g. Collaborative culture, undergraduate research labs, and strong entrepreneurship ecosystem...",
    type: "textarea"
  },
  {
    id: "admissionsContext",
    question: "Is there anything about your background that the admissions committee should understand?",
    placeholder: "e.g. Working 15 hours a week at a family grocery store while taking honors classes...",
    type: "textarea"
  }
];

const OTHER_QUESTIONS: QuestionConfig[] = [
  {
    id: "title",
    question: "What is this application for?",
    placeholder: "e.g. Summer Research Internship, National Leadership Program, Youth Award",
    type: "text",
    required: true
  },
  {
    id: "prompt",
    question: "What is the essay prompt?",
    placeholder: "e.g. Explain why you want to participate in this summer research program...",
    type: "textarea",
    required: true
  },
  {
    id: "wordLimit",
    question: "What is the word limit?",
    placeholder: "e.g. 300 words, 500 words",
    type: "text"
  },
  {
    id: "reason",
    question: "Why are you applying for this opportunity?",
    placeholder: "e.g. To gain hands-on laboratory experience under university faculty mentors...",
    type: "textarea",
    required: true
  },
  {
    id: "qualifications",
    question: "What experience or skills make you a strong candidate?",
    placeholder: "e.g. Proficiency in Python and data analysis, completed AP Chemistry lab projects...",
    type: "textarea"
  },
  {
    id: "hopes",
    question: "What do you hope to gain from this opportunity?",
    placeholder: "e.g. Advanced technical skills, industry mentorship, and academic growth...",
    type: "textarea"
  }
];

export function EssayInterviewWizard() {
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<EssayType | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [selectedPromptOption, setSelectedPromptOption] = useState<string>("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const getQuestions = (): QuestionConfig[] => {
    if (selectedType === "Scholarship Application") return SCHOLARSHIP_QUESTIONS;
    if (selectedType === "College Application") return COLLEGE_QUESTIONS;
    if (selectedType === "Other Application") return OTHER_QUESTIONS;
    return [];
  };

  const questions = getQuestions();
  const activeQuestionIndex = currentStep - 1;
  const currentQuestion = questions[activeQuestionIndex];

  const handleSelectType = (type: EssayType) => {
    setSelectedType(type);
    setCurrentStep(1);
    setAnswers({});
    setErrorMsg("");
  };

  const handleAnswerChange = (val: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: val
    }));
  };

  const handleNext = () => {
    if (!currentQuestion) return;

    if (currentQuestion.type === "select_prompt") {
      const finalPrompt = selectedPromptOption === "Custom / Other College Prompt (Paste below)"
        ? customPrompt
        : (selectedPromptOption || customPrompt);
      
      if (!finalPrompt && currentQuestion.required) {
        setErrorMsg("Please select or paste an essay prompt.");
        return;
      }
      setAnswers(prev => ({ ...prev, prompt: finalPrompt }));
    } else {
      if (currentQuestion.required && !answers[currentQuestion.id]?.trim()) {
        setErrorMsg("This answer is required to help AI build your draft accurately.");
        return;
      }
    }

    setErrorMsg("");
    if (currentStep < questions.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      submitAnswersAndGenerate();
    }
  };

  const handleBack = () => {
    setErrorMsg("");
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      setCurrentStep(0);
      setSelectedType(null);
    }
  };

  const submitAnswersAndGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg("");

    try {
      const qConfigMap = questions.reduce((acc, q) => {
        const studentAns = q.id === "prompt" && selectedPromptOption && selectedPromptOption !== "Custom / Other College Prompt (Paste below)"
          ? selectedPromptOption
          : (answers[q.id] || "");
        acc[q.question] = studentAns || "N/A";
        return acc;
      }, {} as Record<string, string>);

      const targetTitle = answers["title"] || selectedType || "Essay Draft";
      const targetPrompt = answers["prompt"] || selectedPromptOption || "Personal Statement";
      const wordLimit = answers["wordLimit"] || "";

      const firstDraftText = await generateFirstDraftEssay({
        type: selectedType || "Essay Application",
        title: targetTitle,
        prompt: targetPrompt,
        wordLimit,
        answers: qConfigMap
      });

      const { id } = await createEssay(
        targetTitle,
        targetPrompt,
        firstDraftText
      );

      router.push(`/essays/${id}`);
    } catch (err: any) {
      console.error("Failed to generate essay draft:", err);
      setErrorMsg(err.message || "Failed to generate essay draft. Please try again.");
      setIsGenerating(false);
    }
  };

  if (currentStep === 0 || !selectedType) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 font-bold text-xs mb-3">
            <Sparkles className="w-4 h-4" /> AI Interview Assistant
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            What type of essay are you writing?
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto text-sm sm:text-base">
            Our AI asks personalized questions one at a time to build a structured first draft in your own authentic voice.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            onClick={() => handleSelectType("Scholarship Application")}
            className="border-2 border-slate-200 hover:border-violet-600 hover:shadow-lg transition-all cursor-pointer group rounded-3xl p-2 relative overflow-hidden"
          >
            <CardHeader className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-violet-600 transition-colors">
                Scholarship Application
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs mt-2 leading-relaxed">
                Tailored interview for scholarship prompts, financial need, merit qualifications, and personal impact.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="flex items-center text-xs font-bold text-violet-600 group-hover:translate-x-1 transition-transform">
                Start Interview <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>

          <Card 
            onClick={() => handleSelectType("College Application")}
            className="border-2 border-slate-200 hover:border-violet-600 hover:shadow-lg transition-all cursor-pointer group rounded-3xl p-2 relative overflow-hidden"
          >
            <CardHeader className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-violet-600 transition-colors">
                College Application
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs mt-2 leading-relaxed">
                Designed for Common App prompts, college personal statements, and school-specific supplemental essays.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="flex items-center text-xs font-bold text-violet-600 group-hover:translate-x-1 transition-transform">
                Start Interview <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>

          <Card 
            onClick={() => handleSelectType("Other Application")}
            className="border-2 border-slate-200 hover:border-violet-600 hover:shadow-lg transition-all cursor-pointer group rounded-3xl p-2 relative overflow-hidden"
          >
            <CardHeader className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Briefcase className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-violet-600 transition-colors">
                Other Application
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs mt-2 leading-relaxed">
                For summer research programs, internships, honors opportunities, and general statement of intent essays.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="flex items-center text-xs font-bold text-violet-600 group-hover:translate-x-1 transition-transform">
                Start Interview <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((currentStep / questions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handleBack}
          disabled={isGenerating}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-xs font-extrabold text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
          {selectedType} — Question {currentStep} of {questions.length}
        </span>
      </div>

      <div className="w-full bg-slate-100 h-2 rounded-full mb-6 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <Card className="border border-slate-200 shadow-md rounded-3xl overflow-hidden bg-white">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-xl font-extrabold text-slate-900 leading-snug">
            {currentQuestion.question}
          </CardTitle>
          {currentQuestion.hint && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {currentQuestion.hint}
            </p>
          )}
        </CardHeader>

        <CardContent className="p-6 pt-3 space-y-4">
          {currentQuestion.type === "text" && (
            <Input
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder={currentQuestion.placeholder}
              className="rounded-xl border-slate-200 text-sm py-3 px-4 focus-visible:ring-violet-600"
              disabled={isGenerating}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNext();
              }}
            />
          )}

          {currentQuestion.type === "textarea" && (
            <textarea
              value={answers[currentQuestion.id] || ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleAnswerChange(e.target.value)}
              placeholder={currentQuestion.placeholder}
              className="w-full rounded-xl border border-slate-200 text-sm p-4 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-slate-400"
              disabled={isGenerating}
            />
          )}

          {currentQuestion.type === "select_prompt" && (
            <div className="space-y-3">
              <div className="space-y-2">
                {currentQuestion.options?.map((opt, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      selectedPromptOption === opt
                        ? "border-violet-600 bg-violet-50/60 text-violet-900 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="collegePrompt"
                      value={opt}
                      checked={selectedPromptOption === opt}
                      onChange={() => setSelectedPromptOption(opt)}
                      className="mt-0.5 text-violet-600 focus:ring-violet-500"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>

              {(selectedPromptOption === "Custom / Other College Prompt (Paste below)" || !selectedPromptOption) && (
                <textarea
                  value={customPrompt}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPrompt(e.target.value)}
                  placeholder="Paste your specific college essay prompt here..."
                  className="w-full rounded-xl border border-slate-200 text-sm p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-slate-400"
                  disabled={isGenerating}
                />
              )}
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-red-500 font-bold bg-red-50 p-2.5 rounded-lg">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isGenerating}
              className="rounded-xl border-slate-200"
            >
              Back
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              disabled={isGenerating}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold px-6 rounded-xl shadow-md gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Synthesizing Draft...
                </>
              ) : currentStep === questions.length ? (
                <>
                  Generate First Draft <Sparkles className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next Question <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
