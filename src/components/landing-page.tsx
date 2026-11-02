import Link from "next/link";
import { ArrowRight, Award, BarChart3, BookOpen, ChevronRight, LineChart, MessageCircle, Play, Video } from "lucide-react";
import { courses } from "@/data/courses";
import { Container, Section, SectionHeading } from "./ui";
import { Footer } from "./footer";
import { Navbar } from "./site-shell";
import { FadeIn, Hero, HowItWorks } from "./landing-page-client";

const features = [
  { icon: Video, title: "Live, not lonely", copy: "Ask questions in real time and learn alongside a focused community." },
  { icon: Play, title: "Learn at your pace", copy: "Replay clear, chaptered lessons whenever your best study hour arrives." },
  { icon: BarChart3, title: "Practice with purpose", copy: "Instant feedback shows exactly where your next hour matters most." },
  { icon: MessageCircle, title: "Doubts, resolved", copy: "Get unstuck with thoughtful answers tied directly to your lesson." },
  { icon: LineChart, title: "See your momentum", copy: "Simple progress signals make every small win visible." },
  { icon: Award, title: "Celebrate milestones", copy: "Build a record of effort you can carry into your next chapter." },
];

const testimonials = [
  ["“EduPrime made studying feel less like catching up and more like moving forward.”", "Aarav Mehta", "Grade 10 · 94% in boards"],
  ["“The live doubt sessions gave me the confidence to ask better questions.”", "Riya Sharma", "JEE Foundation · Top 5%"],
  ["“I can finally see what I have done, not only what is left to do.”", "Kabir Singh", "NEET Foundation · 2.1x practice"],
];

const faqs = [
  ["Who is EduPrime for?", "EduPrime is designed for ambitious school students and exam learners who want expert teaching, structure and visible progress in one calm place."],
  ["Can I learn from my phone?", "Yes. The experience is mobile-first, with touch-friendly controls and lessons that work beautifully from 360px upward."],
  ["Are the classes live or recorded?", "Both. Join scheduled live classes for interaction, then revisit the recordings and notes whenever you need a second pass."],
  ["How do I choose the right course?", "Start with your grade or exam goal. Our course cards show the level, time commitment and learning outcomes to make the choice clearer."],
];

const pricePlans: Array<{ name: string; price: string; perks: string[] }> = [
  { name: "Focus", price: "₹799", perks: ["1 course access", "Weekly practice sets", "Community support"] },
  { name: "Momentum", price: "₹1,499", perks: ["All foundation courses", "Live doubt rooms", "Progress insights"] },
  { name: "Mastery", price: "₹2,499", perks: ["All course access", "1:1 mentor check-ins", "Priority support"] },
];

function TrustStrip() {
  return <section className="trust-strip"><Container><div className="trust-grid">{[["12k+", "Learners growing"], ["48", "Expert-led courses"], ["4.9/5", "Average rating"], ["91%", "Goal achievers"]].map(([value, label]) => <FadeIn key={label}><div><span className="stat-value">{value}</span><span className="stat-label">{label}</span></div></FadeIn>)}</div></Container><div className="marquee-wrap"><div className="marquee">{["JEE FOUNDATION", "NEET FOUNDATION", "CBSE", "MATHEMATICS", "PHYSICS", "BIOLOGY", "CHEMISTRY", "JEE FOUNDATION", "NEET FOUNDATION", "CBSE", "MATHEMATICS", "PHYSICS", "BIOLOGY", "CHEMISTRY"].map((item, index) => <span key={`${item}-${index}`}>✦ {item}</span>)}</div></div></section>;
}

function Features() {
  return <Section id="why"><Container><SectionHeading eyebrow="Why EduPrime" title="Structure for the curious. Support for the determined." copy="Everything you need to turn intention into a learning habit that lasts." /><div className="features-grid">{features.map(({ icon: Icon, title, copy }, index) => <FadeIn key={title} delay={index * 0.05}><article className="feature-card"><span className="feature-icon"><Icon size={21} strokeWidth={1.5} /></span><h3>{title}</h3><p>{copy}</p></article></FadeIn>)}</div></Container></Section>;
}

function CoursesAndTeachers() {
  return <><Section id="courses"><Container><SectionHeading eyebrow="Featured courses" title="Learn something that moves you forward." copy="Thoughtfully paced courses, made by teachers who care about the lightbulb moment." /><div className="carousel">{courses.map((course) => <article className="course-card" key={course.title}><div className={`course-art ${course.accent}`}><span>{course.subject}</span><BookOpen size={42} strokeWidth={1} /></div><div className="course-body"><h3>{course.title}</h3><p>{course.level} · Built for steady progress</p><div className="course-meta"><span>{course.duration}</span><strong>{course.students}</strong></div></div></article>)}</div><Link className="btn btn-ghost" href="#start" style={{ marginTop: 18 }}>View all courses <ChevronRight size={16} /></Link></Container></Section><Section id="teachers" className="dark-section"><Container><SectionHeading eyebrow="Meet your teachers" title="Experts who make complex feel possible." copy="Warm, rigorous and invested in your questions." light /><div className="teachers-grid">{[["AS", "Ananya Shah", "Mathematics · 12 years"], ["RK", "Rahul Kapoor", "Physics · IIT Delhi"], ["MS", "Meera Sethi", "Biology · 9 years"]].map(([initials, name, subject]) => <FadeIn key={name}><article className="teacher-card"><div className="teacher-photo">{initials}</div><div className="teacher-info"><h3>{name}</h3><p>{subject}</p></div></article></FadeIn>)}</div></Container></Section></>;
}

function LowerSections() {
  return <><Section id="demo"><Container><SectionHeading eyebrow="Your progress, visible" title="A dashboard that keeps the big picture close." copy="See lessons, streaks and next steps at a glance, so your energy goes into learning—not organising it." /><FadeIn><div className="demo-wrap"><div className="demo-screen"><span className="section-kicker">Good morning, Aarav</span><h3>Keep your momentum.</h3><div className="demo-stats"><div className="demo-stat"><strong>72%</strong><span>Course progress</span></div><div className="demo-stat"><strong>12 days</strong><span>Current streak</span></div><div className="demo-stat"><strong>94%</strong><span>Latest result</span></div></div><div className="progress-line" /></div></div></FadeIn></Container></Section><section className="section testimonials"><Container><SectionHeading eyebrow="Learner notes" title="Progress feels better together." copy="A few words from learners building their next chapter." /><div className="quote-grid">{testimonials.map(([quote, name, detail], index) => <FadeIn key={name} delay={index * 0.06}><article className="quote-card"><span className="quote-mark">“</span><blockquote>{quote}</blockquote><div className="quote-by"><span className="avatar">{name[0]}</span><span><strong>{name}</strong><br />{detail}</span></div></article></FadeIn>)}</div></Container></section><Section id="pricing" className="pricing-section dark-section"><Container><SectionHeading eyebrow="Simple pricing" title="Choose the pace that fits your ambition." copy="Start with the support you need today. Upgrade when you are ready." light /><div className="pricing-grid">{pricePlans.map(({ name, price, perks }, index) => <article className={`price-card ${index === 1 ? "featured" : ""}`} key={name}><h3>{name}{index === 1 && <span style={{ float: "right", color: "var(--gold-300)", fontSize: "0.65rem" }}>MOST POPULAR</span>}</h3><div className="price">{price}<small>/month</small></div><ul>{perks.map((perk) => <li key={perk}>{perk}</li>)}</ul><Link className={`btn ${index === 1 ? "btn-gold" : "btn-outline"}`} href="#start">Get started <ArrowRight size={15} /></Link></article>)}</div></Container></Section><Section id="faq"><Container><SectionHeading eyebrow="Questions, answered" title="No guesswork required." copy="If you still have a question, our team is one message away." /><div className="faq-list">{faqs.map(([question, answer]) => <details className="faq-item" key={question}><summary>{question}<ChevronRight size={18} style={{ float: "right" }} /></summary><p>{answer}</p></details>)}</div></Container></Section><section id="start" className="section final-cta"><Container><div className="section-heading"><span className="section-kicker">Your next chapter starts here</span><h2 className="section-title">Ready to make your hours count?</h2><p className="section-copy">Join a learning space built around your focus, your questions and your goals.</p><Link className="btn btn-gold" href="#courses" style={{ marginTop: 24 }}>Explore EduPrime <ArrowRight size={17} /></Link></div></Container></section></>;
}

export default function LandingPage() {
  return <><Navbar /><main><Hero /><TrustStrip /><Features /><HowItWorks /><CoursesAndTeachers /><LowerSections /></main><Footer /></>;
}
