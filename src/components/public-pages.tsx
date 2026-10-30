"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, Filter, Mail, MapPin, Play, Search, Users, X } from "lucide-react";
import { courses } from "@/data/courses";
import type { CatalogCourse } from "@/lib/courses";
import { getCourseThumbnailUrl, initials, sanitizeCourseHtml } from "@/lib/courses";
import { Container, Section } from "./ui";
import { Footer, Navbar } from "./site-shell";
import { createClient } from "@/lib/supabase/browser";

const filters = ["All", "School", "JEE", "NEET", "Skills"];
const levels = ["All levels", "Beginner", "Intermediate", "Advanced"];
const languages = ["All languages", "English", "Hindi", "Hinglish", "Other"];

function PublicShell({ children }: { children: React.ReactNode }) {
  return <><Navbar /><main className="public-main">{children}</main><Footer /></>;
}

function PageIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <section className="public-hero"><Container><span className="section-kicker">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></Container></section>;
}

function CourseCard({ course }: { course: CatalogCourse }) {
  const thumbnail = getCourseThumbnailUrl(course.thumbnail);
  return <article className="catalog-card"><div className="catalog-art">{thumbnail ? <img src={thumbnail} alt="" /> : <span className="catalog-placeholder">{initials(course.title)}</span>}<span className="catalog-badge">{course.category_id || "General"}</span></div><div className="catalog-body"><div className="catalog-rating"><span>{course.teacher_name}</span></div><h2>{course.title}</h2><p>{course.short_description || course.description}</p><div className="catalog-meta"><span><Users size={14} /> {course.level}</span><span>{course.language}</span></div><div className="catalog-footer"><strong>₹{course.price.toLocaleString("en-IN")}</strong><Link className="btn btn-gold" href={`/courses/${course.slug}`}>View course <ArrowRight size={15} /></Link></div></div></article>;
}

export function CoursesPage({ courses, loadError }: { courses: CatalogCourse[]; loadError?: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [level, setLevel] = useState("All levels");
  const [language, setLanguage] = useState("All languages");
  const [sort, setSort] = useState("Popular");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const visibleCourses = useMemo(() => {
    const filtered = courses.filter((course) => {
      const matchesQuery = `${course.title} ${course.category_id ?? ""} ${course.teacher_name}`.toLowerCase().includes(query.toLowerCase());
      return matchesQuery && (category === "All" || course.category_id === category) && (level === "All levels" || course.level === level) && (language === "All languages" || course.language === language);
    });
    return [...filtered].sort((a, b) => sort === "Price: low to high" ? a.price - b.price : sort === "Price: high to low" ? b.price - a.price : a.title.localeCompare(b.title));
  }, [category, courses, language, level, query, sort]);
  return <PublicShell><PageIntro eyebrow="The course library" title="Find the right next step." copy="Focused courses, thoughtful teachers and a pace that respects your real life." /><Section><Container>{loadError ? <div className="empty-results"><Search size={28} /><h2>{loadError}</h2></div> : <><div className="catalog-toolbar"><button className="filter-trigger" onClick={() => setFiltersOpen(true)}><Filter size={16} /> Filters</button><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses, subjects or teachers" aria-label="Search courses" /></label><label className="sort-field"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Popular</option><option>Price: low to high</option><option>Price: high to low</option></select></label></div><div className="catalog-layout"><aside className={`filter-panel ${filtersOpen ? "open" : ""}`}><div className="filter-panel-head"><strong>Filter courses</strong><button onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={20} /></button></div><FilterSelect label="Category" value={category} options={filters} onChange={setCategory} /><FilterSelect label="Level" value={level} options={levels} onChange={setLevel} /><FilterSelect label="Language" value={language} options={languages} onChange={setLanguage} /><button className="btn btn-outline filter-clear" onClick={() => { setCategory("All"); setLevel("All levels"); setLanguage("All languages"); setFiltersOpen(false); }}>Clear filters</button></aside><div className="catalog-results"><div className="results-header"><span>{visibleCourses.length} courses found</span><span>Published courses</span></div>{visibleCourses.length > 0 ? <div className="catalog-grid">{visibleCourses.map((course) => <CourseCard key={course.id} course={course} />)}</div> : <div className="empty-results"><Search size={28} /><h2>{courses.length === 0 ? "No courses available yet." : "No courses match that search."}</h2><p>{courses.length === 0 ? "Check back soon for new learning opportunities." : "Try a broader subject or clear one of the filters."}</p></div>}</div></div></>}</Container></Section></PublicShell>;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="filter-select"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function CourseVisual({ course }: { course: CatalogCourse }) {
  const thumbnail = getCourseThumbnailUrl(course.thumbnail);
  return <div className="detail-visual">{thumbnail ? <img src={thumbnail} alt="" /> : <span className="detail-placeholder">{initials(course.title)}</span>}<span className="catalog-badge">{course.category_id || "General"} · {course.level}</span></div>;
}

function EnrolButton({ slug, mobile = false }: { slug: string; mobile?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const { data, error: userError } = await createClient().auth.getUser();
    if (userError) {
      setError("Please try again.");
      setLoading(false);
      return;
    }

    if (!data.user) {
      router.push(`/login?next=${encodeURIComponent(`/courses/${slug}#enrol`)}`);
      return;
    }

    window.location.hash = "enrol";
    setLoading(false);
  }

  return <><button className="btn btn-gold" type="button" onClick={handleClick} disabled={loading}>{loading ? "Checking..." : "Enrol now"}{!mobile && <ArrowRight size={16} />}</button>{error ? <span className="auth-error" role="alert">{error}</span> : null}</>;
}

function CourseTabs({ course }: { course: CatalogCourse }) {
  const [tab, setTab] = useState("Overview");
  const tabs = ["Overview", "Syllabus", "Teacher", "Course info"];
  return <div className="course-tabs"><div className="tab-list" role="tablist">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)} role="tab" aria-selected={tab === item}>{item}</button>)}</div>{tab === "Overview" && <div className="tab-content"><h2>Learn with a clearer plan.</h2><div className="rich-description" dangerouslySetInnerHTML={{ __html: sanitizeCourseHtml(course.description) }} /></div>}{tab === "Syllabus" && <div className="syllabus-list">{(course.modules ?? []).length === 0 ? <p className="teacher-description">The syllabus is being prepared.</p> : (course.modules ?? []).map((module, index) => <details key={module.id} open={index === 0}><summary><span><strong>{String(index + 1).padStart(2, "0")}</strong>{module.title}</span><ChevronDown size={17} /></summary><p>{module.lessons.length} lesson{module.lessons.length === 1 ? "" : "s"} available</p></details>)}</div>}{tab === "Teacher" && <div className="teacher-bio"><div className="teacher-avatar">{initials(course.teacher_name)}</div><div><h2>{course.teacher_name}</h2><p>Your course instructor for this learning path.</p></div></div>}{tab === "Course info" && <div className="detail-benefits"><span><Check size={16} /> Level: {course.level}</span><span><Check size={16} /> Language: {course.language}</span><span><Check size={16} /> Category: {course.category_id || "General"}</span></div>}</div>;
}

export function CourseDetailPage({ course }: { course: CatalogCourse }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  return <PublicShell><Section className="detail-hero"><Container><Link className="back-link" href="/courses"><ArrowLeft size={16} /> All courses</Link><div className="detail-hero-grid"><div><div className="catalog-rating"><span>{course.category_id || "General"} · {course.level}</span></div><h1>{course.title}</h1><p>{course.short_description || course.description}</p><div className="detail-byline"><div className="teacher-avatar small">{initials(course.teacher_name)}</div><span>Created by <strong>{course.teacher_name}</strong></span></div></div><CourseVisual course={course} /></div></Container></Section><Section className="detail-content"><Container><div className="detail-layout"><div><CourseTabs course={course} /></div><aside className="enrol-card" id="enrol"><span className="section-kicker">Start learning</span><h2>Build your momentum.</h2><div className="enrol-price">₹{course.price.toLocaleString("en-IN")} <small>one-time</small></div><ul><li><Check size={16} /> Published course access</li><li><Check size={16} /> Structured modules and lessons</li><li><Check size={16} /> Study materials where available</li></ul><EnrolButton slug={course.slug} /></aside></div></Container></Section><div className="mobile-enrol-bar"><strong>₹{course.price.toLocaleString("en-IN")}</strong><EnrolButton slug={course.slug} mobile /></div>{previewOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Preview lesson"><div className="preview-modal"><button className="modal-close" type="button" onClick={() => setPreviewOpen(false)} aria-label="Close preview"><X size={20} /></button><div className="preview-player"><Play size={40} fill="currentColor" /></div><span className="section-kicker">Course preview</span><h2>{course.title}</h2><p>Preview content will be available when a lesson preview is configured.</p></div></div>}</PublicShell>;
}

const contactSchema = z.object({ name: z.string().min(2, "Please enter your name"), email: z.string().email("Enter a valid email address"), message: z.string().min(10, "Tell us a little more (10 characters minimum)") });
type ContactValues = z.infer<typeof contactSchema>;

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) });
  return <PublicShell><PageIntro eyebrow="We are here to help" title="Let’s talk about your next step." copy="Questions about a course, a learning goal or simply where to begin? Send us a note." /><Section><Container><div className="contact-grid"><div><div className="contact-card"><MapPin size={20} /><div><h2>Visit the learning studio</h2><p>12 Knowledge Lane<br />New Delhi, 110001</p></div></div><div className="contact-card"><Mail size={20} /><div><h2>Email our team</h2><p>hello@eduprime.example<br />Usually replies within one working day.</p></div></div></div><form className="contact-form" onSubmit={handleSubmit(() => setSubmitted(true))}>{submitted ? <div className="form-success"><span><Check size={22} /></span><h2>Message received.</h2><p>Thanks for reaching out. We will be in touch soon.</p><button type="button" className="btn btn-outline" onClick={() => setSubmitted(false)}>Send another message</button></div> : <><label>Your name<input {...register("name")} placeholder="Aarav Mehta" />{errors.name && <small>{errors.name.message}</small>}</label><label>Email address<input {...register("email")} placeholder="you@example.com" type="email" />{errors.email && <small>{errors.email.message}</small>}</label><label>How can we help?<textarea {...register("message")} placeholder="Tell us what is on your mind..." rows={5} />{errors.message && <small>{errors.message.message}</small>}</label><button className="btn btn-gold" type="submit">Send message <ArrowRight size={16} /></button></>}</form></div></Container></Section></PublicShell>;
}

export function SimplePublicPage({ type }: { type: "pricing" | "about" | "teachers" }) {
  if (type === "teachers") return <TeachersPage />;
  const isPricing = type === "pricing";
  return <PublicShell><PageIntro eyebrow={isPricing ? "Simple pricing" : "The EduPrime story"} title={isPricing ? "Choose the pace that fits your ambition." : "A calmer way to make progress."} copy={isPricing ? "Start with the support you need today. Upgrade when you are ready." : "EduPrime exists to make high-quality learning feel more human, more focused and easier to sustain."} /><Section><Container><div className="story-grid">{isPricing ? <div className="public-pricing-grid">{[["Focus", "₹799", "For one clear goal"], ["Momentum", "₹1,499", "For steady growth"], ["Mastery", "₹2,499", "For the whole journey"]].map(([name, price, copy], index) => <article className={`price-card public-price-card ${index === 1 ? "featured" : ""}`} key={name}><span className="section-kicker">{copy}</span><h2>{name}</h2><div className="price">{price}<small>/month</small></div><ul><li>Course access</li><li>Practice sets</li><li>Learning support</li></ul><Link className={`btn ${index === 1 ? "btn-gold" : "btn-outline"}`} href="/courses">Explore courses <ArrowRight size={15} /></Link></article>)}</div> : <><div className="story-art"><span>Learn</span><strong>with<br />purpose.</strong></div><div className="story-copy"><span className="section-kicker">Why we started</span><h2>Learning should give you energy, not take it away.</h2><p>We built EduPrime around a simple belief: when great teaching meets a clear plan and a little encouragement, learners do extraordinary things.</p><p>Our platform brings live classes, recordings, practice and progress into one focused space—so students can spend less time organising and more time understanding.</p><Link className="btn btn-gold" href="/courses">Find your course <ArrowRight size={16} /></Link></div></>}</div></Container></Section></PublicShell>;
}

function TeachersPage() {
  return <PublicShell><PageIntro eyebrow="The people behind the lessons" title="Experts who make complex feel possible." copy="Meet patient, rigorous teachers who care about the questions behind the answers." /><Section><Container><div className="teacher-directory">{courses.map((course) => <Link className="directory-card" href={`/teachers/${course.teacher.toLowerCase().replaceAll(" ", "-")}`} key={course.teacher}><div className={`directory-photo ${course.accent}`}>{course.teacher.split(" ").map((part) => part[0]).join("")}</div><div><h2>{course.teacher}</h2><p>{course.subject} · {course.level}</p><span>View profile <ChevronRight size={15} /></span></div></Link>)}</div></Container></Section></PublicShell>;
}

export function TeacherDetailPage({ teacher }: { teacher: string }) {
  const course = courses.find((item) => item.teacher.toLowerCase().replaceAll(" ", "-") === teacher) ?? courses[0];
  return <PublicShell><Section className="teacher-detail-page"><Container><Link className="back-link" href="/teachers"><ArrowLeft size={16} /> All teachers</Link><div className="teacher-detail-grid"><div className={`directory-photo large ${course.accent}`}>{course.teacher.split(" ").map((part) => part[0]).join("")}</div><div><span className="section-kicker">Teacher profile</span><h1>{course.teacher}</h1><p className="teacher-role">{course.subject} educator · {course.level}</p><p>“My goal is to make the first explanation clear enough that learners feel brave enough to ask the second question.”</p><div className="teacher-stats"><span><strong>12+</strong> years teaching</span><span><strong>4.9</strong> average rating</span><span><strong>2.4k</strong> learners</span></div><Link className="btn btn-gold" href={`/courses/${course.slug}`}>Explore {course.subject} course <ArrowRight size={16} /></Link></div></div></Container></Section></PublicShell>;
}
