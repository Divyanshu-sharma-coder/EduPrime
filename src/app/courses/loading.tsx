export default function CoursesLoading() {
  return <main className="public-main loading-page" aria-label="Loading courses">
    <div className="loading-hero" />
    <section className="section"><div className="site-container"><div className="loading-grid">{[1, 2, 3].map((item) => <div className="loading-card" key={item}><span /><div><i /><i /><i /></div></div>)}</div></div></section>
  </main>;
}
