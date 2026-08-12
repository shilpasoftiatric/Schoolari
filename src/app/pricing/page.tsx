export const dynamic = 'force-dynamic';
import { Suspense } from "react";
import PricingClient from "./PricingClient";
import { createClient } from "@/lib/supabase/server";

async function getHasHadTrial(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();
    
  return !!profile?.subscription_status;
}

export default async function PricingPage() {
  const hasHadTrial = await getHasHadTrial();

  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8 text-slate-500">Loading pricing options...</div>}>
      <PricingClient hasHadTrial={hasHadTrial} />
    </Suspense>
  );
}
