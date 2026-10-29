import { redirect } from "next/navigation";
import { TeacherPanel } from "@/components/teacher-panel";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function TeacherPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Fteacher");
  }

  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, title, slug, description, price, level, language, category_id, status, modules(id, title, position, lessons(id, title, position))")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load teacher courses: ${error.message}`);
  }

  return <TeacherPanel initialCourses={courses ?? []} />;
}
