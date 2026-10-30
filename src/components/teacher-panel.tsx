"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, ArrowDown, BookOpen, Check, ChevronRight, LogOut, Plus, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { StudyMaterialsPanel } from "@/components/study-materials-panel";
import { CourseDescriptionEditor } from "@/components/course-description-editor";
import { getCourseThumbnailUrl } from "@/lib/courses";
import { sanitizeCourseHtml } from "@/lib/courses";
import { revalidateCourseCatalog } from "@/app/teacher/actions";

type Lesson = { id: string; title: string; position: number; mux_upload_id: string | null; video_status: "pending" | "preparing" | "ready" | "errored" | null; video_error: string | null };
type Module = { id: string; title: string; position: number; lessons: Lesson[] };
type Course = {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  thumbnail: string | null;
  price: number;
  level: string;
  language: string;
  category_id: string | null;
  status: "draft" | "published" | "archived";
  modules: Module[];
};

type CourseForm = Pick<Course, "title" | "slug" | "description" | "short_description" | "price" | "level" | "language"> & { category_id: string };

const emptyForm: CourseForm = {
  title: "",
  slug: "",
  description: "",
  short_description: "",
  price: 0,
  level: "Grade 10",
  language: "English",
  category_id: "School",
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function TeacherPanel({ initialCourses }: { initialCourses: Course[] }) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [selectedId, setSelectedId] = useState<string | null>(initialCourses[0]?.id ?? null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [addingModule, setAddingModule] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const selectedCourse = courses.find((course) => course.id === selectedId) ?? null;

  const stats = useMemo(() => ({
    courses: courses.length,
    published: courses.filter((course) => course.status === "published").length,
    lessons: courses.reduce((total, course) => total + course.modules.reduce((count, module) => count + module.lessons.length, 0), 0),
  }), [courses]);

  function startCreate() {
    setSelectedId(null);
    setForm(emptyForm);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setRemoveThumbnail(false);
    setEditing(true);
    setNotice(null);
    setError(null);
  }

  function startEdit(course: Course) {
    setSelectedId(course.id);
    setForm({
      title: course.title,
      slug: course.slug,
      description: course.description,
      short_description: course.short_description,
      price: course.price,
      level: course.level,
      language: course.language,
      category_id: course.category_id ?? "School",
    });
    setThumbnailFile(null);
    setThumbnailPreview(getCourseThumbnailUrl(course.thumbnail));
    setRemoveThumbnail(false);
    setEditing(true);
    setNotice(null);
    setError(null);
  }

  function chooseThumbnail(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Thumbnail images must be 5 MB or smaller.");
      return;
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setRemoveThumbnail(false);
    setError(null);
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const client = createClient();
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
    const status = submitter instanceof HTMLButtonElement && submitter.dataset.status === "published" ? "published" : "draft";
    const payload = { ...form, slug: slugify(form.slug || form.title), price: Number(form.price), status };
    if (!payload.title || !payload.slug || Number.isNaN(payload.price) || payload.price < 0) {
      setError("Enter a course title, valid slug, and a non-negative price.");
      setSaving(false);
      return;
    }
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      setError("Your session has expired. Please sign in again.");
      setSaving(false);
      return;
    }
    const result = selectedId
      ? await client.from("courses").update(payload).eq("id", selectedId).select("id, title, slug, short_description, description, thumbnail, price, level, language, category_id, status, modules(id, title, position, lessons(id, title, position, mux_upload_id, video_status, video_error))").single()
      : await client.from("courses").insert({ ...payload, teacher_id: user.id }).select("id, title, slug, short_description, description, thumbnail, price, level, language, category_id, status, modules(id, title, position, lessons(id, title, position, mux_upload_id, video_status, video_error))").single();

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    let savedCourse = result.data;
    const oldThumbnail = selectedId ? courses.find((course) => course.id === selectedId)?.thumbnail : null;
    if (thumbnailFile || removeThumbnail) {
      let thumbnail = removeThumbnail ? null : oldThumbnail;
      if (thumbnailFile) {
        const extension = thumbnailFile.name.slice(thumbnailFile.name.lastIndexOf(".")).toLowerCase();
        const path = `${user.id}/${savedCourse.id}/${crypto.randomUUID()}${extension}`;
        const { error: uploadError } = await client.storage.from("course-thumbnails").upload(path, thumbnailFile, { contentType: thumbnailFile.type, upsert: false });
        if (uploadError) {
          setError("Course saved, but the thumbnail could not be uploaded.");
          setSaving(false);
          return;
        }
        thumbnail = path;
      }
      if (oldThumbnail && (thumbnailFile || removeThumbnail)) await client.storage.from("course-thumbnails").remove([oldThumbnail]);
      const { data: thumbnailCourse, error: thumbnailError } = await client.from("courses").update({ thumbnail }).eq("id", savedCourse.id).select("id, title, slug, short_description, description, thumbnail, price, level, language, category_id, status, modules(id, title, position, lessons(id, title, position, mux_upload_id, video_status, video_error))").single();
      if (thumbnailError || !thumbnailCourse) {
        setError("Course saved, but the thumbnail reference could not be updated.");
        setSaving(false);
        return;
      }
      savedCourse = thumbnailCourse;
    }

    setCourses((current) => selectedId ? current.map((course) => course.id === selectedId ? savedCourse : course) : [savedCourse, ...current]);
    setSelectedId(result.data.id);
    setEditing(false);
    setThumbnailFile(null);
    setRemoveThumbnail(false);
    setNotice(status === "published" ? "Course published." : "Draft saved.");
    await revalidateCourseCatalog(savedCourse.slug);
    router.refresh();
    setSaving(false);
  }

  async function togglePublished(course: Course) {
    setError(null);
    const nextStatus = course.status === "published" ? "draft" : "published";
    const { data, error: updateError } = await createClient().from("courses").update({ status: nextStatus }).eq("id", course.id).select("id, status, slug").single();
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setCourses((current) => current.map((item) => item.id === course.id ? { ...item, status: data.status } : item));
    setNotice(nextStatus === "published" ? "Course published." : "Course moved back to draft.");
    await revalidateCourseCatalog(data.slug);
    router.refresh();
  }

  async function addModule() {
    if (!selectedCourse) return;
    const title = moduleTitle.trim();
    if (!title) {
      setError("Enter a module title.");
      return;
    }
    const position = selectedCourse.modules.length;
    const { data, error: insertError } = await createClient().from("modules").insert({ course_id: selectedCourse.id, title, position }).select("id, title, position, lessons(id, title, position, mux_upload_id, video_status, video_error)").single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCourses((current) => current.map((course) => course.id === selectedCourse.id ? { ...course, modules: [...course.modules, data] } : course));
    setAddingModule(false);
    setModuleTitle("");
    setNotice("Module created.");
  }

  async function addLesson(module: Module) {
    if (!selectedCourse) return;
    const title = lessonTitle.trim();
    if (!title) {
      setError("Enter a lesson title.");
      return;
    }
    const position = module.lessons.length;
    const { data, error: insertError } = await createClient().from("lessons").insert({ module_id: module.id, title, position }).select("id, title, position, mux_upload_id, video_status, video_error").single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCourses((current) => current.map((course) => course.id === selectedCourse.id ? {
      ...course,
      modules: course.modules.map((item) => item.id === module.id ? { ...item, lessons: [...item.lessons, data] } : item),
    } : course));
    setAddingLessonTo(null);
    setLessonTitle("");
    setNotice("Lesson created.");
  }

  async function moveLesson(module: Module, index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= module.lessons.length || !selectedCourse) return;
    const currentLesson = module.lessons[index];
    const nextLesson = module.lessons[nextIndex];
    const client = createClient();
    const [first, second] = await Promise.all([
      client.from("lessons").update({ position: nextIndex }).eq("id", currentLesson.id),
      client.from("lessons").update({ position: index }).eq("id", nextLesson.id),
    ]);
    if (first.error || second.error) {
      setError(first.error?.message ?? second.error?.message ?? "Unable to reorder lessons.");
      return;
    }
    setCourses((current) => current.map((course) => course.id === selectedCourse.id ? {
      ...course,
      modules: course.modules.map((item) => item.id === module.id ? {
        ...item,
        lessons: item.lessons.map((lesson, lessonIndex) => lessonIndex === index ? { ...lesson, position: nextIndex } : lessonIndex === nextIndex ? { ...lesson, position: index } : lesson).sort((a, b) => a.position - b.position),
      } : item),
    } : course));
  }

  return <div className="teacher-app">
    <aside className="teacher-sidebar">
      <Link className="teacher-brand" href="/"><span>EP</span><strong>EduPrime</strong></Link>
      <div className="teacher-nav-label">Workspace</div>
      <button className="teacher-nav-item active"><BookOpen size={17} /> Courses</button>
      <Link className="teacher-nav-item" href="/dashboard"><ChevronRight size={17} /> Student view</Link>
      <div className="teacher-sidebar-footer"><Link href="/"><ArrowLeft size={16} /> Back to site</Link><button onClick={() => createClient().auth.signOut()}><LogOut size={16} /> Sign out</button></div>
    </aside>
    <main className="teacher-content">
      <header className="teacher-header"><div><span className="section-kicker">Teacher workspace</span><h1>Build courses that matter.</h1><p>Create the structure your students will learn from.</p></div><button className="btn btn-gold" onClick={startCreate}><Plus size={16} /> New course</button></header>
      <div className="teacher-stats"><div><span>Total courses</span><strong>{stats.courses}</strong></div><div><span>Published</span><strong>{stats.published}</strong></div><div><span>Total lessons</span><strong>{stats.lessons}</strong></div></div>
      {notice ? <div className="teacher-notice"><Check size={16} /> {notice}</div> : null}
      {error ? <div className="teacher-error" role="alert">{error}</div> : null}
      {editing ? <form key={selectedId ?? "new"} className="teacher-card teacher-form" onSubmit={saveCourse}><div className="teacher-card-heading"><div><span className="section-kicker">{selectedId ? "Edit course" : "New course"}</span><h2>Course details</h2></div><button type="button" className="text-button" onClick={() => setEditing(false)}>Cancel</button></div><div className="teacher-form-grid"><label>Course title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Course slug<input required value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} placeholder="python-basics" /></label><label className="full">Short description<input required maxLength={180} value={form.short_description} onChange={(event) => setForm({ ...form, short_description: event.target.value })} placeholder="A clear one-line course summary" /></label><label>Level<select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label>Language<select value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}><option>English</option><option>Hindi</option><option>Hinglish</option><option>Other</option></select></label><label>Category<select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}><option>School</option><option>JEE</option><option>NEET</option><option>Skills</option></select></label><label>Price (INR)<input required min="0" step="0.01" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} /></label><label className="full">Full description<CourseDescriptionEditor value={form.description} onChange={(description) => setForm({ ...form, description })} /></label><label className="full">Course thumbnail<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseThumbnail(event.target.files?.[0])} /><small>JPG, PNG, or WEBP · maximum 5 MB · recommended 16:9</small>{thumbnailPreview ? <div className="thumbnail-preview"><img src={thumbnailPreview} alt="Course thumbnail preview" /><div><button type="button" className="text-button" onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); setRemoveThumbnail(true); }}>Remove</button>{selectedId ? <button type="button" className="text-button" onClick={() => document.querySelector<HTMLInputElement>('.teacher-form input[type="file"]')?.click()}>Replace</button> : null}</div></div> : <span className="thumbnail-empty">Upload a course thumbnail</span>}</label></div><div className="teacher-form-actions"><button className="btn btn-outline" data-status="draft" disabled={saving}><Save size={16} /> {saving ? "Saving..." : "Save draft"}</button><button className="btn btn-gold" data-status="published" disabled={saving}><Check size={16} /> {saving ? "Saving..." : selectedId ? "Update & publish" : "Publish"}</button></div></form> : null}
      <section className="teacher-layout"><div className="teacher-card"><div className="teacher-card-heading"><div><span className="section-kicker">Your library</span><h2>Courses</h2></div><span className="teacher-count">{courses.length}</span></div>{courses.length === 0 ? <div className="teacher-empty"><BookOpen size={24} /><p>Your first course starts here.</p><button className="text-button" onClick={startCreate}>Create a course</button></div> : <div className="teacher-course-list">{courses.map((course) => <button key={course.id} className={`teacher-course-item ${selectedId === course.id ? "selected" : ""}`} onClick={() => { setSelectedId(course.id); setEditing(false); }}><span><strong>{course.title}</strong><small>{course.level} · {course.modules.length} modules</small></span><span className={`status-pill ${course.status}`}>{course.status}</span></button>)}</div>}</div>
        <div className="teacher-card teacher-editor">{selectedCourse ? <><div className="teacher-card-heading"><div><span className="section-kicker">Course structure</span><h2>{selectedCourse.title}</h2></div><div className="teacher-actions"><button className="text-button" onClick={() => startEdit(selectedCourse)}>Edit details</button><button className="btn btn-gold" onClick={() => togglePublished(selectedCourse)}>{selectedCourse.status === "published" ? "Unpublish" : "Publish"}</button></div></div><div className="teacher-description rich-description" dangerouslySetInnerHTML={{ __html: sanitizeCourseHtml(selectedCourse.description) }} /><div className="module-heading"><h3>Modules and lessons</h3>{addingModule ? <form className="inline-create-form" onSubmit={(event) => { event.preventDefault(); void addModule(); }}><input autoFocus value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} placeholder="Module title" aria-label="Module title" /><button className="btn btn-gold" type="submit">Create module</button><button className="text-button" type="button" onClick={() => { setAddingModule(false); setModuleTitle(""); }}>Cancel</button></form> : <button className="text-button" onClick={() => { setAddingModule(true); setError(null); }}><Plus size={15} /> Add module</button>}</div>{selectedCourse.modules.length === 0 ? <div className="teacher-empty compact"><p>Add a module to start outlining this course.</p></div> : <div className="module-list">{selectedCourse.modules.map((module) => <div className="module-item" key={module.id}><div className="module-title"><strong>{module.title}</strong><span>{module.lessons.length} lessons</span></div>{module.lessons.map((lesson, index) => <div className="lesson-item" key={lesson.id}><span>{String(index + 1).padStart(2, "0")} {lesson.title}</span><span className="lesson-actions"><button aria-label={`Move ${lesson.title} up`} disabled={index === 0} onClick={() => moveLesson(module, index, -1)}><ArrowUp size={14} /></button><button aria-label={`Move ${lesson.title} down`} disabled={index === module.lessons.length - 1} onClick={() => moveLesson(module, index, 1)}><ArrowDown size={14} /></button></span></div>)}{addingLessonTo === module.id ? <form className="inline-create-form" onSubmit={(event) => { event.preventDefault(); void addLesson(module); }}><input autoFocus value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} placeholder="Lesson title" aria-label="Lesson title" /><button className="btn btn-gold" type="submit">Add lesson</button><button className="text-button" type="button" onClick={() => { setAddingLessonTo(null); setLessonTitle(""); }}>Cancel</button></form> : <button className="add-lesson" onClick={() => { setAddingLessonTo(module.id); setLessonTitle(""); setError(null); }}><Plus size={14} /> Add lesson</button>}</div>)}</div>}</> : <div className="teacher-empty editor-empty"><BookOpen size={30} /><h2>Select a course</h2><p>Choose a course from your library or create a new one.</p></div>}</div>
      </section>
      <StudyMaterialsPanel courses={courses} />
    </main>
  </div>;
}
