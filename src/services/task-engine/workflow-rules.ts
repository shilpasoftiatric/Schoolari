export type TranscriptState = 'NOT_UPLOADED' | 'UPLOADED' | 'ATTACHED' | 'VERIFIED' | 'USED_IN_APPLICATION';
export type EssayState = 'NOT_STARTED' | 'DRAFT' | 'AI_REVIEW' | 'FINAL' | 'ATTACHED' | 'SUBMITTED';
export type ScholarshipState = 'NOT_FOUND' | 'SAVED' | 'STARTED' | 'DOCUMENTS_PENDING' | 'READY_TO_SUBMIT' | 'SUBMITTED' | 'TRACKING' | 'COMPLETED';
export type CollegeState = 'NOT_SELECTED' | 'SAVED' | 'COMPARING' | 'APPLICATION_STARTED' | 'APPLICATION_SUBMITTED' | 'WAITING_RESULT' | 'COMPLETED';
export type ResumeState = 'NOT_STARTED' | 'CREATED' | 'IMPROVE' | 'READY';

export interface WorkflowStates {
  transcript: TranscriptState;
  essay: EssayState;
  scholarship: ScholarshipState;
  college: CollegeState;
  resume: ResumeState;
}

export interface TaskRule {
  state: string;
  taskTitle: string;
  goalTitle: string;
  baseUrgency: number;
  dependencies: string[];
}

export const TRANSCRIPT_RULES: Record<TranscriptState, TaskRule> = {
  NOT_UPLOADED: {
    state: 'NOT_UPLOADED',
    taskTitle: 'Upload your high school transcript to Vault',
    goalTitle: 'Submit transcript to your secure documents vault',
    baseUrgency: 45,
    dependencies: []
  },
  UPLOADED: {
    state: 'UPLOADED',
    taskTitle: 'Attach transcript to in-progress applications',
    goalTitle: 'Link transcript file to active scholarship opportunities',
    baseUrgency: 35,
    dependencies: []
  },
  ATTACHED: {
    state: 'ATTACHED',
    taskTitle: 'Verify transcript attachment on submitted applications',
    goalTitle: 'Confirm transcript upload status in tracker dashboard',
    baseUrgency: 25,
    dependencies: []
  },
  VERIFIED: {
    state: 'VERIFIED',
    taskTitle: 'Verify transcript matches scholarship requirements',
    goalTitle: 'Double check GPA calculations match official records',
    baseUrgency: 15,
    dependencies: []
  },
  USED_IN_APPLICATION: {
    state: 'USED_IN_APPLICATION',
    taskTitle: '',
    goalTitle: '',
    baseUrgency: 0,
    dependencies: []
  }
};

export const ESSAY_RULES: Record<EssayState, TaskRule> = {
  NOT_STARTED: {
    state: 'NOT_STARTED',
    taskTitle: 'Start your main scholarship essay outline',
    goalTitle: 'Draft initial outline structure for personal essay',
    baseUrgency: 40,
    dependencies: []
  },
  DRAFT: {
    state: 'DRAFT',
    taskTitle: 'Review your main essay draft with AI',
    goalTitle: 'Send main essay draft to admissions edit feedback',
    baseUrgency: 35,
    dependencies: []
  },
  AI_REVIEW: {
    state: 'AI_REVIEW',
    taskTitle: 'Apply AI suggestions to polish essay draft',
    goalTitle: 'Incorporate grammar and flow corrections in draft',
    baseUrgency: 30,
    dependencies: []
  },
  FINAL: {
    state: 'FINAL',
    taskTitle: 'Attach finalized essay to applications',
    goalTitle: 'Link your finalized personal statement to saved items',
    baseUrgency: 25,
    dependencies: []
  },
  ATTACHED: {
    state: 'ATTACHED',
    taskTitle: 'Submit scholarship application with essay',
    goalTitle: 'Complete final application submission checklist',
    baseUrgency: 20,
    dependencies: []
  },
  SUBMITTED: {
    state: 'SUBMITTED',
    taskTitle: '',
    goalTitle: '',
    baseUrgency: 0,
    dependencies: []
  }
};

export const SCHOLARSHIP_RULES: Record<ScholarshipState, TaskRule> = {
  NOT_FOUND: {
    state: 'NOT_FOUND',
    taskTitle: 'Search and match scholarships for your profile',
    goalTitle: 'Find and save at least 3 matching scholarships',
    baseUrgency: 50,
    dependencies: []
  },
  SAVED: {
    state: 'SAVED',
    taskTitle: 'Begin applying to your saved scholarships',
    goalTitle: 'Move saved scholarships into active application progress',
    baseUrgency: 45,
    dependencies: []
  },
  STARTED: {
    state: 'STARTED',
    taskTitle: 'Prepare documents for scholarship applications',
    goalTitle: 'Organize required essays and letters of rec',
    baseUrgency: 40,
    dependencies: []
  },
  DOCUMENTS_PENDING: {
    state: 'DOCUMENTS_PENDING',
    taskTitle: 'Upload required documents for scholarship application',
    goalTitle: 'Verify transcript and recommendation file uploads',
    baseUrgency: 35,
    dependencies: ['transcript-UPLOADED']
  },
  READY_TO_SUBMIT: {
    state: 'READY_TO_SUBMIT',
    taskTitle: 'Submit your scholarship application',
    goalTitle: 'Complete application portal instructions and submit',
    baseUrgency: 48,
    dependencies: ['transcript-UPLOADED']
  },
  SUBMITTED: {
    state: 'SUBMITTED',
    taskTitle: 'Track your submitted scholarship application status',
    goalTitle: 'Monitor review status in dashboard tracker',
    baseUrgency: 20,
    dependencies: []
  },
  TRACKING: {
    state: 'TRACKING',
    taskTitle: 'Follow up on application status and updates',
    goalTitle: 'Submit final award notification form',
    baseUrgency: 10,
    dependencies: []
  },
  COMPLETED: {
    state: 'COMPLETED',
    taskTitle: '',
    goalTitle: '',
    baseUrgency: 0,
    dependencies: []
  }
};

export const COLLEGE_RULES: Record<CollegeState, TaskRule> = {
  NOT_SELECTED: {
    state: 'NOT_SELECTED',
    taskTitle: 'Search colleges matching your major and GPA',
    goalTitle: 'Add target colleges and programs to shortlist',
    baseUrgency: 30,
    dependencies: []
  },
  SAVED: {
    state: 'SAVED',
    taskTitle: 'Compare admission requirements for saved colleges',
    goalTitle: 'Analyze GPA and test score thresholds of targets',
    baseUrgency: 28,
    dependencies: []
  },
  COMPARING: {
    state: 'COMPARING',
    taskTitle: 'Prepare application packages for target colleges',
    goalTitle: 'Review deadlines and essay prompt options',
    baseUrgency: 25,
    dependencies: []
  },
  APPLICATION_STARTED: {
    state: 'APPLICATION_STARTED',
    taskTitle: 'Complete admission application forms',
    goalTitle: 'Fill out Common App or coalition system portal details',
    baseUrgency: 22,
    dependencies: []
  },
  APPLICATION_SUBMITTED: {
    state: 'APPLICATION_SUBMITTED',
    taskTitle: 'Track college admission and enrollment decisions',
    goalTitle: 'Register for college admissions interview if offered',
    baseUrgency: 20,
    dependencies: []
  },
  WAITING_RESULT: {
    state: 'WAITING_RESULT',
    taskTitle: 'Review financial aid awards offers',
    goalTitle: 'Compare tuition packages and grant options',
    baseUrgency: 10,
    dependencies: []
  },
  COMPLETED: {
    state: 'COMPLETED',
    taskTitle: '',
    goalTitle: '',
    baseUrgency: 0,
    dependencies: []
  }
};

export const RESUME_RULES: Record<ResumeState, TaskRule> = {
  NOT_STARTED: {
    state: 'NOT_STARTED',
    taskTitle: 'Create your personal and academic resumes',
    goalTitle: 'Initialize resume builder details',
    baseUrgency: 20,
    dependencies: []
  },
  CREATED: {
    state: 'CREATED',
    taskTitle: 'Optimize description bullets with Claude AI',
    goalTitle: 'Polish resume activities bullets in builder',
    baseUrgency: 18,
    dependencies: []
  },
  IMPROVE: {
    state: 'IMPROVE',
    taskTitle: 'Download your finalized, professional resume',
    goalTitle: 'Download text/markdown resume export',
    baseUrgency: 15,
    dependencies: []
  },
  READY: {
    state: 'READY',
    taskTitle: '',
    goalTitle: '',
    baseUrgency: 0,
    dependencies: []
  }
};
