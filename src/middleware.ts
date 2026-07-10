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

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup" || pathname === "/admin/login")) {
    const url = request.nextUrl.clone();
    if (!pathname.startsWith("/admin")) {
      url.pathname = "/dashboard";
    } else {
      url.pathname = "/admin/dashboard";
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
