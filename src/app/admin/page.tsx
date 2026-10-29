import { Users } from "lucide-react";
import { requireRole } from "@/lib/auth/authorization";
import { UserRoleManager } from "@/components/user-role-manager";

export const instant = false;

export default async function AdminPage() {
  const { supabase } = await requireRole("admin");
  const { data: profiles, error } = await supabase.from("profiles").select("id, name, role").order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load users: ${error.message}`);
  const { data: activity, error: activityError } = await supabase.from("platform_activity").select("id, action, created_at, details").order("created_at", { ascending: false }).limit(12);
  if (activityError) throw new Error(`Unable to load platform activity: ${activityError.message}`);

  const users = (profiles ?? []).map((profile) => ({ ...profile, role: profile.role as "developer" | "admin" | "teacher" | "student", email: `User ID: ${profile.id}` }));

  return <div className="control-page"><header className="control-header"><div><span className="section-kicker">Admin workspace</span><h1>Keep the learning platform healthy.</h1><p>Manage people and the content they are trusted to manage.</p></div><Users size={36} /></header><UserRoleManager users={users} /><section className="control-card activity-card"><div className="control-card-heading"><div><span className="section-kicker">Audit trail</span><h2>Recent platform activity</h2></div></div>{(activity ?? []).length === 0 ? <p>No activity recorded yet.</p> : <div className="activity-list">{(activity ?? []).map((item) => <div className="activity-row" key={item.id}><strong>{item.action.replaceAll("_", " ")}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></div>)}</div>}</section></div>;
}
