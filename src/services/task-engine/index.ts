import { calculateWorkflowStates } from "./state-engine";
import { generatePrioritiesAndGoals } from "./priority-engine";
import { generateWeeklyGoals } from "./goal-engine";
import { generateUpcomingDeadlines } from "./deadline-engine";
import { isDashboardStateEqual } from "./cache-engine";

export { calculateWorkflowStates } from "./state-engine";
export { generatePrioritiesAndGoals } from "./priority-engine";
export { generateWeeklyGoals } from "./goal-engine";
export { generateUpcomingDeadlines } from "./deadline-engine";
export { isDashboardStateEqual } from "./cache-engine";
export { calculateOverallProgress, getNextMilestone, getMotivationalMessage } from "./progress-engine";

export function compileDashboard(dbData: {
  documents: any[];
  essays: any[];
  savedColleges: any[];
  applications: any[];
  resume: any;
  profile: any;
}) {
  const states = calculateWorkflowStates(dbData);
  
  // 1. Generate sorted Today's Priorities
  const allPriorities = generatePrioritiesAndGoals(states, dbData);
  
  // 2. Generate Weekly goals
  const weeklyGoals = generateWeeklyGoals(states);
  
  // 3. Generate Deadlines
  const deadlines = generateUpcomingDeadlines(dbData);

  // 4. Distribute Today's priorities
  const scholarshipsTasks = allPriorities
    .filter(t => t.category === "scholarships" || t.category === "resume") // include resume tasks under scholarships checklist for space
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
      firstName: dbData.profile.first_name || ""
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
