import { createClient } from "@/lib/supabase/server";
import { MessagesClient } from "./MessagesClient";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getUserPlan, canAccessFeature } from "@/lib/subscription-server";
import { LockedFeaturePage } from "@/components/ui/LockedFeaturePage";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const plan = await getUserPlan();
  if (!canAccessFeature(plan, "messages")) {
    return (
      <LockedFeaturePage
        featureName="Direct Messaging & Done-With-You Support"
        requiredPlan="elite"
        description="Message your coach directly and get personalized done-with-you support for applications, essays, and more — available on the Elite plan."
      />
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch student's profile to see if they're assigned a coach
  const { data: profile } = await supabase
    .from("profiles")
    .select("student_first_name, first_name")
    .eq("id", user.id)
    .single();

  const studentName = profile?.student_first_name || profile?.first_name || "Student";

  // Fetch messages between student and coach/admin
  const { data: messages } = await supabase
    .from("coaching_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true }); // chronological order for chat

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 relative -m-4 sm:-m-6 lg:-m-8">
      <div className="flex items-center px-6 py-4 bg-white border-b border-slate-200 shrink-0">
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center mr-4">
          <MessageSquare className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 leading-tight">Schoolari Coach</h1>
          <p className="text-xs text-slate-500">Usually replies within 24 hours</p>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 relative">
        <MessagesClient initialMessages={messages || []} studentName={studentName} />
      </div>
    </div>
  );
}

