export type CourseLesson = {
  id: string;
  title: string;
  position: number;
};

export type CourseModule = {
  id: string;
  title: string;
  position: number;
  lessons: CourseLesson[];
};

export type CatalogCourse = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  thumbnail: string | null;
  price: number;
  level: string;
  language: string;
  category_id: string | null;
  teacher_id: string;
  teacher_name: string;
  status: "draft" | "published" | "archived";
  modules?: CourseModule[];
};

export function getCourseThumbnailUrl(thumbnail: string | null) {
  if (!thumbnail) return null;
  if (thumbnail.startsWith("http://") || thumbnail.startsWith("https://")) return thumbnail;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return `${url}/storage/v1/object/public/course-thumbnails/${thumbnail.split("/").map(encodeURIComponent).join("/")}`;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "EP";
}

export function sanitizeCourseHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "");
}
