import { CoursesPage } from "@/components/public-pages";
import { createClient } from "@/lib/supabase/server";
import type { CatalogCourse } from "@/lib/courses";

export const instant = false;

export default async function CoursesRoute() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("published_course_catalog")
    .select("id, slug, title, short_description, description, thumbnail, price, level, language, category_id, teacher_id, teacher_name, status")
    .order("created_at", { ascending: false });

  if (error) {
    return <CoursesPage courses={[]} loadError="Courses are temporarily unavailable. Please try again soon." />;
  }

  return <CoursesPage courses={(data ?? []).map((course) => ({ ...course, price: Number(course.price) })) as CatalogCourse[]} />;
}
