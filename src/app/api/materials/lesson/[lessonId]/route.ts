import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "You must be signed in." }, { status: 401 });

  const { data: materials, error } = await supabase.from("materials")
    .select("id, title, file_name, file_type, file_size, downloadable, created_at, updated_at")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ materials: materials ?? [] });
}
