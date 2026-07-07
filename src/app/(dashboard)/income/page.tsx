import { getIncomeGoals } from "@/app/actions/income";
import { IncomeDashboard } from "./IncomeDashboard";

export const metadata = {
  title: "Schoolari — Income Center",
};

export default async function IncomePage() {
  const goals = await getIncomeGoals();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto h-full flex flex-col">
      <IncomeDashboard initialGoals={goals || []} />
    </div>
  );
}
