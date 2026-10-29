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

  if (error || !profile || roleRank[profile.role as PlatformRole] < roleRank[minimumRole]) {
    redirect("/dashboard");
  }

  return { supabase, user, role: profile.role as PlatformRole };
}
