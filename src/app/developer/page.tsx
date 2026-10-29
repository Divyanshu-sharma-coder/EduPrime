import Link from "next/link";
import { Activity, ArrowRight, BookOpen, ShieldCheck, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/authorization";
import { EmergencyControls } from "@/components/emergency-controls";

export const instant = false;

export default async function DeveloperPage({ searchParams }: { searchParams: Promise<{ emergency?: string }> }) {
  const { supabase } = await requireRole("developer");
  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("role");
  const { count: courseCount, error: coursesError } = await supabase.from("courses").select("id", { count: "exact", head: true });
  const { count: publishedCourseCount, error: publishedError } = await supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "published");
  const { data: setting, error: settingsError } = await supabase.from("platform_settings").select("emergency_lock").eq("id", true).single();
  if (profilesError || coursesError || publishedError || settingsError) throw new Error("Unable to load developer platform status.");
  const counts = (profiles ?? []).reduce((result, profile) => ({ ...result, [profile.role]: (result[profile.role as keyof typeof result] ?? 0) + 1 }), { student: 0, teacher: 0, admin: 0, developer: 0 });
  const params = await searchParams;
  const initialMode = params.emergency === "lock" || params.emergency === "unlock" ? params.emergency : undefined;

  return <div className="control-page"><header className="control-header"><div><span className="section-kicker">Developer control</span><h1>Platform command center.</h1><p>Developer-only controls stay server-authorized and are never granted by the shortcut alone.</p></div><ShieldCheck size={38} /></header><section className="control-stats"><div><Users size={18} /><span>Students</span><strong>{counts.student}</strong></div><div><Users size={18} /><span>Teachers</span><strong>{counts.teacher}</strong></div><div><Users size={18} /><span>Admins</span><strong>{counts.admin}</strong></div><div><BookOpen size={18} /><span>Courses</span><strong>{courseCount ?? 0}</strong></div><div><Activity size={18} /><span>Published</span><strong>{publishedCourseCount ?? 0}</strong></div></section><EmergencyControls locked={setting?.emergency_lock ?? false} initialMode={initialMode} /><section className="control-links"><Link href="/admin"><Users size={18} /><span><strong>Admin panel</strong><small>Manage users and teacher access</small></span><ArrowRight size={17} /></Link><Link href="/teacher"><BookOpen size={18} /><span><strong>Teacher panel</strong><small>Manage courses and lessons</small></span><ArrowRight size={17} /></Link></section></div>;
}
