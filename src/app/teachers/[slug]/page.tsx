import { notFound } from "next/navigation";
import { TeacherDetailPage } from "@/components/public-pages";
import { courses } from "@/data/courses";

export function generateStaticParams() {
  return [...new Set(courses.map((course) => ({ slug: course.teacher.toLowerCase().replaceAll(" ", "-") })))];
}

export default async function TeacherRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!courses.some((course) => course.teacher.toLowerCase().replaceAll(" ", "-") === slug)) notFound();
  return <TeacherDetailPage teacher={slug} />;
}
