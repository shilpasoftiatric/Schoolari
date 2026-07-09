import { WorkflowStates } from "./workflow-rules";

export function generateWeeklyGoals(states: WorkflowStates) {
  // Scholarships Goals
  let scholarships: string[] = [];
  switch (states.scholarship) {
    case 'NOT_FOUND':
      scholarships = [
        "Search active listings for matching opportunities",
        "Save 3 scholarships to your shortlist tracker",
        "Select fields of study in settings options"
      ];
      break;
    case 'SAVED':
      scholarships = [
        "Move 2 saved items to In Progress status",
        "Double-check deadline dates for saved opportunities",
        "Review eligibility limits for saved scholarships"
      ];
      break;
    case 'STARTED':
      scholarships = [
        "Outline required documents checklist for saved items",
        "Ask teachers for letters of recommendation",
        "Start draft outline for priority scholarship"
      ];
      break;
    case 'DOCUMENTS_PENDING':
      scholarships = [
        "Verify transcript is successfully uploaded to Vault",
        "Check status of requested recommendation letters",
        "Assemble application files portfolio"
      ];
      break;
    case 'READY_TO_SUBMIT':
      scholarships = [
        "Run final grammar check on application details",
        "Attach transcript files to active tracker items",
        "Submit at least 1 scholarship application"
      ];
      break;
    case 'SUBMITTED':
    case 'TRACKING':
      scholarships = [
        "Monitor dashboard messages for update notifications",
        "Submit second target scholarship application",
        "Keep records of application confirmations"
      ];
      break;
    default:
      scholarships = [
        "Apply for 2 new scholarships this week",
        "Log in and complete your daily priorities"
      ];
  }

  // Essays Goals
  let essays: string[] = [];
  switch (states.essay) {
    case 'NOT_STARTED':
      essays = [
        "Outline key themes for personal statement prompt",
        "Select target topic for scholarship essay review",
        "Draft hook ideas for introduction"
      ];
      break;
    case 'DRAFT':
      essays = [
        "Write 500 words of your essay draft",
        "Organize paragraphs to match outline flow",
        "Select main draft file in documents"
      ];
      break;
    case 'AI_REVIEW':
      essays = [
        "Submit draft to AI coach for clarity review",
        "Apply grammar and style recommendations",
        "Address flow feedback comments from editor"
      ];
      break;
    case 'FINAL':
    case 'ATTACHED':
      essays = [
        "Confirm essay text matches length constraints",
        "Upload final essay document copy to Vault",
        "Link completed essay to tracking application"
      ];
      break;
    default:
      essays = [
        "Review essay writing prompt options",
        "Incorporate professional action verbs in drafts"
      ];
  }

  // Colleges Goals
  let colleges: string[] = [];
  switch (states.college) {
    case 'NOT_SELECTED':
      colleges = [
        "Add 3 target colleges to saved list",
        "Select school types in onboarding settings",
        "Explore college match suggestions on dashboard"
      ];
      break;
    case 'SAVED':
      colleges = [
        "Analyze GPA limits for target universities",
        "Check financial aid deadline dates for shortlist",
        "Compare admission rates of safety/reach options"
      ];
      break;
    case 'COMPARING':
      colleges = [
        "Establish final reaches, targets, and safeties",
        "Calculate total tuition and fee estimates",
        "Review college application prompt lists"
      ];
      break;
    case 'APPLICATION_STARTED':
      colleges = [
        "Request official transcripts for submission",
        "Complete Common App details form sections",
        "Fill out financial aid applications (FAFSA)"
      ];
      break;
    case 'APPLICATION_SUBMITTED':
    case 'WAITING_RESULT':
      colleges = [
        "Register for admissions interview if offered",
        "Confirm enrollment portal link logins",
        "Monitor decision notifications status"
      ];
      break;
    default:
      colleges = [
        "Research program specifications for majors",
        "Schedule virtual campus tour sessions"
      ];
  }

  return {
    scholarships,
    essays,
    colleges
  };
}
