'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { Book, Monitor, Ruler } from 'lucide-react';

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch('/api/categories?limit=20').then((r) => r.json()),
      fetch('/api/courses?limit=20').then((r) => r.json()),
    ])
      .then(([catsData, coursesData]) => {
        setCategories(catsData.docs || []);
        setCourses(coursesData.docs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const featuredCourse = courses[0];

  if (loading) {
    return (
      <div className="app-wrapper">
        <div className="quiz-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 16 }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <div className="quiz-container">
        <div className="home-header">
          <img src="/just-logo.png" alt="Apex" style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover' }} />
          <div className="home-welcome">
            <h2>Apex</h2>
            <p>Master your exams with past questions</p>
          </div>
        </div>

        <div className="promo-banner">
          <h3 style={{ color: 'white', fontSize: 22 }}>Practice anywhere, anytime.</h3>
          <div className="promo-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
        </div>

        <div className="search-bar" onClick={() => router.push('/courses')} style={{ cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span>Search courses</span>
        </div>

        <div className="section-header">
          <h3>Categories</h3>
          <Link href="/courses" className="view-all">View All</Link>
        </div>

        <div className="categories-grid">
          {categories.slice(0, 1).map((cat) => (
            <Link
              key={cat.id}
              href={`/courses/${featuredCourse?.code?.toLowerCase().replace(/\s+/g, '') || ''}`}
              className="cat-card-large"
              style={{ background: `linear-gradient(180deg, ${cat.color || '#130f40'}, #2c2c54)` }}
            >
              <div className="planet-art" style={{ background: '#ff9f43' }} />
              <div className="planet-ring" />
              <span>{cat.title}</span>
              <span className="cat-sub">{cat.courseCount || 1} course{cat.courseCount !== 1 ? 's' : ''}</span>
            </Link>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {categories.slice(1, 4).map((cat) => (
              <Link
                key={cat.id}
                href={`/courses?cat=${cat.code}`}
                className="cat-card-small"
                style={{
                  background: `linear-gradient(135deg, ${cat.color || '#4a69bd'}, ${cat.color || '#6a89cc'})`,
                  opacity: (cat.courseCount || 0) > 0 ? 1 : 0.6,
                }}
              >
                <span>{cat.icon || <Book size={18} />}</span>
                <span>{cat.title}</span>
                {cat.courseCount > 0 && <span className="cat-badge">{cat.courseCount} courses</span>}
              </Link>
            ))}
            {categories.length <= 1 && (
              <>
                <Link href="/courses?cat=COS" className="cat-card-small" style={{ background: 'linear-gradient(135deg, #4a69bd, #6a89cc)' }}>
                  <span><Monitor size={18} /></span>
                  <span>Computer Science</span>
                </Link>
                {categories.length <= 1 && (
                  <Link href="/courses?cat=MTH" className="cat-card-small" style={{ background: 'linear-gradient(135deg, #05c46b, #0be881)', opacity: 0.6 }}>
                    <span><Ruler size={18} /></span>
                    <span>Mathematics</span>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {featuredCourse && (
          <>
            <div className="section-header" style={{ marginTop: 16 }}>
              <h3>Featured Course</h3>
              <Link href={`/courses/${featuredCourse.code.toLowerCase().replace(/\s+/g, '')}`} className="view-all">View</Link>
            </div>
            <Link
              href={`/courses/${featuredCourse.code.toLowerCase().replace(/\s+/g, '')}`}
              className="featured-course-card"
              style={{ textDecoration: 'none', display: 'block', background: `linear-gradient(135deg, ${featuredCourse.color || '#130f40'}, #2c2c54)`, borderRadius: 24, padding: 24, color: 'white' }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{featuredCourse.icon || 'Φ'}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{featuredCourse.code}</div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>{featuredCourse.title}</div>
            </Link>
          </>
        )}

        <NavBar active="/" />
      </div>
    </div>
  );
}
