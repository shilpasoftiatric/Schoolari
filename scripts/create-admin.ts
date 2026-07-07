import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = "admin@gmail.com";
const adminPassword = "Admin@123";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

// We MUST use the service role key to bypass RLS and use auth.admin methods
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdmin() {
  console.log(`Setting up admin account for: ${adminEmail}`);

  // 1. Try to create the user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true, // Auto confirm so they can login immediately
  });

  let userId = authData?.user?.id;

  if (authError) {
    if (authError.message.includes("already registered")) {
      console.log("User already exists in Auth. Updating their profile to admin...");
      
      // Find the existing user's ID
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existingUser = users.find(u => u.email === adminEmail);
      
      if (existingUser) {
        userId = existingUser.id;
        
        // Ensure the password is updated if they changed it in the env file
        await supabase.auth.admin.updateUserById(userId, { password: adminPassword });
      }
    } else {
      console.error("Error creating auth user:", authError.message);
      return;
    }
  }

  if (userId) {
    // 2. Set the role to 'admin' in our custom profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "admin", first_name: "Admin" })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile role:", profileError.message);
    } else {
      console.log("✅ Success! You can now log in at /admin/login using these credentials.");
    }
  }
}

createAdmin();
