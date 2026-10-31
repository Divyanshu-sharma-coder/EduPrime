"use client";

import { useEffect, useMemo, useState } from "react";
import { Upload, Video } from "lucide-react";

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
  if (lesson.video_status === "errored") return "Video processing failed";
  if (lesson.video_status === "ready") return "Video ready";
  if (lesson.mux_upload_id || lesson.video_status === "pending" || lesson.video_status === "preparing") return "Mux is processing";
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

  const uploadExists = Boolean(displayLesson?.mux_upload_id);

  return <section className="teacher-card lesson-video-panel">
    <div className="teacher-card-heading">
      <div><span className="section-kicker">Lesson Video</span><h2>{lesson ? lesson.title : "Select a lesson"}</h2></div>
      <Video size={24} aria-hidden="true" />
    </div>
    {!displayLesson ? <p className="teacher-description">Select a lesson to manage its video.</p> : <>
      <p className="teacher-description">Upload a lesson recording directly to Mux. Mux will process it before it can be watched.</p>
      <div className="lesson-video-status"><span>Status</span><strong>{statusLabel(displayLesson, uploading, progress)}</strong></div>
      {displayLesson.video_error ? <p className="teacher-error" role="alert">{displayLesson.video_error}</p> : null}
      {error ? <p className="teacher-error" role="alert">{error}</p> : null}
      {refreshError ? <p className="teacher-description" role="status">{refreshError}</p> : null}
      {uploaded && displayLesson.video_status !== "ready" && displayLesson.video_status !== "errored" ? <p className="teacher-notice" role="status">Upload complete. Mux is processing the video...</p> : null}
      {uploadExists ? <p className="teacher-description">This lesson already has a video. Status: {statusLabel(displayLesson, false, progress)}. A new upload cannot replace it.</p> : <label className="video-upload-picker">
        <span className="btn btn-gold"><Upload size={16} /> Choose video</span>
        <input type="file" accept={ACCEPTED_VIDEO_TYPES.join(",")} disabled={uploading} onChange={(event) => { void uploadVideo(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        <small>MP4, MOV, or WebM · maximum 2 GB</small>
      </label>}
      {uploading ? <progress className="video-upload-progress" value={progress} max="100" aria-label={`Video upload ${progress}%`} /> : null}
    </>}
  </section>;
}
