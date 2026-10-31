"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileVideo, LoaderCircle, Upload, Video } from "lucide-react";

type VideoStatus = "pending" | "preparing" | "ready" | "errored" | null;
type Lesson = {
  id: string;
  title: string;
  mux_upload_id: string | null;
  mux_asset_id?: string | null;
  mux_playback_id?: string | null;
  video_status: VideoStatus;
  video_ready_at?: string | null;
  video_error: string | null;
};

const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024;
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const ACCEPTED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"];

function isVideoFile(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return ACCEPTED_VIDEO_TYPES.includes(file.type) || ACCEPTED_VIDEO_EXTENSIONS.includes(extension);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : null;
}

function validateVideoFile(file: File) {
  if (!isVideoFile(file)) return "Choose an MP4, MOV, or WebM video.";
  if (file.size === 0) return "This file is empty. Choose a video with content.";
  if (file.size > MAX_VIDEO_SIZE) return "Videos must be smaller than 2 GB.";
  return null;
}

function uploadToMux(uploadUrl: string, file: File, onProgress: (loaded: number, total: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
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

function lifecycleState(lesson: Lesson, uploading: boolean, uploaded: boolean) {
  if (uploading) return "uploading";
  if (lesson.video_status === "ready") return "ready";
  if (lesson.video_status === "errored") return "errored";
  if (uploaded || lesson.mux_upload_id || lesson.video_status === "pending" || lesson.video_status === "preparing") return "processing";
  return "empty";
}

export function LessonVideoPanel({
  lesson,
  onUploadStarted,
}: {
  lesson: Lesson | null;
  onUploadStarted: (lessonId: string, uploadId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [videoState, setVideoState] = useState<(Partial<Lesson> & { id: string }) | null>(null);
  const displayLesson = useMemo<Lesson | null>(() => lesson && videoState?.id === lesson.id ? {
    ...lesson,
    mux_upload_id: videoState.mux_upload_id !== undefined ? videoState.mux_upload_id : lesson.mux_upload_id,
    mux_asset_id: videoState.mux_asset_id !== undefined ? videoState.mux_asset_id : lesson.mux_asset_id,
    mux_playback_id: videoState.mux_playback_id !== undefined ? videoState.mux_playback_id : lesson.mux_playback_id,
    video_ready_at: videoState.video_ready_at !== undefined ? videoState.video_ready_at : lesson.video_ready_at,
    video_status: videoState.video_status !== undefined ? videoState.video_status : lesson.video_status,
    video_error: videoState.video_error !== undefined ? videoState.video_error : lesson.video_error,
  } : lesson, [lesson, videoState]);

  useEffect(() => {
    if (!displayLesson || uploading || !displayLesson.mux_upload_id || displayLesson.video_status === "ready" || displayLesson.video_status === "errored") return;
    const lessonToRefresh = displayLesson;
    let active = true;

    async function refreshStatus() {
      try {
        const response = await fetch(`/api/teacher/lessons/${lessonToRefresh.id}/video-status`, { cache: "no-store" });
        const body = await response.json() as {
          videoStatus?: VideoStatus;
          muxUploadId?: string | null;
          muxAssetId?: string | null;
          muxPlaybackId?: string | null;
          videoReadyAt?: string | null;
          videoError?: string | null;
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? "Unable to refresh video status.");
        if (active && body.videoStatus !== undefined) {
          setRefreshError(null);
          setVideoState((previous) => {
            const nextState = {
              id: lessonToRefresh.id,
              mux_upload_id: body.muxUploadId ?? lessonToRefresh.mux_upload_id,
              mux_asset_id: body.muxAssetId,
              mux_playback_id: body.muxPlaybackId,
              video_ready_at: body.videoReadyAt,
              video_status: body.videoStatus,
              video_error: body.videoError ?? null,
            };
            if (previous
              && previous.id === nextState.id
              && previous.mux_upload_id === nextState.mux_upload_id
              && previous.mux_asset_id === nextState.mux_asset_id
              && previous.mux_playback_id === nextState.mux_playback_id
              && previous.video_ready_at === nextState.video_ready_at
              && previous.video_status === nextState.video_status
              && previous.video_error === nextState.video_error) {
              return previous;
            }
            return nextState;
          });
        }
      } catch {
        if (active) setRefreshError("Unable to refresh status. Retrying...");
      }
    }

    void refreshStatus();
    const timer = window.setInterval(() => { void refreshStatus(); }, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [displayLesson, uploading]);

  async function uploadVideo(file: File | undefined) {
    if (!lesson || !file) return;
    const validationError = validateVideoFile(file);
    setSelectedFile(file);
    setError(validationError);
    setUploaded(false);
    setRefreshError(null);
    if (validationError) return;

    setUploading(true);
    setUploadedBytes(0);
    setTotalBytes(file.size);
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
      await uploadToMux(body.uploadUrl, file, (loaded, total) => {
        setUploadedBytes(loaded);
        setTotalBytes(total);
      });
      setUploaded(true);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to upload the video.");
    } finally {
      setUploading(false);
    }
  }

  const currentState = displayLesson ? lifecycleState(displayLesson, uploading, uploaded) : "empty";
  const uploadPercent = totalBytes ? Math.round((uploadedBytes / totalBytes) * 100) : 0;
  const uploadExists = Boolean(displayLesson?.mux_upload_id);
  const readyAt = formatDate(displayLesson?.video_ready_at);

  return <section className="teacher-card lesson-video-panel" aria-labelledby="lesson-video-heading">
    <div className="teacher-card-heading">
      <div><span className="section-kicker">Lesson video</span><h2 id="lesson-video-heading">{lesson ? lesson.title : "Select a lesson"}</h2></div>
      <Video size={24} aria-hidden="true" />
    </div>
    {!displayLesson ? <div className="video-empty-state"><FileVideo size={30} aria-hidden="true" /><strong>No lesson selected</strong><p>Select a lesson to manage its video.</p></div> : <>
      <div className="video-lifecycle" aria-label="Video upload lifecycle">
        {(["empty", "uploading", "processing", "ready"] as const).map((state, index) => <div className={`video-lifecycle-step ${currentState === state ? "active" : ""} ${currentState === "ready" && state !== "ready" ? "complete" : ""}`} key={state}><span>{currentState === "ready" && state !== "ready" ? <CheckCircle2 size={14} /> : index + 1}</span><small>{state === "empty" ? "No video" : state === "uploading" ? "Uploading" : state === "processing" ? "Processing" : "Ready"}</small></div>)}
      </div>

      {currentState === "empty" ? <div className="video-empty-state"><FileVideo size={30} aria-hidden="true" /><strong>No video uploaded</strong><p>Upload an MP4, MOV, or WebM video. Maximum file size: 2 GB.</p><button className="btn btn-gold" type="button" onClick={() => inputRef.current?.click()}><Upload size={16} /> Upload video</button></div> : null}

      {currentState === "uploading" ? <div className="video-state-card uploading"><div className="video-state-heading"><Upload size={20} /><div><strong>Uploading video...</strong><span>Uploading directly to Mux</span></div><b>{uploadPercent}%</b></div><div className="video-file-summary"><FileVideo size={18} /><span><strong>{selectedFile?.name}</strong><small>{formatFileSize(uploadedBytes)} of {formatFileSize(totalBytes)}</small></span></div><progress value={uploadPercent} max="100" aria-label={`Uploading ${uploadPercent}%`} /><p className="video-state-help">Keep this window open until the upload reaches 100%.</p></div> : null}

      {currentState === "processing" ? <div className="video-state-card processing" role="status" aria-live="polite"><div className="video-state-heading"><LoaderCircle className="video-spinner" size={20} /><div><strong>{uploaded ? "Upload complete" : "Video is processing"}</strong><span>Mux is preparing the video for playback</span></div></div>{selectedFile ? <div className="video-file-summary"><FileVideo size={18} /><span><strong>{selectedFile.name}</strong><small>{formatFileSize(selectedFile.size)} · Browser upload finished</small></span></div> : null}<div className="video-indeterminate-progress" /><p className="video-state-help">Processing time varies by video length. This status updates automatically from Mux.</p></div> : null}

      {currentState === "ready" ? <div className="video-state-card ready" role="status" aria-live="polite"><div className="video-state-heading"><CheckCircle2 size={22} /><div><strong>Video ready</strong><span>Playback is ready for this lesson</span></div></div>{readyAt ? <p className="video-state-help">Ready {readyAt}</p> : null}{displayLesson.mux_playback_id ? <div className="video-id-row"><span>Playback ID</span><code>{displayLesson.mux_playback_id}</code></div> : null}<p className="video-state-help">Replacement uploads are not currently supported for this lesson.</p></div> : null}

      {currentState === "errored" ? <div className="video-state-card errored" role="alert"><div className="video-state-heading"><span className="video-error-icon">!</span><div><strong>Video processing failed</strong><span>Mux could not prepare this video</span></div></div><p className="video-error-detail">{displayLesson.video_error ?? "No additional error details are available."}</p><p className="video-state-help">This lesson already has an upload record. Replacement uploads are not currently supported.</p></div> : null}

      {refreshError ? <p className="video-sync-notice" role="status">{refreshError}</p> : null}
      {error ? <p className="teacher-error" role="alert">{error}</p> : null}
      {uploadExists && currentState !== "uploading" ? <p className="video-existing-note">This lesson already has a video. A new upload cannot replace it.</p> : null}
      {!uploadExists ? <div className={`video-dropzone ${dragging ? "dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void uploadVideo(event.dataTransfer.files[0]); }}><FileVideo size={22} aria-hidden="true" /><strong>Drop a video here</strong><span>or</span><button className="btn btn-outline" type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>Choose video</button><small>MP4, MOV, or WebM · maximum 2 GB</small></div> : null}
      <input ref={inputRef} className="video-file-input" type="file" accept={ACCEPTED_VIDEO_TYPES.join(",")} disabled={uploading || uploadExists} onChange={(event) => { void uploadVideo(event.target.files?.[0]); event.currentTarget.value = ""; }} aria-label="Choose lesson video" />
    </>}
  </section>;
}
