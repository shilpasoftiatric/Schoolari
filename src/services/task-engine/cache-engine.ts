import { WorkflowStates } from "./workflow-rules";

// Returns today's date as YYYY-MM-DD in local time
export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isDashboardStateEqual(
  currentState: WorkflowStates & { firstName: string, completedActionItemsCount?: number, lastGeneratedDate?: string },
  cachedState: any
): boolean {
  if (!cachedState) return false;

  const today = getTodayDateString();

  return (
    currentState.transcript === cachedState.transcript &&
    currentState.essay === cachedState.essay &&
    currentState.scholarship === cachedState.scholarship &&
    currentState.college === cachedState.college &&
    currentState.resume === cachedState.resume &&
    currentState.firstName === cachedState.firstName &&
    currentState.completedActionItemsCount === cachedState.completedActionItemsCount &&
    // Cache expires at midnight — forces fresh AI call once per day for task rotation
    cachedState.lastGeneratedDate === today
  );
}
