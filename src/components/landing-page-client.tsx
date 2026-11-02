"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, BarChart3, CirclePlay, Flame, Star, Video } from "lucide-react";
import { Container, Section, SectionHeading } from "./ui";

const reveal = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } };

export function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return <motion.div className={className} initial={reduce ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.18 }} transition={{ duration: reduce ? 0 : 0.55, delay, ease: [0.22, 1, 0.36, 1] }} variants={reveal}>{children}</motion.div>;
}

export function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="hero">
      <Container className="hero-inner">
        <motion.div className="hero-copy" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="hero-eyebrow"><span className="eyebrow-dot" /> A better way to learn</div>
          <h1>Make every hour of learning <span style={{ color: "var(--gold-300)" }}>count.</span></h1>
          <p className="hero-subtitle">Live classes, expert teachers and a clearer path to your next milestone. EduPrime brings your entire learning journey into focus.</p>
          <div className="hero-actions"><Link className="btn btn-gold" href="#courses">Explore courses <ArrowRight size={17} /></Link><Link className="btn btn-outline" href="#demo"><CirclePlay size={17} /> See how it works</Link></div>
          <div className="hero-proof"><div className="avatar-stack"><span className="avatar">A</span><span className="avatar">R</span><span className="avatar">K</span></div><span>Trusted by 12,000+ learners finding their flow</span></div>
        </motion.div>
        <motion.div className="hero-visual" initial={reduce ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }}>
          <div className="dashboard-card"><div className="dashboard-top"><span>My learning space</span><span>Today · 72%</span></div><div className="dashboard-grid"><div className="dash-tile dash-wide"><span>Weekly momentum</span><strong>On a roll <Flame size={17} style={{ display: "inline", color: "var(--gold-300)" }} /></strong><div className="progress-line" /></div><div className="dash-tile"><span>Lessons</span><strong>24</strong></div><div className="dash-tile"><span>Streak</span><strong>12d</strong></div></div></div>
          <motion.div className="float-card float-live" animate={reduce ? undefined : { y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}><span className="card-icon"><Video size={16} /></span><span>Live now<strong>Physics · 10:30 AM</strong></span></motion.div>
          <motion.div className="float-card float-score" animate={reduce ? undefined : { y: [0, 7, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}><span className="card-icon"><Star size={16} /></span><span>Quiz score<strong>92% · Excellent</strong></span></motion.div>
          <motion.div className="float-card float-progress" animate={reduce ? undefined : { y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}><span className="card-icon"><BarChart3 size={16} /></span><span>Course progress<strong>72% complete</strong></span></motion.div>
        </motion.div>
      </Container>
    </section>
  );
}

const steps = [
  ["01", "Choose your direction", "Find a course that fits your goal, level and learning rhythm."],
  ["02", "Learn from the best", "Join live rooms or settle into recordings made for clarity."],
  ["03", "Practice deliberately", "Use short tests and feedback to turn knowledge into confidence."],
  ["04", "Succeed your way", "Track your progress and keep moving with a plan you can trust."],
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!sectionRef.current || window.matchMedia("(max-width: 767px)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      ScrollTrigger.create({ trigger: sectionRef.current, start: "top top", end: "+=1200", pin: true, scrub: true, onUpdate: (self) => {
        const nextActive = Math.min(3, Math.floor(self.progress * 4));
        setActive((currentActive) => currentActive === nextActive ? currentActive : nextActive);
      } });
    }, sectionRef);
    return () => ctx.revert();
  }, []);
  return <Section ref={sectionRef} className="dark-section" id="how"><Container><SectionHeading eyebrow="How it works" title="A clear path from curious to capable." copy="Small steps compound. EduPrime makes the next one obvious." light /><div className="steps-layout"><div className="step-list">{steps.map(([number, title, copy], index) => <button key={number} className={`step-button ${active === index ? "active" : ""}`} onClick={() => setActive(index)}><span className="step-number">{number}</span><span><strong>{title}</strong><span>{copy}</span></span></button>)}</div><div className="mockup" aria-label="Learning dashboard preview"><div className="mockup-bar"><i /><i /><i /></div><div className="mockup-content"><div className="mockup-side"><div /><div /><div /><div /><div /></div><div className="mockup-main"><span className="section-kicker">Your learning space</span><h3 style={{ margin: "10px 0", color: "var(--ivory-50)", fontFamily: "var(--font-playfair)" }}>{steps[active][1]}</h3><p style={{ color: "var(--mist-200)", fontSize: "0.78rem" }}>{steps[active][2]}</p><div className="mockup-chart"><i style={{ height: `${45 + active * 8}%` }} /><i /><i /><i /><i /><i /></div></div></div></div></div></Container></Section>;
}
