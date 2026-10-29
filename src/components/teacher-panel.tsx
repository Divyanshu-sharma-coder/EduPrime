"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, ArrowUp, ArrowDown, BookOpen, Check, ChevronRight, LogOut, Plus, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type Lesson = { id: string; title: string; position: number };
type Module = { id: string; title: string; position: number; lessons: Lesson[] };
type Course = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  level: string;
  language: string;
  category_id: string | null;
  status: "draft" | "published" | "archived";
  modules: Module[];
};

type CourseForm = Pick<Course, "title" | "slug" | "description" | "price" | "level" | "language"> & { category_id: string };

const emptyForm: CourseForm = {
  title: "",
  slug: "",
  description: "",
  price: 0,
  level: "Grade 10",
  language: "English",
  category_id: "School",
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function TeacherPanel({ initialCourses }: { initialCourses: Course[] }) {
  const [courses, setCourses] = useState(initialCourses);
  const [selectedId, setSelectedId] = useState<string | null>(initialCourses[0]?.id ?? null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedCourse = courses.find((course) => course.id === selectedId) ?? null;

  const stats = useMemo(() => ({
    courses: courses.length,
    published: courses.filter((course) => course.status === "published").length,
    lessons: courses.reduce((total, course) => total + course.modules.reduce((count, module) => count + module.lessons.length, 0), 0),
  }), [courses]);

  function startCreate() {
    setSelectedId(null);
    setForm(emptyForm);
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
      price: course.price,
      level: course.level,
      language: course.language,
      category_id: course.category_id ?? "School",
    });
    setEditing(true);
    setNotice(null);
    setError(null);
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const client = createClient();
    const payload = { ...form, slug: slugify(form.slug || form.title), price: Number(form.price) };
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      setError("Your session has expired. Please sign in again.");
      setSaving(false);
      return;
    }
    const result = selectedId
      ? await client.from("courses").update(payload).eq("id", selectedId).select("id, title, slug, description, price, level, language, category_id, status, modules(id, title, position, lessons(id, title, position))").single()
      : await client.from("courses").insert({ ...payload, teacher_id: user.id }).select("id, title, slug, description, price, level, language, category_id, status, modules(id, title, position, lessons(id, title, position))").single();

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setCourses((current) => selectedId ? current.map((course) => course.id === selectedId ? result.data : course) : [result.data, ...current]);
    setSelectedId(result.data.id);
    setEditing(false);
    setNotice("Course saved.");
    setSaving(false);
  }

  async function togglePublished(course: Course) {
    setError(null);
    const nextStatus = course.status === "published" ? "draft" : "published";
    const { data, error: updateError } = await createClient().from("courses").update({ status: nextStatus }).eq("id", course.id).select("id, status").single();
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setCourses((current) => current.map((item) => item.id === course.id ? { ...item, status: data.status } : item));
    setNotice(nextStatus === "published" ? "Course published." : "Course moved back to draft.");
  }

  async function addModule() {
    if (!selectedCourse) return;
    const position = selectedCourse.modules.length;
    const { data, error: insertError } = await createClient().from("modules").insert({ course_id: selectedCourse.id, title: `Module ${position + 1}`, position }).select("id, title, position, lessons(id, title, position)").single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCourses((current) => current.map((course) => course.id === selectedCourse.id ? { ...course, modules: [...course.modules, data] } : course));
  }

  async function addLesson(module: Module) {
    if (!selectedCourse) return;
    const position = module.lessons.length;
    const { data, error: insertError } = await createClient().from("lessons").insert({ module_id: module.id, title: `Lesson ${position + 1}`, position }).select("id, title, position").single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCourses((current) => current.map((course) => course.id === selectedCourse.id ? {
      ...course,
      modules: course.modules.map((item) => item.id === module.id ? { ...item, lessons: [...item.lessons, data] } : item),
    } : course));
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
      {editing ? <form className="teacher-card teacher-form" onSubmit={saveCourse}><div className="teacher-card-heading"><div><span className="section-kicker">{selectedId ? "Edit course" : "New course"}</span><h2>Course details</h2></div><button type="button" className="text-button" onClick={() => setEditing(false)}>Cancel</button></div><div className="teacher-form-grid"><label>Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Slug<input required value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} placeholder="python-basics" /></label><label>Level<select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}><option>Grade 8</option><option>Grade 9</option><option>Grade 10</option><option>JEE Foundation</option><option>NEET Foundation</option></select></label><label>Language<select value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}><option>English</option><option>Hindi</option></select></label><label>Category<select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}><option>School</option><option>JEE</option><option>NEET</option><option>Skills</option></select></label><label>Price (INR)<input required min="0" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} /></label><label className="full">Description<textarea required rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label></div><button className="btn btn-gold" disabled={saving}><Save size={16} /> {saving ? "Saving..." : "Save course"}</button></form> : null}
      <section className="teacher-layout"><div className="teacher-card"><div className="teacher-card-heading"><div><span className="section-kicker">Your library</span><h2>Courses</h2></div><span className="teacher-count">{courses.length}</span></div>{courses.length === 0 ? <div className="teacher-empty"><BookOpen size={24} /><p>Your first course starts here.</p><button className="text-button" onClick={startCreate}>Create a course</button></div> : <div className="teacher-course-list">{courses.map((course) => <button key={course.id} className={`teacher-course-item ${selectedId === course.id ? "selected" : ""}`} onClick={() => { setSelectedId(course.id); setEditing(false); }}><span><strong>{course.title}</strong><small>{course.level} · {course.modules.length} modules</small></span><span className={`status-pill ${course.status}`}>{course.status}</span></button>)}</div>}</div>
        <div className="teacher-card teacher-editor">{selectedCourse ? <><div className="teacher-card-heading"><div><span className="section-kicker">Course structure</span><h2>{selectedCourse.title}</h2></div><div className="teacher-actions"><button className="text-button" onClick={() => startEdit(selectedCourse)}>Edit details</button><button className="btn btn-gold" onClick={() => togglePublished(selectedCourse)}>{selectedCourse.status === "published" ? "Unpublish" : "Publish"}</button></div></div><p className="teacher-description">{selectedCourse.description}</p><div className="module-heading"><h3>Modules and lessons</h3><button className="text-button" onClick={addModule}><Plus size={15} /> Add module</button></div>{selectedCourse.modules.length === 0 ? <div className="teacher-empty compact"><p>Add a module to start outlining this course.</p></div> : <div className="module-list">{selectedCourse.modules.map((module) => <div className="module-item" key={module.id}><div className="module-title"><strong>{module.title}</strong><span>{module.lessons.length} lessons</span></div>{module.lessons.map((lesson, index) => <div className="lesson-item" key={lesson.id}><span>{String(index + 1).padStart(2, "0")} {lesson.title}</span><span className="lesson-actions"><button aria-label={`Move ${lesson.title} up`} disabled={index === 0} onClick={() => moveLesson(module, index, -1)}><ArrowUp size={14} /></button><button aria-label={`Move ${lesson.title} down`} disabled={index === module.lessons.length - 1} onClick={() => moveLesson(module, index, 1)}><ArrowDown size={14} /></button></span></div>)}<button className="add-lesson" onClick={() => addLesson(module)}><Plus size={14} /> Add lesson</button></div>)}</div>}</> : <div className="teacher-empty editor-empty"><BookOpen size={30} /><h2>Select a course</h2><p>Choose a course from your library or create a new one.</p></div>}</div>
      </section>
    </main>
  </div>;
}
