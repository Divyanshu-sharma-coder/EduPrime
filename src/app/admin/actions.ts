"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function changeUserRole(userId: string, role: "student" | "teacher" | "admin" | "developer") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.rpc("set_user_role", {
    target_user_id: userId,
    requested_role: role,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/developer");
  return { ok: true };
}
