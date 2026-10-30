"use client";

import { FormEvent, useEffect, useState } from "react";
import { Download, Eye, FileText, Pencil, Trash2, Upload, X } from "lucide-react";

type Lesson = { id: string; title: string; position: number };
type Module = { id: string; title: string; position: number; lessons: Lesson[] };
type Course = { id: string; title: string; modules: Module[] };
type Material = {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  downloadable: boolean;
  created_at: string;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ".pdf,.ppt,.pptx,.doc,.docx";

function formatSize(bytes: number | null) {
  if (!bytes) return "Unknown size";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdf(material: Material) {
  return material.file_type === "application/pdf";
}

export function StudyMaterialsPanel({ courses }: { courses: Course[] }) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [moduleId, setModuleId] = useState(courses[0]?.modules[0]?.id ?? "");
  const [lessonId, setLessonId] = useState(courses[0]?.modules[0]?.lessons[0]?.id ?? "");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [previewing, setPreviewing] = useState<Material | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCourse = courses.find((course) => course.id === courseId) ?? null;
  const selectedModule = selectedCourse?.modules.find((module) => module.id === moduleId) ?? null;
  const selectedLesson = selectedModule?.lessons.find((lesson) => lesson.id === lessonId) ?? null;

  useEffect(() => {
    if (!lessonId) return;
    let active = true;
    fetch(`/api/materials/lesson/${lessonId}`)
      .then(async (response) => {
        const body = await response.json() as { materials?: Material[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Unable to load materials.");
        if (active) setMaterials(body.materials ?? []);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load materials.");
      })
      .finally(() => {
        if (active) setLoadingMaterials(false);
      });
    return () => { active = false; };
  }, [lessonId]);

  function chooseCourse(nextCourseId: string) {
    const nextCourse = courses.find((course) => course.id === nextCourseId);
    const nextModule = nextCourse?.modules[0];
    setCourseId(nextCourseId);
    setModuleId(nextModule?.id ?? "");
    setLessonId(nextModule?.lessons[0]?.id ?? "");
    setMaterials([]);
    setLoadingMaterials(Boolean(nextModule?.lessons[0]?.id));
    setError(null);
    setNotice(null);
    setError(null);
  }

  function chooseModule(nextModuleId: string) {
    const nextModule = selectedCourse?.modules.find((module) => module.id === nextModuleId);
    setModuleId(nextModuleId);
    setLessonId(nextModule?.lessons[0]?.id ?? "");
    setMaterials([]);
    setLoadingMaterials(Boolean(nextModule?.lessons[0]?.id));
    setError(null);
    setNotice(null);
    setError(null);
  }

  async function uploadMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("material-file");
    const titleInput = form.elements.namedItem("material-title");
    const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;
    const title = titleInput instanceof HTMLInputElement ? titleInput.value.trim() : "";
    if (!selectedCourse || !selectedLesson || !file) {
      setError("Choose a lesson and a file before uploading.");
      return;
    }
    if (!title || title.length > 120) {
      setError("Enter a title between 1 and 120 characters.");
      return;
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setError("Files must be smaller than 25 MB.");
      return;
    }

    setUploading(true);
    setError(null);
    setNotice(null);
    const payload = new FormData();
    payload.append("file", file);
    payload.append("title", title);
    payload.append("courseId", selectedCourse.id);
    payload.append("lessonId", selectedLesson.id);
    payload.append("downloadable", String(form.elements.namedItem("downloadable") instanceof HTMLInputElement && (form.elements.namedItem("downloadable") as HTMLInputElement).checked));
    try {
      const response = await fetch("/api/materials/upload", { method: "POST", body: payload });
      const body = await response.json() as { material?: Material; error?: string };
      if (!response.ok || !body.material) throw new Error(body.error ?? "Unable to upload material.");
      setMaterials((current) => [body.material!, ...current]);
      form.reset();
      setNotice("Material uploaded.");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to upload material.");
    } finally {
      setUploading(false);
    }
  }

  async function saveMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = event.currentTarget;
    const title = form.elements.namedItem("edit-title");
    const downloadable = form.elements.namedItem("edit-downloadable");
    const nextTitle = title instanceof HTMLInputElement ? title.value.trim() : "";
    const nextDownloadable = downloadable instanceof HTMLInputElement && downloadable.checked;
    setError(null);
    const response = await fetch(`/api/materials/${editing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: nextTitle, downloadable: nextDownloadable }),
    });
    const body = await response.json() as { material?: Material; error?: string };
    if (!response.ok || !body.material) {
      setError(body.error ?? "Unable to update material.");
      return;
    }
    setMaterials((current) => current.map((item) => item.id === editing.id ? body.material! : item));
    setEditing(null);
    setNotice("Material details updated.");
  }

  async function deleteMaterial(material: Material) {
    if (!window.confirm(`Delete "${material.title}"? This cannot be undone.`)) return;
    setError(null);
    const response = await fetch(`/api/materials/${material.id}`, { method: "DELETE" });
    const body = await response.json() as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Unable to delete material.");
      return;
    }
    setMaterials((current) => current.filter((item) => item.id !== material.id));
    setNotice("Material deleted.");
  }

  if (courses.length === 0) return null;

  return <section className="teacher-card materials-panel">
    <div className="teacher-card-heading">
      <div><span className="section-kicker">Study materials</span><h2>Upload resources for every lesson.</h2></div>
      <FileText size={24} aria-hidden="true" />
    </div>
    <p className="teacher-description">Private files are protected by course access. PDF files can be viewed in the workspace; office files open through a secure temporary link.</p>
    <div className="material-select-grid">
      <label>Course<select value={courseId} onChange={(event) => chooseCourse(event.target.value)}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
      <label>Module<select value={moduleId} onChange={(event) => chooseModule(event.target.value)}>{selectedCourse?.modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
      <label>Lesson<select value={lessonId} onChange={(event) => { setLessonId(event.target.value); setMaterials([]); setLoadingMaterials(Boolean(event.target.value)); setError(null); }}>{selectedModule?.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
    </div>
    {error ? <div className="teacher-error" role="alert">{error}</div> : null}
    {notice ? <div className="teacher-notice">{notice}</div> : null}
    {selectedLesson ? <form className="material-upload-form" onSubmit={uploadMaterial}>
      <label>Material title<input name="material-title" required maxLength={120} placeholder="Chapter notes" /></label>
      <label>File<input name="material-file" type="file" accept={ACCEPTED_TYPES} required /></label>
      <label className="material-check"><input name="downloadable" type="checkbox" defaultChecked /> Students may download this file</label>
      <button className="btn btn-gold" disabled={uploading}><Upload size={16} /> {uploading ? "Uploading..." : "Upload material"}</button>
      <small>PDF, PPT, PPTX, DOC or DOCX · maximum 25 MB</small>
    </form> : <div className="teacher-empty compact"><p>Add a lesson before uploading study materials.</p></div>}
    <div className="materials-list">
      <div className="module-heading"><h3>{selectedLesson ? `Materials for ${selectedLesson.title}` : "Materials"}</h3><span className="teacher-count">{loadingMaterials ? "Loading..." : materials.length}</span></div>
      {!loadingMaterials && materials.length === 0 ? <div className="teacher-empty compact"><FileText size={20} /><p>No materials uploaded for this lesson yet.</p></div> : materials.map((material) => <article className="material-row" key={material.id}>
        <div className="material-row-info"><strong>{material.title}</strong><small>{material.file_name} · {formatSize(material.file_size)} · {material.downloadable ? "Downloadable" : "View only"}</small></div>
        <div className="material-row-actions">
          <button className="text-button" onClick={() => setPreviewing(material)}><Eye size={15} /> {isPdf(material) ? "View PDF" : "Open"}</button>
          {material.downloadable ? <a className="text-button" href={`/api/materials/${material.id}`} target="_blank" rel="noreferrer"><Download size={15} /> Open file</a> : null}
          <button className="icon-button" aria-label={`Edit ${material.title}`} onClick={() => setEditing(material)}><Pencil size={15} /></button>
          <button className="icon-button danger" aria-label={`Delete ${material.title}`} onClick={() => deleteMaterial(material)}><Trash2 size={15} /></button>
        </div>
      </article>)}
    </div>
    {editing ? <div className="material-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-material-heading">
      <form className="teacher-card" onSubmit={saveMaterial}><div className="teacher-card-heading"><div><span className="section-kicker">Edit material</span><h2 id="edit-material-heading">{editing.title}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setEditing(null)}><X size={18} /></button></div><label>Title<input name="edit-title" defaultValue={editing.title} maxLength={120} required /></label><label className="material-check"><input name="edit-downloadable" type="checkbox" defaultChecked={editing.downloadable} /> Students may download this file</label><button className="btn btn-gold">Save changes</button></form>
    </div> : null}
    {previewing ? <div className="material-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-material-heading">
      <div className="teacher-card material-preview"><div className="teacher-card-heading"><div><span className="section-kicker">Secure preview</span><h2 id="preview-material-heading">{previewing.title}</h2></div><button className="icon-button" aria-label="Close preview" onClick={() => setPreviewing(null)}><X size={18} /></button></div>{isPdf(previewing) ? <iframe title={`Preview of ${previewing.title}`} src={`/api/materials/${previewing.id}`} /> : <div className="teacher-empty compact"><FileText size={30} /><p>This file type is not previewed in the browser.</p><a className="btn btn-gold" href={`/api/materials/${previewing.id}`} target="_blank" rel="noreferrer">Open secure file</a></div>}</div>
    </div> : null}
  </section>;
}
