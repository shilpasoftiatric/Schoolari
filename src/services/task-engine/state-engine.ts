import { 
  WorkflowStates, 
  TranscriptState, 
  EssayState, 
  ScholarshipState, 
  CollegeState, 
  ResumeState 
} from "./workflow-rules";

export function calculateWorkflowStates(dbData: {
  documents: any[];
  essays: any[];
  savedColleges: any[];
  applications: any[];
  resume: any;
  profile: any;
}): WorkflowStates {
  const { documents, essays, savedColleges, applications, resume, profile } = dbData;

  // 1. Resolve Transcript State
  let transcript: TranscriptState = 'NOT_UPLOADED';
  const hasTranscript = documents.some(d => d.type === "transcript" || d.name?.toLowerCase().includes("transcript"));
  if (hasTranscript) {
    const hasSubmitted = applications.some(a => a.status === "Submitted");
    const hasWon = applications.some(a => a.status === "Won");
    const hasInProgress = applications.some(a => a.status === "In Progress");

    if (hasWon) {
      transcript = 'USED_IN_APPLICATION';
    } else if (hasSubmitted) {
      transcript = 'VERIFIED';
    } else if (hasInProgress) {
      transcript = 'ATTACHED';
    } else {
      transcript = 'UPLOADED';
    }
  }

  // 2. Resolve Essay State
  let essay: EssayState = 'NOT_STARTED';
  if (essays.length > 0) {
    const hasCompleted = essays.some(e => e.status === "completed");
    const hasInProgress = essays.some(e => e.status === "in_progress");
    const hasSubmitted = applications.some(a => a.status === "Submitted");

    if (hasSubmitted && hasCompleted) {
      essay = 'SUBMITTED';
    } else if (hasCompleted) {
      essay = 'FINAL';
    } else if (hasInProgress) {
      essay = 'AI_REVIEW';
    } else {
      essay = 'DRAFT';
    }
  }

  // 3. Resolve Scholarship Tracker State
  let scholarship: ScholarshipState = 'NOT_FOUND';
  if (applications.length > 0) {
    const statuses = applications.map(a => a.status);
    const hasWonOrLost = statuses.includes("Won") || statuses.includes("Lost");
    const hasSubmitted = statuses.includes("Submitted");
    const hasInProgress = statuses.includes("In Progress");
    const hasNotStarted = statuses.includes("Not Started");

    if (hasWonOrLost) {
      scholarship = 'COMPLETED';
    } else if (hasSubmitted) {
      scholarship = 'TRACKING';
    } else if (hasInProgress) {
      if (hasTranscript) {
        scholarship = 'READY_TO_SUBMIT';
      } else {
        scholarship = 'DOCUMENTS_PENDING';
      }
    } else if (hasNotStarted) {
      // "I Will Apply" clicked — user intends to apply
      scholarship = 'SAVED';
    } else {
      scholarship = 'SAVED';
    }
  }

  // 4. Resolve College State
  let college: CollegeState = 'NOT_SELECTED';
  if (savedColleges.length > 0) {
    const statuses = savedColleges.map(c => c.status);
    const hasDecided = statuses.includes("accepted") || statuses.includes("rejected") || statuses.includes("completed");
    const hasWaiting = statuses.includes("waiting_decision") || statuses.includes("waitlisted");
    const hasApplied = statuses.includes("applied");
    const hasStarted = statuses.includes("application_started");

    if (hasDecided) {
      college = 'COMPLETED';
    } else if (hasWaiting) {
      college = 'WAITING_RESULT';
    } else if (hasApplied) {
      college = 'APPLICATION_SUBMITTED';
    } else if (hasStarted) {
      college = 'APPLICATION_STARTED';
    } else {
      // researching or saved
      if (savedColleges.length > 1) {
        college = 'COMPARING';
      } else {
        college = 'SAVED';
      }
    }
  }

  // 5. Resolve Resume State
  let resumeState: ResumeState = 'NOT_STARTED';
  if (resume && resume.content) {
    const content = resume.content;
    const personal = content.personal || {};
    const academic = content.academic || {};
    
    const hasEdu = (personal.education?.length > 0) || (academic.education?.length > 0);
    const hasExp = (personal.experience?.length > 0) || (academic.extracurriculars?.length > 0);
    const hasAIBullets = JSON.stringify(content).includes("•") || JSON.stringify(content).includes("- ");

    if (hasEdu && hasExp && hasAIBullets) {
      resumeState = 'READY';
    } else if (hasEdu && hasExp) {
      resumeState = 'IMPROVE';
    } else {
      resumeState = 'CREATED';
    }
  }

  return {
    transcript,
    essay,
    scholarship,
    college,
    resume: resumeState
  };
}
