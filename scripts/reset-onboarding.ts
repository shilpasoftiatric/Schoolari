import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetOnboarding() {
  const { data, error } = await supabase
    .from("profiles")
    .update({ onboarding_complete: false, onboarding_step: 1 })
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Match all

  if (error) {
    console.error("Error resetting:", error);
  } else {
    console.log("Successfully reset onboarding_complete to false for all users!");
  }
}

resetOnboarding();
