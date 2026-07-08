import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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

  const { pathname } = request.nextUrl;

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
  }

  // Enforce Paywall for authenticated users
  if (user && !pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    const isActive = profile?.subscription_status === "active" || profile?.subscription_status === "trialing";

    // If they are not active, they can ONLY access /pricing (and auth callback)
    if (!isActive && (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding"))) {
      const url = request.nextUrl.clone();
      url.pathname = "/pricing";
      return NextResponse.redirect(url);
    }

    // If they are active and try to access /pricing, send them to onboarding or dashboard
    if (isActive && pathname.startsWith("/pricing")) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding"; // They will be routed to dashboard from onboarding if complete
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup" || pathname === "/admin/login")) {
    const url = request.nextUrl.clone();
    // Instead of always /dashboard, check if they are active
    if (!pathname.startsWith("/admin")) {
      url.pathname = "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
