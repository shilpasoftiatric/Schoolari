import { 
  WorkflowStates, 
  TRANSCRIPT_RULES, 
  ESSAY_RULES, 
  SCHOLARSHIP_RULES, 
  COLLEGE_RULES, 
  RESUME_RULES 
} from "./workflow-rules";

export interface DashboardTask {
  title: string;
  category: 'scholarships' | 'essays' | 'colleges' | 'resume';
  done: boolean;
  score: number;
}

export function generatePrioritiesAndGoals(
  states: WorkflowStates,
  dbData: {
    applications: any[];
    savedColleges: any[];
    profile: any;
  }
) {
  const tasks: DashboardTask[] = [];

  // Parse deadlines to check urgency multiplier
  let minScholarshipDays = 999;
  dbData.applications.forEach(app => {
    if (app.scholarships?.deadline) {
      const diff = new Date(app.scholarships.deadline).getTime() - Date.now();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (days > 0 && days < minScholarshipDays) {
        minScholarshipDays = days;
      }
    }
  });

  let minCollegeDays = 999;
  dbData.savedColleges.forEach(col => {
    if (col.deadline) {
      const diff = new Date(col.deadline).getTime() - Date.now();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (days > 0 && days < minCollegeDays) {
        minCollegeDays = days;
      }
    }
  });

  // Calculate deadline multipliers
  const getDeadlineBonus = (days: number) => {
    if (days <= 2) return 100;
    if (days <= 7) return 50;
    if (days <= 30) return 15;
    return 0;
  };

  // 1. Transcript tasks
  const txRule = TRANSCRIPT_RULES[states.transcript];
  if (txRule && txRule.taskTitle) {
    let score = txRule.baseUrgency;
    // Add blocker bonus if transcript is missing and scholarships are in progress
    if (states.transcript === 'NOT_UPLOADED' && states.scholarship === 'STARTED') {
      score += 30;
    }
    tasks.push({
      title: txRule.taskTitle,
      category: 'scholarships',
      done: false,
      score
    });
  }

  // 2. Scholarship tracker tasks
  const scRule = SCHOLARSHIP_RULES[states.scholarship];
  if (scRule && scRule.taskTitle) {
    let score = scRule.baseUrgency;
    score += getDeadlineBonus(minScholarshipDays);
    tasks.push({
      title: scRule.taskTitle,
      category: 'scholarships',
      done: false,
      score
    });
  }

  // 3. Essay tasks
  const esRule = ESSAY_RULES[states.essay];
  if (esRule && esRule.taskTitle) {
    let score = esRule.baseUrgency;
    // Add deadline urgency mapping to essay preparation
    score += getDeadlineBonus(minScholarshipDays);
    tasks.push({
      title: esRule.taskTitle,
      category: 'essays',
      done: false,
      score
    });
  }

  // 4. College tasks
  const clRule = COLLEGE_RULES[states.college];
  if (clRule && clRule.taskTitle) {
    let score = clRule.baseUrgency;
    score += getDeadlineBonus(minCollegeDays);
    tasks.push({
      title: clRule.taskTitle,
      category: 'colleges',
      done: false,
      score
    });
  }

  // 5. Resume tasks
  const rsRule = RESUME_RULES[states.resume];
  if (rsRule && rsRule.taskTitle) {
    let score = rsRule.baseUrgency;
    tasks.push({
      title: rsRule.taskTitle,
      category: 'resume',
      done: false,
      score
    });
  }

  // Sort tasks by computed score in descending order
  const sortedTasks = [...tasks].sort((a, b) => b.score - a.score);

  return sortedTasks;
}
