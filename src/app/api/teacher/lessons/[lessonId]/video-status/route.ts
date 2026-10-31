import { z } from "zod";
import { getAuthorizationContext } from "@/lib/auth/authorization";

const lessonIdSchema = z.string().uuid();

export async function GET(_request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const parsed = lessonIdSchema.safeParse((await params).lessonId);
  if (!parsed.success) return Response.json({ error: "A valid lesson is required." }, { status: 400 });

  const auth = await getAuthorizationContext();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: 401 });
  if (!["teacher", "admin", "developer"].includes(auth.role)) {
    return Response.json({ error: "Teacher, admin, or developer access is required." }, { status: 403 });
  }

  const { data: lesson, error: lessonError } = await auth.supabase
    .from("lessons")
    .select("id, mux_upload_id, mux_asset_id, mux_playback_id, video_status, video_error, video_ready_at, module_id")
    .eq("id", parsed.data)
    .maybeSingle();
  if (lessonError) return Response.json({ error: "Unable to load the lesson video status." }, { status: 500 });
  if (!lesson) return Response.json({ error: "Lesson not found." }, { status: 404 });

  const { data: module, error: moduleError } = await auth.supabase
    .from("modules")
    .select("course_id")
    .eq("id", lesson.module_id)
    .maybeSingle();
  if (moduleError) return Response.json({ error: "Unable to verify the lesson course." }, { status: 500 });
  if (!module) return Response.json({ error: "Lesson course not found." }, { status: 404 });

  const { data: course, error: courseError } = await auth.supabase
    .from("courses")
    .select("teacher_id")
    .eq("id", module.course_id)
    .maybeSingle();
  if (courseError) return Response.json({ error: "Unable to verify the lesson owner." }, { status: 500 });
  if (!course) return Response.json({ error: "Lesson course not found." }, { status: 404 });
  if (auth.role === "teacher" && course.teacher_id !== auth.user.id) {
    return Response.json({ error: "You can only view video status for your own courses." }, { status: 403 });
  }

  return Response.json({
    lessonId: lesson.id,
    videoStatus: lesson.video_status,
    muxUploadId: lesson.mux_upload_id,
    muxAssetId: lesson.mux_asset_id,
    muxPlaybackId: lesson.mux_playback_id,
    videoReadyAt: lesson.video_ready_at,
    videoError: lesson.video_error,
  });
}
