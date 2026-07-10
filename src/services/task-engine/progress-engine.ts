import { WorkflowStates } from "./workflow-rules";

export function calculateOverallProgress(states: WorkflowStates, profile: any): number {
  let score = 0;

  // 1. Onboarding (Max 10)
  if (profile?.onboarding_complete) score += 10;

  // 2. Transcript (Max 15)
  switch (states.transcript) {
    case 'UPLOADED': score += 5; break;
    case 'ATTACHED': score += 10; break;
    case 'VERIFIED':
    case 'USED_IN_APPLICATION': score += 15; break;
  }

  // 3. Essay (Max 20)
  switch (states.essay) {
    case 'DRAFT': score += 5; break;
    case 'AI_REVIEW': score += 10; break;
    case 'FINAL': score += 15; break;
    case 'SUBMITTED': score += 20; break;
  }

  // 4. Scholarship (Max 20)
  switch (states.scholarship) {
    case 'SAVED': score += 5; break;
    case 'DOCUMENTS_PENDING': score += 10; break;
    case 'READY_TO_SUBMIT': score += 15; break;
    case 'TRACKING':
    case 'COMPLETED': score += 20; break;
  }

  // 5. College (Max 15)
  switch (states.college) {
    case 'SAVED': score += 5; break;
    case 'COMPARING': score += 10; break;
    case 'APPLICATION_SUBMITTED':
    case 'WAITING_RESULT':
    case 'COMPLETED': score += 15; break;
  }

  // 6. Resume (Max 20)
  switch (states.resume) {
    case 'CREATED': score += 5; break;
    case 'IMPROVE': score += 10; break;
    case 'READY': score += 20; break;
  }

  return Math.min(100, Math.max(0, score));
}

export function getNextMilestone(states: WorkflowStates, progress: number): string {
  if (progress === 100) return "All Milestones Completed!";
  if (states.resume === 'NOT_STARTED') return "Create Resume";
  if (states.transcript === 'NOT_UPLOADED') return "Upload Transcript";
  if (states.scholarship === 'NOT_FOUND') return "Save a Scholarship";
  if (states.essay === 'NOT_STARTED') return "Draft an Essay";
  if (states.college === 'NOT_SELECTED') return "Add a College";
  if (states.resume === 'CREATED' || states.resume === 'IMPROVE') return "Improve Resume";
  if (states.essay === 'DRAFT' || states.essay === 'AI_REVIEW') return "Finalize Essay";
  if (states.scholarship === 'SAVED') return "Apply to Scholarship";
  if (states.college === 'SAVED') return "Compare Colleges";
  
  return "Keep Going!";
}

export function getMotivationalMessage(progress: number): { title: string, subtitle: string } {
  if (progress <= 20) {
    return { title: "Great start!", subtitle: "Complete your profile and upload your first documents to begin your scholarship journey." };
  } else if (progress <= 40) {
    return { title: "You're making progress!", subtitle: "Finish your onboarding and start building your scholarship portfolio." };
  } else if (progress <= 60) {
    return { title: "Nice work!", subtitle: "Keep completing tasks and applications to stay ahead." };
  } else if (progress <= 80) {
    return { title: "You're getting close!", subtitle: "Stay consistent and complete your remaining goals." };
  } else if (progress <= 99) {
    return { title: "Excellent progress!", subtitle: "You're almost ready to maximize every opportunity." };
  } else {
    return { title: "Outstanding!", subtitle: "You've completed every available milestone. Keep monitoring new opportunities." };
  }
}
