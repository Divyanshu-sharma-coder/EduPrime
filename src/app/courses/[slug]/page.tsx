import { notFound } from "next/navigation";
import { CourseDetailPage } from "@/components/public-pages";
import { courses } from "@/data/courses";

export function generateStaticParams() {
  return courses.map((course) => ({ slug: course.slug }));
}

export default async function CourseRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = courses.find((item) => item.slug === slug);
  if (!course) notFound();
  return <CourseDetailPage course={course} />;
}
