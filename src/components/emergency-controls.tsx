"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, UnlockKeyhole } from "lucide-react";
import { setEmergencyMode } from "@/app/developer/actions";

export function EmergencyControls({ locked, initialMode }: { locked: boolean; initialMode?: "lock" | "unlock" }) {
  const [mode, setMode] = useState<"lock" | "unlock">(initialMode ?? (locked ? "unlock" : "lock"));
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const result = await setEmergencyMode(password, mode === "lock");
    setMessage(result.error ?? (mode === "lock" ? "Emergency mode enabled." : "Emergency mode disabled."));
    if (!result.error) setPassword("");
    setSaving(false);
  }

  return <section className="control-card emergency-control-card">
    <div className="control-card-heading"><div><span className="section-kicker">Break-glass control</span><h2>Emergency mode</h2></div><span className={`emergency-status ${locked ? "locked" : "ready"}`}>{locked ? "ACTIVE" : "INACTIVE"}</span></div>
    <p>{locked ? "The platform is currently unavailable to normal visitors." : "Use this only when the platform must be taken offline."}</p>
    <div className="emergency-mode-tabs"><button className={mode === "lock" ? "active" : ""} onClick={() => setMode("lock")} type="button"><LockKeyhole size={15} /> Lock platform</button><button className={mode === "unlock" ? "active" : ""} onClick={() => setMode("unlock")} type="button"><UnlockKeyhole size={15} /> Unlock platform</button></div>
    <form onSubmit={submit}><label>{mode === "lock" ? "Emergency lock password" : "Emergency unlock password"}<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="btn btn-gold" disabled={saving}>{saving ? "Verifying..." : mode === "lock" ? "Confirm lock" : "Confirm unlock"}</button></form>
    {message ? <p className={message.includes("incorrect") || message.includes("required") || message.includes("configured") ? "control-error" : "control-success"} role="alert">{message}</p> : null}
  </section>;
}
