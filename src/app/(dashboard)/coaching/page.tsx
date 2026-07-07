import { getCoachingMessages } from "@/app/actions/coaching";
import { CoachingDashboard } from "./CoachingDashboard";

export const metadata = {
  title: "Schoolari — Coaching Center",
};

export default async function CoachingPage() {
  const messages = await getCoachingMessages();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <CoachingDashboard initialMessages={messages || []} />
    </div>
  );
}
