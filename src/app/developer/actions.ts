"use server";

import { scryptSync, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function matchesConfiguredSecret(candidate: string, variableName: "DEVELOPER_LOCK_PASSWORD" | "DEVELOPER_UNLOCK_PASSWORD") {
  const configured = process.env[variableName];
  if (!configured) throw new Error(`${variableName} is not configured on the server.`);
  const salt = "eduprime-emergency-control-v1";
  const candidateHash = scryptSync(candidate, salt, 32);
  const configuredHash = scryptSync(configured, salt, 32);
  return timingSafeEqual(candidateHash, configuredHash);
}

async function requireDeveloper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "You must be signed in." };
  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (error || profile?.role !== "developer") return { supabase, error: "Developer access is required." };
  return { supabase, user };
}

export async function setEmergencyMode(password: string, locked: boolean) {
  const auth = await requireDeveloper();
  if (auth.error) return { error: auth.error };
  if (!password) return { error: "Enter the password to continue." };

  try {
    const variableName = locked ? "DEVELOPER_LOCK_PASSWORD" : "DEVELOPER_UNLOCK_PASSWORD";
    if (!matchesConfiguredSecret(password, variableName)) return { error: "The password is incorrect." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Emergency mode is not configured." };
  }

  const { error } = await auth.supabase.rpc("set_emergency_lock", { locked });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  revalidatePath("/developer");
  return { ok: true, locked };
}
