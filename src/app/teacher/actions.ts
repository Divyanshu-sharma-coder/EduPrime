"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function revalidateCourseCatalog(slug?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["teacher", "admin", "developer"].includes(profile.role)) return;
  revalidatePath("/courses");
  if (slug) revalidatePath(`/courses/${slug}`);
}
