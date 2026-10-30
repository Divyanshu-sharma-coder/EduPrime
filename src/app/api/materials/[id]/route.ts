import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_SECONDS = 10 * 60;

async function getMaterial(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "You must be signed in." };

  const { data: material, error } = await supabase.from("materials")
    .select("id, course_id, lesson_id, title, file_name, file_type, file_size, storage_path, downloadable, created_at, updated_at")
    .eq("id", id)
    .single();
  if (error || !material || !material.storage_path) return { supabase, error: "Material not found or no longer available." };
  return { supabase, user, material };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMaterial(id);
  if ("error" in result) return Response.json({ error: result.error }, { status: 404 });

  const { data, error } = await result.supabase.storage.from("study-materials").createSignedUrl(result.material.storage_path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) return Response.json({ error: "This material link has expired or is unavailable." }, { status: 404 });
  return Response.redirect(data.signedUrl);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMaterial(id);
  if ("error" in result) return Response.json({ error: result.error }, { status: 404 });

  const body = await request.json() as { title?: unknown; downloadable?: unknown };
  if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 120 || typeof body.downloadable !== "boolean") {
    return Response.json({ error: "Provide a title up to 120 characters and a downloadable setting." }, { status: 400 });
  }

  const { data, error } = await result.supabase.from("materials").update({
    title: body.title.trim(),
    downloadable: body.downloadable,
  }).eq("id", id).select("id, title, file_name, file_type, file_size, storage_path, downloadable, created_at, updated_at").single();
  if (error || !data) return Response.json({ error: error?.message ?? "Unable to update material." }, { status: 400 });
  return Response.json({ material: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMaterial(id);
  if ("error" in result) return Response.json({ error: result.error }, { status: 404 });

  const { error: storageError } = await result.supabase.storage.from("study-materials").remove([result.material.storage_path]);
  if (storageError) return Response.json({ error: storageError.message }, { status: 400 });
  const { error } = await result.supabase.from("materials").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
