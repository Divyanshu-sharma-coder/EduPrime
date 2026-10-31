import Link from "next/link";
import { Activity, ArrowRight, BookOpen, Search, ShieldCheck, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/authorization";
import { EmergencyControls } from "@/components/emergency-controls";

export const instant = false;

type DeveloperSearchParams = {
  emergency?: string;
  q?: string;
  course?: string;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function videoStatusLabel(status: string | null) {
  return status ?? "No video";
}

export default async function DeveloperPage({ searchParams }: { searchParams: Promise<DeveloperSearchParams> }) {
  const { supabase } = await requireRole("developer");
  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("role");
  const { count: courseCount, error: coursesError } = await supabase.from("courses").select("id", { count: "exact", head: true });
  const { count: publishedCourseCount, error: publishedError } = await supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "published");
  const { data: setting, error: settingsError } = await supabase.from("platform_settings").select("emergency_lock").eq("id", true).single();
  if (profilesError || coursesError || publishedError || settingsError) throw new Error("Unable to load developer platform status.");
  const counts = (profiles ?? []).reduce((result, profile) => ({ ...result, [profile.role]: (result[profile.role as keyof typeof result] ?? 0) + 1 }), { student: 0, teacher: 0, admin: 0, developer: 0 });
  const params = await searchParams;
  const initialMode = params.emergency === "lock" || params.emergency === "unlock" ? params.emergency : undefined;
  const search = params.q?.trim() ?? "";
  let coursesQuery = supabase
    .from("courses")
    .select("id, title, slug, status, teacher_id, modules(id, lessons(id, video_status))")
    .order("created_at", { ascending: false })
    .limit(50);
  if (search) coursesQuery = coursesQuery.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  const { data: courses, error: courseListError } = await coursesQuery;
  if (courseListError) throw new Error("Unable to load courses for inspection.");

  const selectedCourseId = params.course;
  const { data: selectedCourse, error: selectedCourseError } = selectedCourseId
    ? await supabase
      .from("courses")
      .select("id, title, slug, description, status, teacher_id, created_at, updated_at, modules(id, title, position, lessons(id, title, position, is_preview, mux_upload_id, mux_asset_id, mux_playback_id, video_status, video_error, video_ready_at))")
      .eq("id", selectedCourseId)
      .maybeSingle()
    : { data: null, error: null };
  if (selectedCourseError) throw new Error("Unable to load the selected course.");

  const teacherIds = [...new Set((courses ?? []).map((course) => course.teacher_id).concat(selectedCourse?.teacher_id ?? []))];
  const { data: teachers, error: teachersError } = teacherIds.length
    ? await supabase.from("profiles").select("id, name").in("id", teacherIds)
    : { data: [], error: null };
  if (teachersError) throw new Error("Unable to load course owners.");
  const teacherNames = new Map((teachers ?? []).map((teacher) => [teacher.id, teacher.name || "Unnamed instructor"]));
  const selectedLessonIds = selectedCourse?.modules?.flatMap((module) => module.lessons?.map((lesson) => lesson.id) ?? []) ?? [];
  const { data: materials, error: materialsError } = selectedLessonIds.length
    ? await supabase.from("materials").select("id, lesson_id, title, file_name, file_size, downloadable").in("lesson_id", selectedLessonIds).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (materialsError) throw new Error("Unable to load course materials.");

  return <div className="control-page"><header className="control-header"><div><span className="section-kicker">Developer control</span><h1>Platform command center.</h1><p>Developer-only controls stay server-authorized and are never granted by the shortcut alone.</p></div><ShieldCheck size={38} /></header><section className="control-stats"><div><Users size={18} /><span>Students</span><strong>{counts.student}</strong></div><div><Users size={18} /><span>Teachers</span><strong>{counts.teacher}</strong></div><div><Users size={18} /><span>Admins</span><strong>{counts.admin}</strong></div><div><BookOpen size={18} /><span>Courses</span><strong>{courseCount ?? 0}</strong></div><div><Activity size={18} /><span>Published</span><strong>{publishedCourseCount ?? 0}</strong></div></section><section className="control-card developer-console"><div className="control-card-heading"><div><span className="section-kicker">Developer console</span><h2>Inspect any course</h2></div><BookOpen size={22} /></div><p>Search course structure, materials, and Mux state without changing normal teacher or student permissions.</p><form className="developer-search" method="get"><label htmlFor="course-search">Search courses</label><div><input id="course-search" name="q" defaultValue={search} placeholder="Search by title or slug" /><button className="btn btn-gold" type="submit"><Search size={16} /> Search</button></div></form>{courseListError ? <p className="control-error" role="alert">Unable to load courses.</p> : null}{(courses ?? []).length === 0 ? <p className="developer-empty">No courses match this search.</p> : <div className="developer-course-list">{(courses ?? []).map((course) => { const lessons = course.modules?.flatMap((module) => module.lessons ?? []) ?? []; return <Link className={`developer-course-row ${course.id === selectedCourseId ? "selected" : ""}`} href={`/developer?${new URLSearchParams({ ...(search ? { q: search } : {}), course: course.id }).toString()}`} key={course.id}><span><strong>{course.title}</strong><small>{course.slug} · {teacherNames.get(course.teacher_id) ?? "Unnamed instructor"}</small></span><span className="developer-course-meta"><small>{course.modules?.length ?? 0} modules · {lessons.length} lessons</small><span className={`status-pill ${course.status}`}>{course.status}</span></span></Link>; })}</div>}</section>{selectedCourse ? <section className="control-card course-inspector"><div className="control-card-heading"><div><span className="section-kicker">Course inspector</span><h2>{selectedCourse.title}</h2><p>{selectedCourse.slug} · {teacherNames.get(selectedCourse.teacher_id) ?? "Unnamed instructor"}</p></div><span className={`status-pill ${selectedCourse.status}`}>{selectedCourse.status}</span></div><div className="inspector-summary"><div><span>Created</span><strong>{formatDate(selectedCourse.created_at)}</strong></div><div><span>Updated</span><strong>{formatDate(selectedCourse.updated_at)}</strong></div><div><span>Modules</span><strong>{selectedCourse.modules?.length ?? 0}</strong></div><div><span>Lessons</span><strong>{selectedCourse.modules?.reduce((total, module) => total + (module.lessons?.length ?? 0), 0)}</strong></div></div>{selectedCourse.description ? <p className="inspector-description">{selectedCourse.description}</p> : null}<div className="inspector-modules">{(selectedCourse.modules ?? []).length === 0 ? <p className="developer-empty">This course has no modules yet.</p> : (selectedCourse.modules ?? []).map((module) => <section className="inspector-module" key={module.id}><div className="inspector-module-heading"><h3>{module.position + 1}. {module.title}</h3><span>{module.lessons?.length ?? 0} lessons</span></div>{(module.lessons ?? []).map((lesson) => { const lessonMaterials = (materials ?? []).filter((material) => material.lesson_id === lesson.id); return <article className="inspector-lesson" key={lesson.id}><div className="inspector-lesson-heading"><div><strong>{lesson.position + 1}. {lesson.title}</strong><small>{lesson.is_preview ? "Preview lesson" : "Standard lesson"} · {lessonMaterials.length} materials</small></div><span className={`video-status ${lesson.video_status ?? "none"}`}>{videoStatusLabel(lesson.video_status)}</span></div>{lesson.video_status || lesson.mux_upload_id || lesson.mux_asset_id ? <div className="video-diagnostics"><div><span>Upload ID</span><code>{lesson.mux_upload_id ?? "—"}</code></div><div><span>Asset ID</span><code>{lesson.mux_asset_id ?? "—"}</code></div><div><span>Playback ID</span><code>{lesson.mux_playback_id ?? "—"}</code></div><div><span>Ready at</span><code>{formatDate(lesson.video_ready_at)}</code></div>{lesson.video_error ? <div className="video-error"><span>Error</span><code>{lesson.video_error}</code></div> : null}</div> : <p className="inspector-muted">No video associated with this lesson.</p>}{lessonMaterials.length ? <div className="inspector-materials"><span>Materials</span>{lessonMaterials.map((material) => <small key={material.id}>{material.title} · {material.file_name}{material.downloadable ? " · downloadable" : ""}</small>)}</div> : null}</article>; })}</section>)}</div></section> : null}<EmergencyControls locked={setting?.emergency_lock ?? false} initialMode={initialMode} /><section className="control-links"><Link href="/admin"><Users size={18} /><span><strong>Admin panel</strong><small>Manage users and teacher access</small></span><ArrowRight size={17} /></Link><Link href="/teacher"><BookOpen size={18} /><span><strong>Teacher panel</strong><small>Manage courses and lessons</small></span><ArrowRight size={17} /></Link></section></div>;
}
