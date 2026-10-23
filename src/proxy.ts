import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessAdmin } from "@/lib/rbac";

const SESSION_CACHE_COOKIE = "sch_session_ctx";
const CACHE_TTL_MS = 60_000; // 60 seconds fast-path cache for confirmed active subscribers

interface CachedSessionContext {
  uid: string;
  role: string;
  accountType: string;
  isActive: boolean;
  hasPaid: boolean;
  familyOnboardingComplete: boolean;
  cachedAt: number;
}

const HMAC_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "schoolari-proxy-hmac-secret";

// ── Cryptographic Signing & Verification (Zero-Trust Security) ────────────────
async function signSessionContext(data: CachedSessionContext, secret: string): Promise<string> {
  const json = JSON.stringify(data);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(json));
  const sigHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${encodeURIComponent(json)}.${sigHex}`;
}

async function verifySessionContext(
  cookieValue: string,
  secret: string
): Promise<CachedSessionContext | null> {
  try {
    const dotIndex = cookieValue.lastIndexOf(".");
    if (dotIndex === -1) return null;

    const rawJson = cookieValue.slice(0, dotIndex);
    const providedSig = cookieValue.slice(dotIndex + 1);
    const json = decodeURIComponent(rawJson);

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expectedBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(json));
    const expectedSig = Array.from(new Uint8Array(expectedBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSig !== providedSig) {
      return null;
    }

    const parsed = JSON.parse(json) as CachedSessionContext;
    return parsed;
  } catch {
    return null;
  }
}

// Reusable admin client across requests in the server runtime (avoids rebuild overhead)
let cachedAdminClient: ReturnType<typeof createServerClient> | null = null;
function getProxyAdminClient() {
  if (!cachedAdminClient) {
    cachedAdminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() { },
        },
      }
    );
  }
  return cachedAdminClient;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  const isLocalSubdomain = hostname.startsWith("admin.localhost") || hostname.startsWith("members.localhost");
  const isLocalhost = (hostname.includes("localhost") || hostname.includes("127.0.0.1") || hostname.includes("192.168.")) && !isLocalSubdomain;

  // ── 1. Subdomain & Hostname Routing ──────────────────────────────────────────
  if (!isLocalhost) {
    const isAdminDomain =
      hostname.startsWith("admin.schoolari.com") ||
      hostname.startsWith("admin.schoolari.vercel.app") ||
      hostname.startsWith("admin.localhost");

    const isMemberDomain =
      hostname.startsWith("members.schoolari.com") ||
      hostname.startsWith("members.schoolari.vercel.app") ||
      hostname.startsWith("members.localhost");

    if (isAdminDomain) {
      if (pathname === "/" || pathname === "/admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        return NextResponse.redirect(url);
      }

      if (!pathname.startsWith("/admin")) {
        const url = request.nextUrl.clone();
        url.hostname = isLocalSubdomain ? "members.localhost" : "members.schoolari.com";
        if (isLocalSubdomain) {
          url.port = request.nextUrl.port || "3000";
          url.protocol = request.nextUrl.protocol || "http:";
        } else {
          url.port = "";
          url.protocol = "https:";
        }
        return NextResponse.redirect(url);
      }
    }

    if (isMemberDomain && pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.hostname = isLocalSubdomain ? "admin.localhost" : "admin.schoolari.com";
      if (isLocalSubdomain) {
        url.port = request.nextUrl.port || "3000";
        url.protocol = request.nextUrl.protocol || "http:";
      } else {
        url.port = "";
        url.protocol = "https:";
      }
      if (pathname === "/admin") {
        url.pathname = "/admin/login";
      }
      return NextResponse.redirect(url);
    }
  }

  // ── 2. Supabase Auth Session Refresh & User Validation ──────────────────────
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

  // ── 3. Unauthenticated Access ───────────────────────────────────────────────
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
    return supabaseResponse;
  }

  // ── 4. Authenticated Session Expiration Check ───────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
    if (lastSignIn) {
      const lastSignInStr = lastSignIn.toISOString().split("T")[0];
      const todayStr = new Date().toISOString().split("T")[0];

      if (lastSignInStr !== todayStr) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    }
  }

  // ── 5. Protected Path Filter ────────────────────────────────────────────────
  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/signup";

  if (!isProtectedPath) {
    return supabaseResponse;
  }

  // ── 6. Fast-Path Session Context Cache (Edge & Security Hardened) ────────────
  // Immediately bypass cache if URL indicates a fresh checkout, code redemption, or reload
  const hasBypassParam =
    request.nextUrl.searchParams.has("session_id") ||
    request.nextUrl.searchParams.has("success") ||
    request.nextUrl.searchParams.has("refresh") ||
    request.nextUrl.searchParams.has("code_applied");

  let sessionCtx: CachedSessionContext | null = null;
  const rawCache = request.cookies.get(SESSION_CACHE_COOKIE)?.value;

  if (rawCache && !hasBypassParam) {
    const verified = await verifySessionContext(rawCache, HMAC_SECRET);
    const isCachedStaff = canAccessAdmin(verified?.role);
    // SAFEGUARD: Reuse fast-path cache for:
    // 1) Active staff/admin members
    // 2) Confirmed active student/parent subscribers who finished onboarding
    if (
      verified &&
      verified.uid === user.id &&
      verified.isActive === true &&
      (isCachedStaff || (verified.hasPaid === true && verified.familyOnboardingComplete === true)) &&
      Date.now() - verified.cachedAt < CACHE_TTL_MS
    ) {
      sessionCtx = verified;
    }
  }

  // ── 7. Cache Miss: Query Profile & Family Status Fresh ──────────────────────
  if (!sessionCtx) {
    const supabaseAdmin = getProxyAdminClient();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, account_type, role, is_active, subscription_status, onboarding_complete, linked_student_id, is_discount_user")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      // Self-heal profile fallback
      await supabaseAdmin.from("profiles").upsert(
        { id: user.id, account_type: "student" },
        { onConflict: "id" }
      );

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
      return supabaseResponse;
    }

    let hasPaid =
      profile.subscription_status === "active" ||
      profile.subscription_status === "trialing" ||
      Boolean(profile.is_discount_user);

    let familyOnboardingComplete = Boolean(profile.onboarding_complete);

    // Only query parent if student is NOT already active/paid
    if (!hasPaid && profile.account_type === "student") {
      let parentQuery = supabaseAdmin
        .from("profiles")
        .select("subscription_status")
        .eq("linked_student_id", user.id);

      let { data: parentProfile } = await parentQuery.maybeSingle();

      if (!parentProfile && user.email) {
        const { data: fallbackParent } = await supabaseAdmin
          .from("profiles")
          .select("subscription_status")
          .ilike("student_email", user.email)
          .maybeSingle();
        parentProfile = fallbackParent;
      }

      if (
        parentProfile &&
        (parentProfile.subscription_status === "active" ||
          parentProfile.subscription_status === "trialing")
      ) {
        hasPaid = true;
      }
    } else if (profile.account_type === "parent") {
      let studentProfile: {
        subscription_status?: string | null;
        onboarding_complete?: boolean | null;
      } | null = null;

      if (profile.linked_student_id) {
        const { data } = await supabaseAdmin
          .from("profiles")
          .select("subscription_status, onboarding_complete")
          .eq("id", profile.linked_student_id)
          .maybeSingle();
        studentProfile = data;
      } else if (user.email) {
        const { data } = await supabaseAdmin
          .from("profiles")
          .select("subscription_status, onboarding_complete")
          .ilike("parent_email", user.email)
          .maybeSingle();
        studentProfile = data;
      }

      if (studentProfile) {
        if (
          studentProfile.subscription_status === "active" ||
          studentProfile.subscription_status === "trialing"
        ) {
          hasPaid = true;
        }
        familyOnboardingComplete = Boolean(studentProfile.onboarding_complete);
      }
    }

    sessionCtx = {
      uid: user.id,
      role: profile.role || "",
      accountType: profile.account_type || "student",
      isActive: profile.is_active !== false,
      hasPaid,
      familyOnboardingComplete,
      cachedAt: Date.now(),
    };

    const isStaffUser = canAccessAdmin(sessionCtx.role);

    // SAFEGUARD: Cache positive states:
    // 1) Active staff/admin users
    // 2) Active student/parent subscribers who completed onboarding
    if (sessionCtx.isActive && (isStaffUser || (sessionCtx.hasPaid && sessionCtx.familyOnboardingComplete))) {
      const signedVal = await signSessionContext(sessionCtx, HMAC_SECRET);
      supabaseResponse.cookies.set(SESSION_CACHE_COOKIE, signedVal, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60,
      });
    } else {
      supabaseResponse.cookies.delete(SESSION_CACHE_COOKIE);
    }
  }

  // ── 8. Access Control & Redirection Rules ───────────────────────────────────
  // Account Suspension Check
  if (!sessionCtx.isActive) {
    await supabase.auth.signOut();
    supabaseResponse.cookies.delete(SESSION_CACHE_COOKIE);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "account_suspended");
    return NextResponse.redirect(url);
  }

  const isStaff = canAccessAdmin(sessionCtx.role);

  // Role-Based Authorization
  // Non-staff visiting /admin
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!isStaff) {
      const url = request.nextUrl.clone();
      if (!isLocalhost) {
        url.hostname = "members.schoolari.com";
        url.port = "";
        url.protocol = "https:";
      }
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Staff visiting student/parent routes
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/pricing")
  ) {
    if (isStaff) {
      const url = request.nextUrl.clone();
      if (!isLocalhost) {
        url.hostname = "admin.schoolari.com";
        url.port = "";
        url.protocol = "https:";
      }
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Student / Parent Subscription & Onboarding Enforcement
  if (!isStaff) {
    const { hasPaid, familyOnboardingComplete } = sessionCtx;

    // Unpaid users can only access pricing
    if (
      !hasPaid &&
      (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding"))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/pricing";
      return NextResponse.redirect(url);
    }

    // Paid but onboarding incomplete -> force onboarding
    if (
      hasPaid &&
      !familyOnboardingComplete &&
      pathname.startsWith("/dashboard")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    // Paid & onboarded -> skip onboarding/pricing directly to dashboard
    if (
      hasPaid &&
      familyOnboardingComplete &&
      (pathname.startsWith("/onboarding") || pathname.startsWith("/pricing"))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Auth page redirects for already logged in members
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

  // Admin login page redirect for already logged-in staff
  if (pathname === "/admin/login" && isStaff) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.ico|robots.txt|sitemap.xml|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|ico)$).*)",
  ],
};
