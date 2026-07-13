'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowLeft, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const DEPT_ICONS = { GSS: '📚', COS: '💻', MTH: '📐', PHY: '⚡' };
const DEPT_COLORS = { GSS: '#130f40', COS: '#1a5276', MTH: '#7d3c98', PHY: '#c0392b' };

function CourseRow({ course, deptColor, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted active:scale-[0.99]"
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold"
        style={{ background: deptColor || '#636e72' }}
      >
        <BookOpen className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{course.title}</div>
        <div className="text-xs text-muted-foreground">{course.code}</div>
      </div>
    </button>
  );
}

function SectionHeader({ label, color, count }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
      <div className="size-2 rounded-full" style={{ background: color }} />
      <span className="text-sm font-bold">{label}</span>
      <span className="ml-auto text-xs text-muted-foreground">{count}</span>
    </div>
  );
}

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/courses?limit=50').then((r) => r.json()),
      fetch('/api/categories?limit=20').then((r) => r.json()),
      fetch('/api/departments').then((r) => r.json()).catch(() => ({ docs: [] })),
      fetch('/api/curriculum').then((r) => r.json()).catch(() => ({ docs: [] })),
    ])
      .then(([coursesData, catsData, deptData, currData]) => {
        setCourses(coursesData.docs || []);
        setCategories(catsData.docs || []);
        setDepartments(deptData.docs || []);
        setCurriculum(currData.docs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const navigateToCourse = (code) => {
    router.push(`/courses/${code.toLowerCase().replace(/\s+/g, '')}`);
  };

  const q = searchQuery.toLowerCase();

  const courseMap = {};
  for (const c of courses) courseMap[c.code] = c;

  const deptMap = {};
  for (const d of departments) deptMap[d.code] = d;

  // ── CATEGORY VIEW ──
  const grouped = {};
  for (const cat of categories) {
    if (cat.code) grouped[cat.code] = { title: cat.title, color: cat.color, courses: [] };
  }
  for (const course of courses) {
    const prefix = (course.code || '').split(/\s/)[0];
    if (grouped[prefix]) {
      grouped[prefix].courses.push(course);
    } else {
      if (!grouped['other']) grouped['other'] = { title: 'Other', color: '#636e72', courses: [] };
      grouped['other'].courses.push(course);
    }
  }
  let categoryEntries = Object.entries(grouped).filter(([, g]) => g.title !== 'Other' || g.courses.length > 0);
  if (q) {
    categoryEntries = categoryEntries
      .map(([k, g]) => [k, { ...g, courses: g.courses.filter(c => c.code?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q)) }])
      .filter(([, g]) => g.courses.length > 0);
  }

  // ── DEPARTMENT VIEW ──
  const deptLevels = {};
  for (const entry of curriculum) {
    const deptCode = entry.department_code;
    if (!deptLevels[deptCode]) deptLevels[deptCode] = {};
    if (!deptLevels[deptCode][entry.level]) deptLevels[deptCode][entry.level] = [];
    for (const cc of entry.course_codes) {
      deptLevels[deptCode][entry.level].push(courseMap[cc] || { code: cc, title: cc });
    }
  }
  let filteredDepts = Object.entries(deptLevels);
  if (q) {
    filteredDepts = filteredDepts.map(([code, levels]) => [
      code,
      Object.fromEntries(
        Object.entries(levels)
          .map(([level, items]) => [level, items.filter(c => c.code?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q))])
          .filter(([, items]) => items.length > 0)
      ),
    ]).filter(([, levels]) => Object.keys(levels).length > 0);
  }

  // ── LEVEL VIEW ──
  const allLevels = {};
  for (const entry of curriculum) {
    if (!allLevels[entry.level]) allLevels[entry.level] = {};
    const dept = deptMap[entry.department_code];
    if (!allLevels[entry.level][entry.department_code]) {
      allLevels[entry.level][entry.department_code] = { title: dept?.title || entry.department_code, color: dept?.color || '#636e72', courses: [] };
    }
    for (const cc of entry.course_codes) {
      allLevels[entry.level][entry.department_code].courses.push(courseMap[cc] || { code: cc, title: cc });
    }
  }
  let levelEntries = Object.entries(allLevels).sort();
  if (q) {
    levelEntries = levelEntries.map(([level, deptCourses]) => [
      level,
      Object.fromEntries(
        Object.entries(deptCourses)
          .map(([dc, data]) => [dc, { ...data, courses: data.courses.filter(c => c.code?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q)) }])
          .filter(([, data]) => data.courses.length > 0)
      ),
    ]).filter(([, dc]) => Object.keys(dc).length > 0);
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center overflow-x-hidden pb-24">
        <div className="space-y-3 w-full max-w-sm px-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold">Courses</h1>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-3 px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="category">
          <TabsList className="w-full">
            <TabsTrigger value="category">Category</TabsTrigger>
            <TabsTrigger value="department">Department</TabsTrigger>
            <TabsTrigger value="level">Level</TabsTrigger>
          </TabsList>

          {/* ── CATEGORY VIEW ── */}
          <TabsContent value="category" className="mt-3">
            {categoryEntries.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <p className="text-sm">No courses found</p>
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {categoryEntries.map(([key, group]) => (
                  <div key={key}>
                    <SectionHeader label={group.title} color={DEPT_COLORS[key] || '#636e72'} count={group.courses.length} />
                    <div className="divide-y divide-border">
                      {group.courses.map((course, i) => (
                        <CourseRow
                          key={course.id || i}
                          course={course}
                          deptColor={DEPT_COLORS[key] || '#636e72'}
                          onClick={() => navigateToCourse(course.code)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── DEPARTMENT VIEW ── */}
          <TabsContent value="department" className="mt-3">
            {filteredDepts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <p className="text-sm">No departments found</p>
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {filteredDepts.map(([deptCode, levels]) => {
                  const dept = deptMap[deptCode];
                  const color = dept?.color || '#636e72';
                  const total = Object.values(levels).reduce((s, arr) => s + arr.length, 0);
                  return (
                    <div key={deptCode}>
                      <SectionHeader label={dept?.title || deptCode} color={color} count={total} />
                      <div className="divide-y divide-border">
                        {Object.entries(levels).sort().map(([level, items]) =>
                          items.map((course, i) => (
                            <CourseRow
                              key={course.code || i}
                              course={course}
                              deptColor={color}
                              onClick={() => navigateToCourse(course.code)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── LEVEL VIEW ── */}
          <TabsContent value="level" className="mt-3">
            {levelEntries.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <p className="text-sm">No levels found</p>
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {levelEntries.map(([level, deptCourses]) => {
                  const total = Object.values(deptCourses).reduce((s, d) => s + d.courses.length, 0);
                  return (
                    <div key={level}>
                      <SectionHeader label={level} color="#e67e22" count={total} />
                      <div className="divide-y divide-border">
                        {Object.entries(deptCourses).map(([deptCode, { courses: items }]) =>
                          items.map((course, i) => (
                            <CourseRow
                              key={course.code || i}
                              course={course}
                              deptColor={deptMap[deptCode]?.color || '#636e72'}
                              onClick={() => navigateToCourse(course.code)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
