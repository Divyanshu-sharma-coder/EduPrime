import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const FILE_TYPES = {
  pdf: {
    mime: "application/pdf",
    extensions: [".pdf"],
  },
  ppt: {
    mime: "application/vnd.ms-powerpoint",
    extensions: [".ppt", ".pptx"],
  },
  doc: {
    mime: "application/msword",
    extensions: [".doc", ".docx"],
  },
} as const;

function getFileType(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return Object.keys(FILE_TYPES).find((key) => {
    const value = FILE_TYPES[key as keyof typeof FILE_TYPES];
    return value.extensions.some((item) => item === extension) && (
    !file.type || file.type === value.mime ||
    (value === FILE_TYPES.ppt && file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation") ||
    (value === FILE_TYPES.doc && file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    );
  }) as keyof typeof FILE_TYPES | undefined;
}

async function getStaffContext(courseId: string, lessonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "You must be signed in." };

  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profileError || !profile || !["teacher", "admin", "developer"].includes(profile.role)) {
    return { supabase, error: "Teacher or admin access is required." };
  }

  const { data: course, error: courseError } = await supabase.from("courses").select("id, teacher_id").eq("id", courseId).single();
  const { data: lesson, error: lessonError } = await supabase.from("lessons").select("id, module_id").eq("id", lessonId).single();
  if (courseError || lessonError || !course || !lesson) return { supabase, error: "The selected course or lesson does not exist." };
  const { data: module, error: moduleError } = await supabase.from("modules").select("course_id").eq("id", lesson.module_id).single();
  if (moduleError || !module || module.course_id !== course.id) return { supabase, error: "The lesson does not belong to the selected course." };
  if (profile.role === "teacher" && course.teacher_id !== user.id) return { supabase, error: "You can only manage materials in your own courses." };

  return { supabase, user, course };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const courseId = formData.get("courseId");
  const lessonId = formData.get("lessonId");
  const title = formData.get("title");
  const downloadable = formData.get("downloadable") === "true";

  if (!(file instanceof File) || typeof courseId !== "string" || typeof lessonId !== "string" || typeof title !== "string") {
    return Response.json({ error: "A file, title, course, and lesson are required." }, { status: 400 });
  }
  if (!title.trim() || title.length > 120) return Response.json({ error: "Title must be between 1 and 120 characters." }, { status: 400 });
  if (file.size === 0 || file.size > MAX_FILE_SIZE) return Response.json({ error: "Files must be smaller than 25 MB." }, { status: 400 });

  const fileType = getFileType(file);
  if (!fileType) return Response.json({ error: "Only PDF, PPT, PPTX, DOC, and DOCX files are supported." }, { status: 400 });

  const context = await getStaffContext(courseId, lessonId);
  if ("error" in context) return Response.json({ error: context.error }, { status: 403 });

  const materialId = crypto.randomUUID();
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const storagePath = `${courseId}/${lessonId}/${materialId}${extension}`;
  const type = fileType;
  const { data: material, error: insertError } = await context.supabase.from("materials").insert({
    id: materialId,
    course_id: courseId,
    lesson_id: lessonId,
    title: title.trim(),
    file_name: file.name,
    file_type: FILE_TYPES[fileType].mime,
    file_size: file.size,
    storage_path: storagePath,
    file_url: storagePath,
    type,
    downloadable,
  }).select("id, title, file_name, file_type, file_size, storage_path, downloadable, created_at, updated_at").single();

  if (insertError || !material) return Response.json({ error: insertError?.message ?? "Unable to create the material." }, { status: 400 });

  const { error: uploadError } = await context.supabase.storage.from("study-materials").upload(storagePath, file, {
    contentType: FILE_TYPES[fileType].mime,
    upsert: false,
  });
  if (uploadError) {
    await context.supabase.from("materials").delete().eq("id", materialId);
    return Response.json({ error: uploadError.message }, { status: 400 });
  }

  return Response.json({ material }, { status: 201 });
}
