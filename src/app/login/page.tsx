import { LoginForm } from "@/components/auth-forms";
import { Suspense } from "react";

export default function LoginPage() {
  return <Suspense fallback={<main className="auth-page" />}><LoginForm /></Suspense>;
}
