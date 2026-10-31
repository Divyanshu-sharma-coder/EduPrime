"use server";

import { scryptSync, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireServerRoles } from "@/lib/auth/authorization";

function matchesConfiguredSecret(candidate: string, variableName: "DEVELOPER_LOCK_PASSWORD" | "DEVELOPER_UNLOCK_PASSWORD") {
  const configured = process.env[variableName];
  if (!configured) throw new Error(`${variableName} is not configured on the server.`);
  const salt = "eduprime-emergency-control-v1";
  const candidateHash = scryptSync(candidate, salt, 32);
  const configuredHash = scryptSync(configured, salt, 32);
  return timingSafeEqual(candidateHash, configuredHash);
}

async function requireDeveloper() {
  const auth = await requireServerRoles(["developer"]);
  if ("error" in auth) return auth;
  return auth;
}

export async function setEmergencyMode(password: string, locked: boolean) {
  const auth = await requireDeveloper();
  if ("error" in auth) return { error: auth.error };
  if (typeof password !== "string" || !password) return { error: "Enter the password to continue." };

  try {
    const variableName = locked ? "DEVELOPER_LOCK_PASSWORD" : "DEVELOPER_UNLOCK_PASSWORD";
    if (!matchesConfiguredSecret(password, variableName)) return { error: "The password is incorrect." };
  } catch {
    return { error: "Emergency mode is not configured." };
  }

  const { error } = await auth.supabase.rpc("set_emergency_lock", { locked });
  if (error) return { error: "Unable to update emergency mode." };
  revalidatePath("/", "layout");
  revalidatePath("/developer");
  return { ok: true, locked };
}
