'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type CourseInfo = {
  courseCode: string;
  courseTitle: string;
  sectionName: string;
};

// ─── Nav config ───────────────────────────────────────────────────────────────

const TABS = [
  { href: 'calendar',      label: 'Calendar',     icon: '📅' },
  { href: 'announcements', label: 'Announcements', icon: '📢' },
  { href: 'syllabus',      label: 'Syllabus',      icon: '📋' },
  { href: 'gradebook',     label: 'Gradebook',     icon: '📊' },
  { href: 'forums',        label: 'Forums',        icon: '💬' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function primaryInstructor(
  instructors: Array<{ role: string; users: { first_name: string; last_name: string } | null }> | null
): string {
  if (!instructors || instructors.length === 0) return 'TBA';
  const primary = instructors.find(i => i.role === 'primary') ?? instructors[0];
  if (!primary.users) return 'TBA';
  return `${primary.users.first_name} ${primary.users.last_name}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClassLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = params?.id as string;
  const base = `/dashboard/class/${id}`;

  const [course, setCourse] = useState<CourseInfo | null>(null);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase
      .from('course_offerings')
      .select(`
        id, section_name,
        courses!fk_course_offerings_course(code, title),
        course_instructors(
          role,
          users!fk_course_instructors_instructor(first_name, last_name)
        )
      `)
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        setCourse({
          courseCode:   d.courses?.code ?? '',
          courseTitle:  `${d.courses?.code ?? ''}-${d.section_name ?? ''} ${d.courses?.title ?? ''}`,
          sectionName:  d.section_name ?? '',
        });
      });
  }, [id]);

  const isActive = (href: string) => {
    if (href === 'calendar') return pathname === base || pathname === `${base}/calendar`;
    return (pathname ?? '').startsWith(`${base}/${href}`);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* ── Course tab bar ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 shrink-0">

        {/* Course info strip */}
        <div className="px-6 pt-2.5 pb-0 flex items-center gap-2.5 min-h-[32px]">
          {course ? (
            <>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                {course.sectionName}
              </span>
              <span className="text-sm font-semibold text-gray-800 truncate">{course.courseTitle}</span>
            </>
          ) : (
            <div className="h-4 bg-gray-100 rounded w-48 animate-pulse" />
          )}
        </div>

        {/* Tab row */}
        <nav className="flex items-end gap-0 px-4 overflow-x-auto">
          {TABS.map(tab => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href === 'calendar' ? base : `${base}/${tab.href}`}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[#4c1d95] text-[#4c1d95]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 px-8 py-6">
        {children}
      </div>
    </div>
  );
}
