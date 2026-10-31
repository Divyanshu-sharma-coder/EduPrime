"use server";

import { revalidatePath } from "next/cache";
import { requireServerRoles } from "@/lib/auth/authorization";

export async function changeUserRole(userId: string, role: "student" | "teacher" | "admin" | "developer") {
  const auth = await requireServerRoles(["admin", "developer"]);
  if ("error" in auth) return { error: auth.error };

  const { error } = await auth.supabase.rpc("set_user_role", {
    target_user_id: userId,
    requested_role: role,
  });
  if (error) return { error: "Unable to change the user's role." };

  revalidatePath("/admin");
  revalidatePath("/developer");
  return { ok: true };
}
