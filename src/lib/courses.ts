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
  const withoutUnsafeBlocks = value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|form|svg|math)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|svg|math)[^>]*\/?>/gi, "");

  return withoutUnsafeBlocks.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (tag, name: string, attributes: string) => {
    const normalizedName = name.toLowerCase();
    const allowedTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "strong", "b", "em", "i", "ul", "ol", "li", "br", "a"];
    if (!allowedTags.includes(normalizedName)) return "";
    if (tag.startsWith("</")) return `</${normalizedName}>`;
    if (normalizedName !== "a") return `<${normalizedName}>`;

    const hrefMatch = attributes.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    const href = hrefMatch?.[1] ?? "";
    if (!/^(https?:|mailto:|\/|#)/i.test(href) || /^javascript:/i.test(href)) return "<a>";
    return `<a href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">`;
  });
}
