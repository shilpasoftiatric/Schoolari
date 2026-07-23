import { calculateWorkflowStates } from "./state-engine";
import { generatePrioritiesAndGoals } from "./priority-engine";
import { generateWeeklyGoals } from "./goal-engine";
import { generateUpcomingDeadlines } from "./deadline-engine";
import { isDashboardStateEqual } from "./cache-engine";

export { calculateWorkflowStates } from "./state-engine";
export { generatePrioritiesAndGoals } from "./priority-engine";
export { generateWeeklyGoals } from "./goal-engine";
export { generateUpcomingDeadlines } from "./deadline-engine";
export { isDashboardStateEqual, getTodayDateString } from "./cache-engine";
export { calculateOverallProgress, getNextMilestone, getMotivationalMessage } from "./progress-engine";

export function compileDashboard(dbData: {
  documents: any[];
  essays: any[];
  savedColleges: any[];
  applications: any[];
  resume: any;
  profile: any;
  completedActionItems?: any[];
}) {
  const states = calculateWorkflowStates(dbData);
  
  // 1. Generate sorted Today's Priorities
  const allPriorities = generatePrioritiesAndGoals(states, dbData);
  
  // 2. Generate Weekly goals
  const weeklyGoals = generateWeeklyGoals(states);
  
  // Distribute Earn While You Learn Action Items
  const actionItems = dbData.completedActionItems || [];
  if (actionItems.length > 0) {
    // Force the first action item into Today's Priorities as the #1 urgent task
    allPriorities.unshift({
      title: actionItems[0].title,
      category: 'income' as any,
      done: false,
      score: 200
    });

    // Send any remaining action items to This Week's Goals
    if (actionItems.length > 1) {
      const rest = actionItems.slice(1).map(a => a.title);
      weeklyGoals.scholarships = [...rest, ...weeklyGoals.scholarships];
    }
  }
  
  // 3. Generate Deadlines
  const deadlines = generateUpcomingDeadlines(dbData);

  // 4. Distribute Today's priorities
  const scholarshipsTasks = allPriorities
    .filter(t => t.category === "scholarships" || t.category === "resume" || (t.category as any) === "income")
    .slice(0, 3)
    .map(t => ({ title: t.title, done: t.done }));

  const essaysTasks = allPriorities
    .filter(t => t.category === "essays")
    .slice(0, 3)
    .map(t => ({ title: t.title, done: t.done }));

  const collegesTasks = allPriorities
    .filter(t => t.category === "colleges")
    .slice(0, 3)
    .map(t => ({ title: t.title, done: t.done }));

  return {
    _state: {
      ...states,
      firstName: dbData.profile.student_first_name || "",
      completedActionItemsCount: actionItems.length
    },
    scholarships: {
      tasks: scholarshipsTasks,
      deadlines: deadlines.scholarships,
      goals: weeklyGoals.scholarships
    },
    essays: {
      tasks: essaysTasks,
      deadlines: deadlines.essays,
      goals: weeklyGoals.essays
    },
    colleges: {
      tasks: collegesTasks,
      deadlines: deadlines.colleges,
      goals: weeklyGoals.colleges
    }
  };
}
