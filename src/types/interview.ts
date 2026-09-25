export interface StarAnswerPayload {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface StarEvaluationResult {
  score: number; // 0 to 100
  rating: "Strong Answer" | "Solid Effort" | "Needs Refinement";
  strengths: string[];
  improvements: string[];
  polished_answer: string; // 45-60 second verbal script
}

export interface StarPracticeEntry {
  questionId: string;
  question: string;
  type: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  evaluation?: StarEvaluationResult;
  updatedAt: string;
}

export interface InterviewQuestionItem {
  id: string;
  question: string;
  type: "Behavioral" | "Role-Specific" | "Company-Fit" | "Situational" | string;
  tip: string;
  isStarred?: boolean;
  practiceEntry?: StarPracticeEntry;
}
