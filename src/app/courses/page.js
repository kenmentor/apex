'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Construction, SearchX, Monitor, Ruler, Zap, Book } from 'lucide-react';

const CATEGORY_ICONS = {
  GSS: <BookOpen size={18} />,
  COS: <Monitor size={18} />,
  MTH: <Ruler size={18} />,
  PHY: <Zap size={18} />,
};

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/courses?limit=50').then((r) => r.json()),
      fetch('/api/categories?limit=20').then((r) => r.json()),
    ])
      .then(([coursesData, catsData]) => {
        setCourses(coursesData.docs || []);
        setCategories(catsData.docs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Group courses by category code
  const grouped = {};
  for (const cat of categories) {
    const catCode = cat.code || '';
    if (catCode) grouped[catCode] = { title: cat.title, icon: cat.icon, color: cat.color, courses: [] };
  }
  for (const course of courses) {
    const code = course.code || '';
    const prefix = code.split(/\s/)[0] || '';
    if (grouped[prefix]) {
      grouped[prefix].courses.push(course);
    } else {
      if (!grouped['other']) grouped['other'] = { title: 'Other Courses', icon: null, color: '#636e72', courses: [] };
      grouped['other'].courses.push(course);
    }
  }
  // Ensure GSS group exists
  if (!grouped['GSS']) grouped['GSS'] = { title: 'General Studies (GSS)', icon: null, color: '#130f40', courses: [] };

  let entries = Object.entries(grouped).filter(([, g]) => g.title !== 'Other Courses' || g.courses.length > 0);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    entries = entries
      .map(([key, g]) => [key, { ...g, courses: g.courses.filter(c => c.code?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q)) }])
      .filter(([, g]) => g.courses.length > 0);
  }

  if (loading) {
    return (
      <div className="app-wrapper">
        <div className="quiz-container">
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <div className="quiz-container">
        <div className="top-bar" style={{ marginBottom: 16 }}>
          <Link href="/" className="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="screen-title-center">Courses</div>
          <div className="back-btn" style={{ background: 'none' }}></div>
        </div>

        <div className="search-bar" style={{ marginTop: 0, marginBottom: 20 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search courses (e.g., COS 101)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 14, fontFamily: 'Poppins, sans-serif', color: 'var(--text-dark)' }}
          />
        </div>

        {entries.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8 }}>
            <SearchX size={40} opacity={0.4} />
            <div style={{ fontSize: 14 }}>No courses match "{searchQuery}"</div>
          </div>
        ) : (
          <div className="catalog-scroll">
            {entries.map(([key, group]) => (
              <div key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[key] || group.icon || <Book size={18} />}</span>
                  <span className="category-group-title" style={{ marginBottom: 0 }}>{group.title}</span>
                </div>
                <div className="course-grid">
                  {group.courses.length === 0 ? (
                    <div
                      className="course-card"
                      onClick={() => router.push(`/courses/${key.toLowerCase()}101`)}
                      style={{ cursor: 'pointer', opacity: 0.5 }}
                    >
                      <div className="course-icon" style={{ background: group.color || '#636e72' }}><Construction size={16} /></div>
                      <div className="course-code">{key} 101</div>
                      <div className="course-title">Coming soon</div>
                    </div>
                  ) : (
                    group.courses.map((course, i) => (
                      <div
                        key={course.id || i}
                        className="course-card"
                        onClick={() => router.push(`/courses/${course.code.toLowerCase().replace(/\s+/g, '')}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="course-icon" style={{ background: course.color || group.color || '#130f40' }}>
                          {course.icon && course.icon.length === 1 ? course.icon : CATEGORY_ICONS[key] || <Book size={18} />}
                        </div>
                        <div className="course-code">{course.code}</div>
                        <div className="course-title">{course.title}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
