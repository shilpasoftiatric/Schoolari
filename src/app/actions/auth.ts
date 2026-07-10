"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("first_name") as string;
  const phone = formData.get("phone") as string;
  const accountType = (formData.get("account_type") as string) || "student";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: {
        first_name: firstName,
        phone,
        account_type: accountType,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Update the profile with extra fields (profile row is auto-created by trigger)
  if (data.user) {
    await supabase
      .from("profiles")
      .update({ first_name: firstName, phone, account_type: accountType as "student" | "parent" })
      .eq("id", data.user.id);
  }

  return { success: true, message: "Check your email to confirm your account!" };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const isAdminLogin = formData.get("isAdminLogin") === "true";

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    // If this is an admin login attempt, verify their role
    if (isAdminLogin) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role !== "admin") {
        // Not an admin, sign them out and throw error
        await supabase.auth.signOut();
        return { error: "Access denied. You do not have administrator privileges." };
      }
      
      redirect("/admin/dashboard");
    }

    // Daily Login Streak Logic for normal users
    if (!isAdminLogin) {
      const todayUtc = new Date().toISOString().split("T")[0];
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak, last_login_date")
        .eq("id", data.user.id)
        .single();

      if (profile) {
        let { current_streak = 0, longest_streak = 0, last_login_date } = profile;
        // Default to 0 if null
        current_streak = current_streak || 0;
        longest_streak = longest_streak || 0;

        if (last_login_date !== todayUtc) {
          const yesterday = new Date();
          yesterday.setUTCDate(yesterday.getUTCDate() - 1);
          const yesterdayUtc = yesterday.toISOString().split("T")[0];

          if (last_login_date === yesterdayUtc) {
            current_streak += 1;
          } else {
            current_streak = 1; // Reset streak if missed a day, or first login
          }

          if (current_streak > longest_streak) {
            longest_streak = current_streak;
          }

          // Update the database
          await supabase.from("profiles").update({ 
            current_streak, 
            longest_streak, 
            last_login_date: todayUtc 
          }).eq("id", data.user.id);
        }
      }
    }
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
