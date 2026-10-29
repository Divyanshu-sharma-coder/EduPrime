"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { getSafeNextPath } from "@/lib/auth/redirect";

type AuthMode = "login" | "signup" | "forgot" | "reset";

const copy: Record<AuthMode, { eyebrow: string; title: string; description: string; submit: string }> = {
  login: { eyebrow: "Welcome back", title: "Keep your momentum.", description: "Sign in to pick up exactly where you left off.", submit: "Sign in" },
  signup: { eyebrow: "Start learning", title: "Make your hours count.", description: "Create your free EduPrime account and find your next step.", submit: "Create account" },
  forgot: { eyebrow: "Account recovery", title: "Find your way back in.", description: "Enter your email and we will send a secure reset link.", submit: "Send reset link" },
  reset: { eyebrow: "New password", title: "Set a fresh password.", description: "Choose a strong password you will remember.", submit: "Update password" },
};

function AuthShell({ mode, children }: { mode: AuthMode; children: React.ReactNode }) {
  const content = copy[mode];
  return <main className="auth-page"><section className="auth-art"><Link className="brand" href="/"><span className="brand-mark">E</span>EduPrime</Link><div className="auth-art-copy"><span className="section-kicker">Learn with purpose</span><h1>Welcome back.<br /><em>The journey continues.</em></h1><p>A focused learning space for the questions you are ready to answer.</p><div className="auth-art-card"><ShieldCheck size={18} /><span>Private by design<strong>Your learning space stays yours.</strong></span></div></div><div className="auth-art-scene" aria-hidden="true"><div className="scene-orb scene-orb-one" /><div className="scene-orb scene-orb-two" /><div className="scene-window"><span /><span /><span /></div><div className="scene-desk"><div className="scene-laptop"><div className="scene-screen"><span>Today&apos;s focus</span><strong>Keep going.</strong><i /></div></div><div className="scene-plant"><i /><i /><i /></div></div></div><blockquote className="auth-quote">“Small steps become a path when you can see them clearly.”<cite>— EduPrime</cite></blockquote></section><section className="auth-form-panel"><div className="auth-form-wrap"><span className="section-kicker">{content.eyebrow}</span><h1>{content.title}</h1><p>{content.description}</p>{children}</div></section></main>;
}

function ErrorMessage({ message }: { message: string | null }) {
  return message ? <p className="auth-error" role="alert">{message}</p> : null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get("error") ? "Google sign-in could not be completed. Please try again." : null);
  const [loading, setLoading] = useState(false);
  const next = getSafeNextPath(searchParams.get("next"));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", next);
    const { error: oauthError } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl.toString() } });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  return <AuthShell mode="login"><form className="auth-form" onSubmit={submit}><label>Email address<span className="auth-input"><Mail size={17} /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></span></label><label>Password<span className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? "text" : "password"} required minLength={6} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label><div className="auth-form-row"><Link href="/forgot-password">Forgot password?</Link></div><ErrorMessage message={error} /><button className="btn btn-gold auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : null}{loading ? "Signing in..." : "Sign in"} <ArrowRight size={16} /></button><div className="auth-divider"><span>or continue with</span></div><button className="btn btn-outline auth-google" type="button" onClick={signInWithGoogle} disabled={loading}>Continue with Google</button><p className="auth-switch">New to EduPrime? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></p></form></AuthShell>;
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const next = getSafeNextPath(searchParams.get("next"));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", next);
    const { data, error: signUpError } = await createClient().auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: callbackUrl.toString() } });
    if (signUpError) {
      setError(signUpError.message);
    } else if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setMessage("Check your email to verify your account, then sign in.");
    }
    setLoading(false);
  }

  return <AuthShell mode="signup"><form className="auth-form" onSubmit={submit}><label>Your name<span className="auth-input"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Aarav Mehta" /></span></label><label>Email address<span className="auth-input"><Mail size={17} /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></span></label><label>Password<span className="auth-input"><LockKeyhole size={17} /><input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></span></label><ErrorMessage message={error} />{message ? <p className="auth-success" role="status">{message}</p> : null}<button className="btn btn-gold auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : null}{loading ? "Creating account..." : "Create account"} <ArrowRight size={16} /></button><p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p></form></AuthShell>;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset-password` });
    if (resetError) setError(resetError.message);
    else setMessage("If an account exists for that email, a secure reset link is on its way.");
    setLoading(false);
  }

  return <AuthShell mode="forgot"><form className="auth-form" onSubmit={submit}><label>Email address<span className="auth-input"><Mail size={17} /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></span></label><ErrorMessage message={error} />{message ? <p className="auth-success" role="status">{message}</p> : null}<button className="btn btn-gold auth-submit" disabled={loading}>{loading ? "Sending..." : "Send reset link"} <ArrowRight size={16} /></button><p className="auth-switch"><Link href="/login">Back to sign in</Link></p></form></AuthShell>;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else router.push("/login?message=password_updated");
    setLoading(false);
  }

  return <AuthShell mode="reset"><form className="auth-form" onSubmit={submit}><label>New password<span className="auth-input"><LockKeyhole size={17} /><input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></span></label><ErrorMessage message={error} /><button className="btn btn-gold auth-submit" disabled={loading}>{loading ? "Updating..." : "Update password"} <ArrowRight size={16} /></button></form></AuthShell>;
}
