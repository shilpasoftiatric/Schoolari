import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import MobileNav from "./MobileNav";
import NotificationsDropdown from "./NotificationsDropdown";
import { getPlanFromPriceId } from "@/lib/subscription";
import { getStudentDashboardData } from "@/services/data-fetcher";

export default async function Topbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch profile and notifications
  const [dbData, notificationsRes] = await Promise.all([
    user ? getStudentDashboardData(user.id) : Promise.resolve(null),
    user ? supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10) : Promise.resolve({ data: [] })
  ]);

  const userProfile = dbData?.userProfile;
  const masterProfile = dbData?.profile;
  const notifications = (notificationsRes.data || []) as any[];

  const isParent = userProfile?.account_type === "parent" || user?.user_metadata?.account_type === "parent";

  let displayName = "";
  if (isParent) {
    const parentFirst =
      userProfile?.parent_first_name?.trim() ||
      masterProfile?.parent_first_name?.trim() ||
      userProfile?.first_name?.trim() ||
      user?.user_metadata?.parent_first_name?.trim() ||
      user?.user_metadata?.first_name?.trim() ||
      "";

    const parentLast =
      userProfile?.parent_last_name?.trim() ||
      masterProfile?.parent_last_name?.trim() ||
      user?.user_metadata?.parent_last_name?.trim() ||
      user?.user_metadata?.last_name?.trim() ||
      "";

    const fullParentName = [parentFirst, parentLast].filter(Boolean).join(" ");
    displayName = fullParentName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Parent";
  } else {
    const studentFirst =
      userProfile?.student_first_name?.trim() ||
      masterProfile?.student_first_name?.trim() ||
      userProfile?.first_name?.trim() ||
      user?.user_metadata?.student_first_name?.trim() ||
      user?.user_metadata?.first_name?.trim() ||
      "";

    const studentLast =
      userProfile?.student_last_name?.trim() ||
      masterProfile?.student_last_name?.trim() ||
      user?.user_metadata?.student_last_name?.trim() ||
      user?.user_metadata?.last_name?.trim() ||
      "";

    const fullStudentName = [studentFirst, studentLast].filter(Boolean).join(" ");
    displayName = fullStudentName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
  }

  const initial = displayName.charAt(0).toUpperCase();
  const plan = getPlanFromPriceId(userProfile?.stripe_price_id ?? masterProfile?.stripe_price_id ?? null);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-border shrink-0 print:hidden">

      <div className="flex items-center gap-4">
        {/* Mobile Navigation Toggle */}
        <MobileNav plan={plan} siteName="Schoolari" />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications Dropdown */}
        <NotificationsDropdown initialNotifications={notifications} />

        {/* User + Sign Out */}
        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{displayName}</p>
            <p className="text-xs text-slate-500 leading-tight">{user?.email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
