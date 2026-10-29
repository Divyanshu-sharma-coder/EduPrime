import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/learn", "/live", "/test"];

function isProtectedPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const requiresAuth = protectedPrefixes.some((prefix) => isProtectedPath(pathname, prefix));
  const requiresTeacher = isProtectedPath(pathname, "/teacher");
  const requiresAdmin = isProtectedPath(pathname, "/admin");
  const requiresDeveloper = isProtectedPath(pathname, "/developer");
  const isEmergencyPage = pathname === "/emergency";
  const isAuthPath = pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password" || pathname.startsWith("/auth/");

  if (!isEmergencyPage) {
    const { data: platformSettings, error: settingsError } = await supabase
      .from("platform_settings")
      .select("emergency_lock")
      .eq("id", true)
      .maybeSingle();

    if (settingsError) throw new Error(`Unable to read platform status: ${settingsError.message}`);
    if (platformSettings?.emergency_lock && !isAuthPath) {
      if (!user) return NextResponse.redirect(new URL("/emergency", request.url));

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "developer") return NextResponse.redirect(new URL("/emergency", request.url));
    }
  }

  if (!requiresAuth && !requiresTeacher && !requiresAdmin && !requiresDeveloper) {
    return response;
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (requiresTeacher || requiresAdmin || requiresDeveloper) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !profile || (requiresDeveloper && profile.role !== "developer") || (requiresAdmin && !["admin", "developer"].includes(profile.role)) || (requiresTeacher && !["teacher", "admin", "developer"].includes(profile.role))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
