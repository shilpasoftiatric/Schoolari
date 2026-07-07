import { getProfile } from "@/app/actions/profile";
import { getResume } from "@/app/actions/career";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CareerDashboard } from "./CareerDashboard";

export const metadata = {
  title: "Schoolari — Career Center",
};

export default async function CareerPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  // Fetch the builder resume data
  const resume = await getResume();
  
  // Fetch uploaded resumes from the vault
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user?.id)
    .eq("type", "resume")
    .order("created_at", { ascending: false });

  const uploadedResumes = documents || [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto h-full flex flex-col">
      <CareerDashboard 
        initialInterests={profile.career_interests || []} 
        initialResumeData={resume?.content || null}
        uploadedResumes={uploadedResumes}
      />
    </div>
  );
}
