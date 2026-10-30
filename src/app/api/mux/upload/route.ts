import { z } from "zod";
import { cancelMuxDirectUpload, createMuxDirectUpload } from "@/lib/mux/server";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  lessonId: z.string().uuid(),
});

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return errorResponse("A valid lessonId is required.", 400);

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) return errorResponse("Unable to verify your session.", 401);
  if (!user) return errorResponse("You must be signed in.", 401);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return errorResponse("Unable to verify your permissions.", 500);
  if (!profile || !["teacher", "admin", "developer"].includes(profile.role)) {
    return errorResponse("Teacher, admin, or developer access is required.", 403);
  }

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, module_id, mux_upload_id, video_status")
    .eq("id", parsed.data.lessonId)
    .maybeSingle();
  if (lessonError) return errorResponse("Unable to load the lesson.", 500);
  if (!lesson) return errorResponse("Lesson not found.", 404);

  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select("course_id")
    .eq("id", lesson.module_id)
    .maybeSingle();
  if (moduleError) return errorResponse("Unable to load the lesson module.", 500);
  if (!module) return errorResponse("Lesson module not found.", 404);

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, teacher_id")
    .eq("id", module.course_id)
    .maybeSingle();
  if (courseError) return errorResponse("Unable to load the lesson course.", 500);
  if (!course) return errorResponse("Lesson course not found.", 404);

  if (profile.role === "teacher" && course.teacher_id !== user.id) {
    return errorResponse("You can only manage lessons in your own courses.", 403);
  }

  if (typeof lesson.mux_upload_id === "string" && lesson.mux_upload_id.trim()) {
    const activeUpload = lesson.video_status === "pending" || lesson.video_status === "preparing";
    return errorResponse(
      activeUpload
        ? "This lesson already has an active Mux upload. Wait for it to finish before starting another upload."
        : "This lesson already has a Mux upload. Handle the existing upload before starting another one.",
      409,
    );
  }

  let upload: Awaited<ReturnType<typeof createMuxDirectUpload>>;
  try {
    upload = await createMuxDirectUpload(new URL(request.url).origin);
  } catch {
    return errorResponse("Unable to create a Mux upload right now.", 502);
  }

  if (!upload.id || !upload.url) {
    try {
      await cancelMuxDirectUpload(upload.id);
    } catch {
      // The upload is not returned to the browser when its URL is unavailable.
    }
    return errorResponse("Mux did not return a usable upload URL.", 502);
  }

  const { data: claimedLesson, error: updateError } = await supabase
    .from("lessons")
    .update({
      mux_upload_id: upload.id,
      video_status: "pending",
    })
    .eq("id", lesson.id)
    .is("mux_upload_id", null)
    .select("id")
    .maybeSingle();

  if (updateError || !claimedLesson) {
    try {
      await cancelMuxDirectUpload(upload.id);
    } catch {
      // Preserve the database error response if cleanup is unavailable.
    }
    if (!updateError && !claimedLesson) {
      return errorResponse("A Mux upload is already being prepared for this lesson.", 409);
    }
    return errorResponse("Unable to save the Mux upload for this lesson.", 500);
  }

  return Response.json({
    uploadId: upload.id,
    uploadUrl: upload.url,
  });
}
