import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui";
import { Footer, Navbar } from "@/components/site-shell";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Fdashboard");
  }

  return <><Navbar /><main className="public-main dashboard-page"><section className="public-hero"><Container><span className="section-kicker">Your learning space</span><h1>Welcome back.</h1><p>Keep your momentum going with a clearer next step.</p></Container></section><section className="section"><Container><div className="dashboard-welcome"><h2>Ready to learn?</h2><p>Browse the EduPrime course library and choose what you want to work on next.</p><Link className="btn btn-gold" href="/courses">Explore courses <ArrowRight size={16} /></Link></div></Container></section></main><Footer /></>;
}
