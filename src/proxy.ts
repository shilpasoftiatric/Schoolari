import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
    // Only query profile for protected paths or auth pages
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/pricing") ||
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
        }
      );

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, account_type, subscription_status, onboarding_complete, linked_student_id")
        .eq("id", user.id)
        .single();

        console.log(`[Middleware] Fetched profile for ${user.id}:`, profile);

        if (profile) {
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
          console.log(`[Middleware] ${user.id} -> hasPaid: ${hasPaid}, familySub: ${familySubscriptionStatus}, onboarding: ${familyOnboardingComplete}`);

          // If they haven't paid, they can only access pricing
          if (!hasPaid && (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding"))) {
            console.log(`[Middleware] Redirecting ${user.id} to /pricing`);
            const url = request.nextUrl.clone();
            url.pathname = "/pricing";
            return NextResponse.redirect(url);
          }

          // If they paid but haven't onboarded, force onboarding
          if (hasPaid && !familyOnboardingComplete && pathname.startsWith("/dashboard")) {
            console.log(`[Middleware] Redirecting ${user.id} to /onboarding`);
            const url = request.nextUrl.clone();
            url.pathname = "/onboarding";
            return NextResponse.redirect(url);
          }

          // If they finished onboarding, send them to dashboard instead of pricing/onboarding
          if (hasPaid && familyOnboardingComplete && (pathname.startsWith("/onboarding") || pathname.startsWith("/pricing"))) {
            console.log(`[Middleware] Redirecting ${user.id} to /dashboard`);
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
      } else {
        console.log(`[Middleware] Profile missing for ${user.id}. Creating default profile...`);
        
        // Auto-heal by creating the profile if it doesn't exist
        const supabaseAdmin = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            cookies: {
              getAll() { return []; },
              setAll() {},
            },
          }
        );
        
        const { error: healError } = await supabaseAdmin.from("profiles").upsert({
          id: user.id,
          account_type: 'student', // default fallback
        }, { onConflict: 'id' });

        if (healError) {
          console.error(`[Middleware] FATAL: Failed to auto-heal profile for ${user.id}:`, healError);
        } else {
          console.log(`[Middleware] Successfully auto-healed profile for ${user.id}`);
        }

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
