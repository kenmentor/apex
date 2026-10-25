'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const FALLBACK_COLORS = { GSS: '#130f40', COS: '#1a5276', CSC: '#0e6655', MTH: '#7d3c98', PHY: '#c0392b', MED: '#F43F5E' };

function SectionHeader({ label, count }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
      <span className="text-sm font-bold">{label}</span>
      <span className="ml-auto text-xs text-muted-foreground">{count}</span>
    </div>
  );
}

function CourseRow({ course, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted active:scale-[0.99]"
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold"
        style={{ background: color || '#636e72' }}
      >
        <BookOpen className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{course.title || course.code}</div>
        <div className="text-xs text-muted-foreground">{course.code}</div>
      </div>
    </button>
  );
}

export default function DepartmentPage() {
  const params = useParams();
  const router = useRouter();
  const [dept, setDept] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const code = (params.code || '').toLowerCase();
    if (!code) return;
    setLoading(true);
    fetch(`/api/departments/${code}`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json() })
      .then(d => { setDept(d); setLoading(false) })
      .catch(() => setLoading(false));
  }, [params.code]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center overflow-x-hidden pb-24">
        <div className="space-y-3 w-full max-w-lg px-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!dept) {
    return (
      <div className="flex min-h-dvh items-center justify-center overflow-x-hidden pb-24">
        <div className="flex flex-col items-center gap-3 px-4 text-center">
          <p className="text-sm text-muted-foreground">Department not found</p>
          <Link href="/departments" className="text-sm font-medium text-primary">Back to Departments</Link>
        </div>
      </div>
    );
  }

  const color = dept.color || FALLBACK_COLORS[dept.code] || '#636e72';
  const levelEntries = Object.entries(dept.levels || {}).sort(([a], [b]) => a.localeCompare(b));
  const totalCourses = levelEntries.reduce((s, [, courses]) => s + courses.length, 0);

  return (
    <div className="mx-auto min-h-dvh max-w-2xl space-y-5 px-5 pb-28 pt-6 overflow-x-hidden">
      <header className="flex items-center gap-3">
        <Link href="/departments" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold">Departments</h1>
      </header>

      <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
        <div className="absolute -right-6 -top-6 size-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 right-8 size-24 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-base font-bold backdrop-blur-sm">
            {dept.code?.slice(0, 3)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold">{dept.title}</div>
            <div className="text-xs text-white/70">{totalCourses} course{totalCourses === 1 ? '' : 's'}</div>
          </div>
        </div>
      </div>

      {levelEntries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <p className="text-sm">No courses in this department yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {levelEntries.map(([level, courses]) => (
            <div key={level} className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              <SectionHeader label={level} count={courses.length} />
              <div className="divide-y divide-border">
                {courses.map((course, i) => (
                  <CourseRow
                    key={course.code || i}
                    course={course}
                    color={color}
                    onClick={() => router.push(`/courses/${(course.code || '').toLowerCase().replace(/\s+/g, '')}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}