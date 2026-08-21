import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessAdmin } from "@/lib/rbac";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1") || hostname.includes("192.168.");

  if (!isLocalhost) {
    const isAdminDomain = hostname === "admin.schoolari.com" || hostname === "admin.schoolari.vercel.app";
    const isMemberDomain = hostname === "members.schoolari.com" || hostname === "members.schoolari.vercel.app";

    if (isAdminDomain && !pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.hostname = "members.schoolari.com";
      url.port = "";
      url.protocol = "https:";
      return NextResponse.redirect(url);
    }

    if (isMemberDomain && pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.hostname = "admin.schoolari.com";
      url.port = "";
      url.protocol = "https:";
      if (pathname === "/admin") {
        url.pathname = "/admin/login";
      }
      return NextResponse.redirect(url);
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect dashboard, onboarding, and admin routes
  if (!user) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding") || pathname.startsWith("/pricing")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  } else if (pathname.startsWith("/dashboard")) {
    // Session Expiration Policy: 
    // Ensure the session was initiated on the CURRENT calendar day (UTC).
    // If last_sign_in_at is not today, the session is invalid for the new day.
    const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
    const today = new Date();
    
    if (lastSignIn) {
      const lastSignInStr = lastSignIn.toISOString().split("T")[0];
      const todayStr = today.toISOString().split("T")[0];
      
      if (lastSignInStr !== todayStr) {
        // Session has crossed into a new calendar day. Force re-authentication.
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    }
  }

  if (user) {
    // Check if account is suspended
    // We can query the profile to check both is_active and role
    // Only query profile for protected paths or auth pages
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/admin") ||
      pathname === "/login" ||
      pathname === "/signup"
    ) {
      // Create an admin client to bypass RLS and cache issues
      const supabaseAdmin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() { return []; },
            setAll() {},
          },
          global: {
            fetch: (url, options) => {
              const headers = new Headers(options?.headers);
              headers.set('x-middleware-cache-buster', Date.now().toString());
              return fetch(url, { ...options, headers, cache: 'no-store' });
            }
          }
        }
      );

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, account_type, role, is_active, subscription_status, onboarding_complete, linked_student_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        // Account Suspension Check
        if (profile.is_active === false) {
          await supabase.auth.signOut();
          const url = request.nextUrl.clone();
          url.pathname = "/login";
          url.searchParams.set("error", "account_suspended");
          return NextResponse.redirect(url);
        }

        // Role-Based Authorization
        // Non-staff visiting /admin
        if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
          if (!canAccessAdmin(profile.role)) {
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard";
            return NextResponse.redirect(url);
          }
        }

        // Staff visiting student/parent routes
        if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding") || pathname.startsWith("/pricing")) {
          if (canAccessAdmin(profile.role)) {
            const url = request.nextUrl.clone();
            url.pathname = "/admin/dashboard";
            return NextResponse.redirect(url);
          }
        }

        // Handle normal student/parent subscription checks and onboarding redirects
        if (
          pathname.startsWith("/dashboard") ||
          pathname.startsWith("/onboarding") ||
          pathname.startsWith("/pricing") ||
          pathname === "/login" ||
          pathname === "/signup"
        ) {
          // Skip these checks for staff users since they are handled above
          if (!canAccessAdmin(profile.role)) {
            let familySubscriptionStatus = profile.subscription_status;
            let familyOnboardingComplete = profile.onboarding_complete;

            // If the user is a student, see if their parent paid
            if (profile.account_type === 'student') {
              // 1. Try to find parent by linked_student_id
              let { data: parentProfile } = await supabaseAdmin
                .from("profiles")
                .select("subscription_status")
                .eq("linked_student_id", user.id)
                .maybeSingle();
                
              // 2. Fallback: Find parent by student_email
              if (!parentProfile) {
                const { data: fallbackParent } = await supabaseAdmin
                  .from("profiles")
                  .select("subscription_status")
                  .eq("student_email", user.email)
                  .maybeSingle();
                parentProfile = fallbackParent;
              }
                
              if (parentProfile && (parentProfile.subscription_status === 'active' || parentProfile.subscription_status === 'trialing')) {
                familySubscriptionStatus = parentProfile.subscription_status;
              }
            } 
            // If the user is a parent, the master onboarding state is on the student's profile
            else if (profile.account_type === 'parent') {
              let studentProfile = null;
              
              if (profile.linked_student_id) {
                const { data } = await supabaseAdmin
                  .from("profiles")
                  .select("subscription_status, onboarding_complete")
                  .eq("id", profile.linked_student_id)
                  .maybeSingle();
                studentProfile = data;
              }
              
              // Fallback: Find student by parent_email
              if (!studentProfile) {
                const { data } = await supabaseAdmin
                  .from("profiles")
                  .select("subscription_status, onboarding_complete")
                  .eq("parent_email", user.email)
                  .maybeSingle();
                studentProfile = data;
              }

              if (studentProfile) {
                if (studentProfile.subscription_status === 'active' || studentProfile.subscription_status === 'trialing') {
                  familySubscriptionStatus = studentProfile.subscription_status;
                }
                familyOnboardingComplete = studentProfile.onboarding_complete;
              }
            }

            const hasPaid = familySubscriptionStatus === "active" || familySubscriptionStatus === "trialing";

            // If they haven't paid, they can only access pricing
            if (!hasPaid && (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding"))) {
              const url = request.nextUrl.clone();
              url.pathname = "/pricing";
              return NextResponse.redirect(url);
            }

            // If they paid but haven't onboarded, force onboarding
            if (hasPaid && !familyOnboardingComplete && pathname.startsWith("/dashboard")) {
              const url = request.nextUrl.clone();
              url.pathname = "/onboarding";
              return NextResponse.redirect(url);
            }

            // If they finished onboarding, send them to dashboard instead of pricing/onboarding
            if (hasPaid && familyOnboardingComplete && (pathname.startsWith("/onboarding") || pathname.startsWith("/pricing"))) {
              const url = request.nextUrl.clone();
              url.pathname = "/dashboard";
              return NextResponse.redirect(url);
            }

            // Handle login/signup redirects
            if (pathname === "/login" || pathname === "/signup") {
              const url = request.nextUrl.clone();
              if (!hasPaid) {
                url.pathname = "/pricing";
              } else if (!familyOnboardingComplete) {
                url.pathname = "/onboarding";
              } else {
                url.pathname = "/dashboard";
              }
              return NextResponse.redirect(url);
            }
          }
        }
      } else {
        const { error: healError } = await supabaseAdmin.from("profiles").upsert({
          id: user.id,
          account_type: 'student', // default fallback
        }, { onConflict: 'id' });

        if (
          pathname.startsWith("/dashboard") || 
          pathname.startsWith("/onboarding") ||
          pathname === "/login" || 
          pathname === "/signup"
        ) {
          const url = request.nextUrl.clone();
          url.pathname = "/pricing";
          return NextResponse.redirect(url);
        }
      }
    }

    if (pathname === "/admin/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
