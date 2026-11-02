import Link from "next/link";
import { Container } from "./ui";

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
