import { WorkflowStates } from "./workflow-rules";

export function isDashboardStateEqual(
  currentState: WorkflowStates & { firstName: string },
  cachedState: any
): boolean {
  if (!cachedState) return false;

  return (
    currentState.transcript === cachedState.transcript &&
    currentState.essay === cachedState.essay &&
    currentState.scholarship === cachedState.scholarship &&
    currentState.college === cachedState.college &&
    currentState.resume === cachedState.resume &&
    currentState.firstName === cachedState.firstName
  );
}
