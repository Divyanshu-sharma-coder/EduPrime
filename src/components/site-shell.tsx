"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut, Menu, UserRound, X } from "lucide-react";
import { Container } from "./ui";
import { createClient } from "@/lib/supabase/browser";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let previous = window.scrollY;
    const handleScroll = () => {
      const current = window.scrollY;
      setScrolled(current > 40);
      setHidden(current > previous && current > 120);
      previous = current;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  async function logout() {
    await createClient().auth.signOut();
    setUserEmail(null);
    closeMenu();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className={`site-nav ${scrolled ? "scrolled" : ""} ${hidden && !menuOpen ? "hidden" : ""}`}>
        <Container className="nav-inner">
          <Link className="brand" href="/" onClick={closeMenu}><span className="brand-mark">E</span>EduPrime</Link>
          <nav className="nav-links" aria-label="Primary navigation">
            <Link href="/courses">Courses</Link>
            <Link href="/teachers">Teachers</Link>
            <Link href="/pricing">Pricing</Link>
          </nav>
          <div className="nav-actions">
            {userEmail ? <><Link className="user-menu" href="/dashboard"><UserRound size={15} /> {userEmail.split("@")[0]}</Link><button className="nav-logout" onClick={logout} aria-label="Log out"><LogOut size={16} /></button></> : <Link href="/login">Login</Link>}
            <Link className="btn btn-gold" href={userEmail ? "/dashboard" : "/courses"}>{userEmail ? "Dashboard" : "Get Started"} <ArrowRight size={16} /></Link>
          </div>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </Container>
      </header>
      <nav className={`mobile-menu ${menuOpen ? "open" : ""}`} aria-label="Mobile navigation">
        <Link href="/courses" onClick={closeMenu}>Courses</Link>
        <Link href="/teachers" onClick={closeMenu}>Teachers</Link>
        <Link href="/pricing" onClick={closeMenu}>Pricing</Link>
        {userEmail ? <><Link href="/dashboard" onClick={closeMenu}>Dashboard</Link><button className="mobile-logout" onClick={logout}><LogOut size={18} /> Log out</button></> : <><Link href="/login" onClick={closeMenu}>Login</Link><Link href="/signup" onClick={closeMenu}>Sign up</Link><Link href="/courses" className="btn btn-gold" onClick={closeMenu}>Get Started <ArrowRight size={18} /></Link></>}
      </nav>
    </>
  );
}

export function Footer() {
  return (
    <footer id="footer" className="footer">
      <Container>
        <div className="footer-grid">
          <div><Link className="brand" href="/"><span className="brand-mark">E</span>EduPrime</Link><p>Build momentum. Learn with purpose.<br />A calmer way to reach your next milestone.</p></div>
          <div><h3>Explore</h3><div className="footer-links"><Link href="/courses">Courses</Link><Link href="/teachers">Teachers</Link><Link href="/pricing">Pricing</Link></div></div>
          <div><h3>Company</h3><div className="footer-links"><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/#faq">FAQ</Link></div></div>
          <div><h3>Stay in the loop</h3><p>Weekly study ideas, no noise.</p><Link className="btn btn-outline" href="/contact">Join the newsletter</Link></div>
        </div>
        <div className="footer-bottom"><span>© 2026 EduPrime. Made for meaningful progress.</span><span>Privacy · Terms</span></div>
      </Container>
    </footer>
  );
}
