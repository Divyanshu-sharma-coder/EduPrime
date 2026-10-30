"use client";

import { useState } from "react";
import { Upload, Video } from "lucide-react";

type VideoStatus = "pending" | "preparing" | "ready" | "errored" | null;
type Lesson = {
  id: string;
  title: string;
  mux_upload_id: string | null;
  video_status: VideoStatus;
  video_error: string | null;
};

const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024;
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const ACCEPTED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"];

function isVideoFile(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return ACCEPTED_VIDEO_TYPES.includes(file.type) || ACCEPTED_VIDEO_EXTENSIONS.includes(extension);
}

function uploadToMux(uploadUrl: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error("Mux rejected the video upload."));
    });
    request.addEventListener("error", () => reject(new Error("The video upload was interrupted.")));
    request.addEventListener("abort", () => reject(new Error("The video upload was cancelled.")));
    request.send(file);
  });
}

function statusLabel(lesson: Lesson, uploading: boolean, progress: number) {
  if (uploading) return `Uploading video — ${progress}%`;
  if (lesson.video_status === "errored") return "Error";
  if (lesson.video_status === "ready") return "Ready";
  if (lesson.mux_upload_id || lesson.video_status === "pending" || lesson.video_status === "preparing") return "Processing";
  return "No video uploaded";
}

export function LessonVideoPanel({
  lesson,
  onUploadStarted,
}: {
  lesson: Lesson | null;
  onUploadStarted: (lessonId: string, uploadId: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);

  async function uploadVideo(file: File | undefined) {
    if (!lesson || !file) return;
    setError(null);
    setUploaded(false);
    if (!isVideoFile(file)) {
      setError("Choose an MP4, MOV, or WebM video.");
      return;
    }
    if (file.size === 0 || file.size > MAX_VIDEO_SIZE) {
      setError("Videos must be smaller than 2 GB.");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const response = await fetch("/api/mux/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id }),
      });
      const body = await response.json() as { uploadId?: string; uploadUrl?: string; error?: string };
      if (!response.ok || !body.uploadId || !body.uploadUrl) {
        throw new Error(body.error ?? "Unable to start the video upload.");
      }

      onUploadStarted(lesson.id, body.uploadId);
      await uploadToMux(body.uploadUrl, file, setProgress);
      setUploaded(true);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to upload the video.");
    } finally {
      setUploading(false);
    }
  }

  const uploadExists = Boolean(lesson?.mux_upload_id);

  return <section className="teacher-card lesson-video-panel">
    <div className="teacher-card-heading">
      <div><span className="section-kicker">Lesson Video</span><h2>{lesson ? lesson.title : "Select a lesson"}</h2></div>
      <Video size={24} aria-hidden="true" />
    </div>
    {!lesson ? <p className="teacher-description">Select a lesson to manage its video.</p> : <>
      <p className="teacher-description">Upload a lesson recording directly to Mux. Mux will process it before it can be watched.</p>
      <div className="lesson-video-status"><span>Status</span><strong>{statusLabel(lesson, uploading, progress)}</strong></div>
      {lesson.video_error ? <p className="teacher-error" role="alert">{lesson.video_error}</p> : null}
      {error ? <p className="teacher-error" role="alert">{error}</p> : null}
      {uploaded ? <p className="teacher-notice" role="status">Video uploaded. Mux is processing it...</p> : null}
      {uploadExists ? <p className="teacher-description">Video upload already exists or is processing. A new upload cannot replace it.</p> : <label className="video-upload-picker">
        <span className="btn btn-gold"><Upload size={16} /> Choose video</span>
        <input type="file" accept={ACCEPTED_VIDEO_TYPES.join(",")} disabled={uploading} onChange={(event) => { void uploadVideo(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        <small>MP4, MOV, or WebM · maximum 2 GB</small>
      </label>}
      {uploading ? <progress className="video-upload-progress" value={progress} max="100" aria-label={`Video upload ${progress}%`} /> : null}
    </>}
  </section>;
}
