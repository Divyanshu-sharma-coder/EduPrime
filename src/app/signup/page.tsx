import { SignupForm } from "@/components/auth-forms";
import { Suspense } from "react";

export default function SignupPage() {
  return <Suspense fallback={<main className="auth-page" />}><SignupForm /></Suspense>;
}
