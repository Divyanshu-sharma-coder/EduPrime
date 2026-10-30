import { TeacherPanel } from "@/components/teacher-panel";
import { requireRole } from "@/lib/auth/authorization";

export const instant = false;

export default async function TeacherPage() {
  const { supabase, user, role } = await requireRole("teacher");

  let coursesQuery = supabase
    .from("courses")
    .select("id, title, slug, short_description, description, thumbnail, price, level, language, category_id, status, modules(id, title, position, lessons(id, title, position))");
  if (role === "teacher") coursesQuery = coursesQuery.eq("teacher_id", user.id);
  const { data: courses, error } = await coursesQuery.order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load teacher courses: ${error.message}`);
  }

  return <TeacherPanel initialCourses={courses ?? []} />;
}
