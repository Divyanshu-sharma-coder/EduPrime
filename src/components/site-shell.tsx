"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Container } from "./ui";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className={`site-nav ${scrolled ? "scrolled" : ""} ${hidden && !menuOpen ? "hidden" : ""}`}>
        <Container className="nav-inner">
          <Link className="brand" href="/" onClick={closeMenu}><span className="brand-mark">E</span>EduPrime</Link>
          <nav className="nav-links" aria-label="Primary navigation">
            <Link href="#courses">Courses</Link>
            <Link href="#teachers">Teachers</Link>
            <Link href="#pricing">Pricing</Link>
          </nav>
          <div className="nav-actions">
            <Link href="#footer">Login</Link>
            <Link className="btn btn-gold" href="#start">Get Started <ArrowRight size={16} /></Link>
          </div>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </Container>
      </header>
      <nav className={`mobile-menu ${menuOpen ? "open" : ""}`} aria-label="Mobile navigation">
        <Link href="#courses" onClick={closeMenu}>Courses</Link>
        <Link href="#teachers" onClick={closeMenu}>Teachers</Link>
        <Link href="#pricing" onClick={closeMenu}>Pricing</Link>
        <Link href="#start" className="btn btn-gold" onClick={closeMenu}>Get Started <ArrowRight size={18} /></Link>
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
          <div><h3>Explore</h3><div className="footer-links"><Link href="#courses">Courses</Link><Link href="#teachers">Teachers</Link><Link href="#pricing">Pricing</Link></div></div>
          <div><h3>Company</h3><div className="footer-links"><Link href="#why">Why EduPrime</Link><Link href="#faq">FAQ</Link><Link href="#start">Contact</Link></div></div>
          <div><h3>Stay in the loop</h3><p>Weekly study ideas, no noise.</p><Link className="btn btn-outline" href="#start">Join the newsletter</Link></div>
        </div>
        <div className="footer-bottom"><span>© 2026 EduPrime. Made for meaningful progress.</span><span>Privacy · Terms</span></div>
      </Container>
    </footer>
  );
}
