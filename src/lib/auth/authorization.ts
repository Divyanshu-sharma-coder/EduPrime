import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PlatformRole = "developer" | "admin" | "teacher" | "student";

const roleRank: Record<PlatformRole, number> = {
  student: 0,
  teacher: 1,
  admin: 2,
  developer: 3,
};

export async function requireRole(minimumRole: PlatformRole) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/" + minimumRole)}`);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile || !(profile.role in roleRank) || roleRank[profile.role as PlatformRole] < roleRank[minimumRole]) {
    redirect("/dashboard");
  }

  return { supabase, user, role: profile.role as PlatformRole };
}

export async function getAuthorizationContext() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { supabase, error: "You must be signed in." as const };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile || !(profile.role in roleRank)) {
    return { supabase, error: "Unable to verify your permissions." as const };
  }

  return { supabase, user, role: profile.role as PlatformRole };
}

export async function requireServerRoles(allowedRoles: readonly PlatformRole[]) {
  const context = await getAuthorizationContext();
  if ("error" in context) return context;
  if (!allowedRoles.includes(context.role)) {
    return { supabase: context.supabase, error: "You do not have permission to perform this action." as const };
  }
  return context;
}
