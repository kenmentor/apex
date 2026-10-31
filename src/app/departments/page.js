'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const FALLBACK_COLORS = { GSS: '#130f40', COS: '#1a5276', CSC: '#0e6655', MTH: '#7d3c98', PHY: '#c0392b', MED: '#F43F5E', Computing: '#1a5276', Sciences: '#0e6655', Engineering: '#b7791f', Environmental: '#2e7d32', Agriculture: '#558b2f', 'Allied-Health': '#00838f', Architecture: '#5d4037', Arts: '#6a1b9a', 'Basic-Medical': '#c62828', Communication: '#1565c0', Education: '#2e7d32', Law: '#37474f', Medicine: '#F43F5E', Pharmacy: '#6a1b9a', 'Social-Sciences': '#ef6c00', Veterinary: '#4e342e' };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [courseMap, setCourseMap] = useState({});
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/departments').then(r => r.json()).catch(() => ({ docs: [] })),
      fetch('/api/courses?limit=50').then(r => r.json()).catch(() => ({ docs: [] })),
      fetch('/api/curriculum').then(r => r.json()).catch(() => ({ docs: [] })),
    ])
      .then(([deptData, coursesData, currData]) => {
        setDepartments(deptData.docs || []);
        const cmap = {};
        for (const c of (coursesData.docs || [])) cmap[c.code] = c;
        setCourseMap(cmap);
        setCurriculum(currData.docs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center overflow-x-hidden pb-24">
        <div className="space-y-3 w-full max-w-lg px-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const counts = {};
  for (const entry of curriculum) {
    if (!counts[entry.department_code]) counts[entry.department_code] = new Set();
    for (const cc of entry.course_codes) {
      if (courseMap[cc]) counts[entry.department_code].add(cc);
    }
  }

  const withCourses = (departments || [])
    .map(d => ({ ...d, count: (counts[d.code] || new Set()).size || d.count || 0 }))
    .filter(d => d.count > 0)
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="mx-auto min-h-dvh max-w-2xl space-y-5 px-5 pb-28 pt-6 overflow-x-hidden">
      <header className="flex items-center gap-3">
        <Link href="/courses" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold">Departments</h1>
      </header>

      {withCourses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <p className="text-sm">No departments with courses yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {withCourses.map(dept => {
            const color = dept.color || FALLBACK_COLORS[dept.code] || '#636e72';
            return (
              <Link
                key={dept.code}
                href={`/departments/${dept.code.toLowerCase()}`}
                className="flex items-center gap-4 rounded-xl p-4 text-white transition-all active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/20 text-sm font-bold backdrop-blur-sm">
                  {dept.code?.slice(0, 3)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{dept.title}</div>
                  <div className="text-xs text-white/70">{dept.count} course{dept.count === 1 ? '' : 's'}</div>
                </div>
                <BookOpen className="size-4 shrink-0 text-white/50" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}