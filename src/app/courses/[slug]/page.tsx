import { notFound } from "next/navigation";
import { CourseDetailPage } from "@/components/public-pages";
import { createClient } from "@/lib/supabase/server";
import type { CatalogCourse } from "@/lib/courses";

export const instant = false;

export default async function CourseRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const query = supabase
    .from("courses")
    .select("id, slug, title, short_description, description, thumbnail, price, level, language, category_id, teacher_id, status, modules(id, title, position, lessons(id, title, position))")
    .eq("slug", slug)
    .maybeSingle();
  const { data: course, error } = await query;
  if (error || !course) notFound();

  if (course.status !== "published") {
    if (!user) notFound();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (course.teacher_id !== user.id && !["admin", "developer"].includes(profile?.role ?? "")) notFound();
  }

  const { data: publicCourse } = await supabase
    .from("published_course_catalog")
    .select("teacher_name")
    .eq("slug", slug)
    .maybeSingle();
  const { data: teacher } = publicCourse ? { data: null } : await supabase.from("profiles").select("name").eq("id", course.teacher_id).maybeSingle();
  return <CourseDetailPage course={{
    ...course,
    price: Number(course.price),
    short_description: course.short_description || course.description,
    teacher_name: publicCourse?.teacher_name || teacher?.name || "EduPrime instructor",
    modules: (course.modules ?? []).map((module) => ({ ...module, lessons: module.lessons ?? [] })),
  } as CatalogCourse} />;
}
