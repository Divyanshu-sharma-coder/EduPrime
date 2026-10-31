"use server";

import { revalidatePath } from "next/cache";
import { requireServerRoles } from "@/lib/auth/authorization";

export async function revalidateCourseCatalog(slug?: string) {
  const auth = await requireServerRoles(["teacher", "admin", "developer"]);
  if ("error" in auth) return;
  revalidatePath("/courses");
  if (slug) revalidatePath(`/courses/${slug}`);
}
