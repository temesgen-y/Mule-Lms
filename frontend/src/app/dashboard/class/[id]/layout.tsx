'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useClassSidebar } from '../../ClassSidebarContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type CourseInfo = {
  offeringId: string;
  sectionName: string;
  courseCode: string;
  courseTitle: string;
  startDate: string;
  endDate: string;
  studentCount: number;
  instructor: string;
};

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV = [
  { href: 'calendar',      label: 'Calendar',      icon: '📅' },
  { href: 'announcements', label: 'Announcements',  icon: '📢' },
  { href: 'syllabus',      label: 'Syllabus',       icon: '📋' },
  { href: 'gradebook',     label: 'Gradebook',      icon: '📊' },
];

const FORUMS = [
  { href: 'forums', label: 'Forums', icon: '💬', badge: null as number | null },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatGcuTime() {
  const d = new Date();
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const hour = d.getHours();
  const min = d.getMinutes();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `GCU Time ${mon} ${day}, ${h}:${min.toString().padStart(2, '0')} ${ampm}`;
}

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
  const { collapsed } = useClassSidebar();

  const [time, setTime] = useState(formatGcuTime());
  const [course, setCourse] = useState<CourseInfo | null>(null);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(formatGcuTime()), 60000);
    return () => clearInterval(t);
  }, []);

  // Fetch real course offering data
  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase
      .from('course_offerings')
      .select(`
        id, section_name, enrolled_count,
        courses!fk_course_offerings_course(code, title),
        academic_terms!fk_course_offerings_term(term_name, start_date, end_date),
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
          offeringId:   d.id,
          sectionName:  d.section_name ?? '',
          courseCode:   d.courses?.code ?? '',
          courseTitle:  `${d.courses?.code ?? ''}-${d.section_name ?? ''} ${d.courses?.title ?? ''}`,
          startDate:    fmt(d.academic_terms?.start_date),
          endDate:      fmt(d.academic_terms?.end_date),
          studentCount: d.enrolled_count ?? 0,
          instructor:   primaryInstructor(d.course_instructors ?? []),
        });
      });

  }, [id]);

  const isActive = (href: string) => {
    if (href === 'calendar') return pathname === base || pathname === `${base}/calendar`;
    return pathname === `${base}/${href}`;
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  const shortCode = course?.courseCode
    ? course.courseCode.replace(/-/g, '\u200B')   // allow wrap on dash
    : '…';

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`${sidebarWidth} flex-shrink-0 border-r border-gray-200 bg-white flex flex-col transition-[width] duration-200 self-stretch`}
      >
        <div
          className={`sidebar-scroll flex flex-col overflow-y-auto overflow-x-hidden min-h-0 ${
            collapsed ? 'items-center py-3 px-2' : 'py-4 px-3'
          }`}
          style={{ maxHeight: 'calc(100vh - 7rem)' }}
        >
          {/* Collapsed icon */}
          <div className={`flex justify-center mb-3 ${collapsed ? '' : 'hidden'}`}>
            <span className="text-2xl" aria-hidden title="Mule LMS">⭐</span>
          </div>

          {/* Course card — expanded */}
          {!collapsed ? (
            <div className="space-y-3 mb-3">
              <p className="text-xl font-bold text-[#1565C0] tracking-tight">MULE LMS</p>

              {course ? (
                <div className="rounded-lg overflow-hidden bg-white shadow-md" title={course.courseTitle}>
                  <div className="h-3 bg-[#FEF08A]" aria-hidden />
                  <div className="px-3 py-3.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#B39DDB] text-white text-xs font-medium">
                        Section {course.sectionName}
                      </span>
                      <span className="text-xs font-medium text-gray-900">{course.courseCode}</span>
                    </div>
                    <h2 className="text-sm font-bold text-gray-900 truncate mt-2.5">{course.courseTitle}</h2>
                    <p className="text-xs text-gray-700 flex items-center gap-1.5 mt-2">
                      <span className="text-gray-600" aria-hidden>📅</span>
                      {course.startDate} - {course.endDate}
                    </p>
                    <p className="text-xs flex items-center gap-1.5 mt-2">
                      <span className="text-gray-600" aria-hidden>👥</span>
                      <span className="text-[#1565C0] font-medium">
                        {course.studentCount} Student{course.studentCount !== 1 ? 's' : ''}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden bg-white shadow-md animate-pulse">
                  <div className="h-3 bg-gray-200" />
                  <div className="px-3 py-3.5 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="rounded-lg mb-3 overflow-hidden bg-white shadow-md px-2 py-2 text-center"
              title={course?.courseTitle}
            >
              <span className="text-gray-800 text-xs font-semibold leading-tight">
                {shortCode.slice(0, 6)}
              </span>
            </div>
          )}

          {/* Clock */}
          <div className={`mb-3 ${collapsed ? 'flex justify-center' : ''}`}>
            {collapsed ? (
              <div className="rounded-lg bg-purple-100 px-2 py-2 text-gray-700 flex justify-center" title={time}>
                <span className="text-lg">🕐</span>
              </div>
            ) : (
              <p className="text-xs text-gray-500 font-medium">{time}</p>
            )}
          </div>

          <div className="border-t border-gray-200 my-2 w-full" />

          {/* MAIN nav */}
          {!collapsed && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Main</p>
          )}
          <nav className={`space-y-1 ${collapsed ? 'flex flex-col items-center gap-1' : ''}`}>
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href === 'calendar' ? base : `${base}/${item.href}`}
                className={`flex items-center rounded text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center w-10 h-10' : 'gap-2 px-3 py-2'
                } ${isActive(item.href) ? 'bg-[#4c1d95] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                title={collapsed ? item.label : undefined}
              >
                <span aria-hidden className="text-base">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* FORUMS */}
          {!collapsed && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-1">Forums</p>
          )}
          <nav className={`space-y-1 ${collapsed ? 'flex flex-col items-center gap-1' : ''}`}>
            {FORUMS.map(item => (
              <Link
                key={item.href}
                href={`${base}/${item.href}`}
                className={`flex items-center rounded text-sm font-medium transition-colors relative ${
                  collapsed ? 'justify-center w-10 h-10' : 'justify-between gap-1.5 px-3 py-2'
                } ${isActive(item.href) ? 'bg-[#4c1d95] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                title={collapsed ? item.label : undefined}
              >
                <span aria-hidden className="text-base flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
                {item.badge != null && (
                  <span className="w-5 h-5 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-200 my-2 w-full" />

          {/* INSTITUTION RESOURCES */}
          {!collapsed && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Institution Resources</p>
          )}
          <nav className={`space-y-0.5 ${collapsed ? 'flex flex-col items-center gap-0.5' : ''}`}>
            {[
              { href: 'mission',                label: 'MS Mission Statement', short: 'MS',  icon: null },
              { href: 'doctrinal-statement',    label: 'DS Doctrinal Statement', short: 'DS', icon: null },
              { href: 'library',                label: 'Library',              short: '📖', icon: '📚' },
              { href: 'student-success-center', label: 'SSC Student Success Center', short: 'SSC', icon: null },
              { href: 'learning-support',       label: 'Learning Support',     short: '👥', icon: '👥' },
              { href: 'classroom-policies',     label: 'Classroom Policies',   short: '📄', icon: '📄' },
            ].map(item => (
              <Link
                key={item.href}
                href={`${base}/${item.href}`}
                className={`flex items-center rounded text-sm transition-colors ${
                  collapsed ? 'justify-center w-10 py-1.5 text-xs' : 'px-3 py-2 gap-2'
                } ${isActive(item.href) ? 'bg-[#4c1d95] text-white font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                title={item.label}
              >
                {collapsed ? (
                  <span>{item.short}</span>
                ) : (
                  <>
                    {item.icon && <span className="text-gray-500" aria-hidden>{item.icon}</span>}
                    {item.label}
                  </>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div
        className="main-content-scroll flex-1 min-w-0 min-h-0 overflow-y-scroll overflow-x-hidden bg-white pl-8 pr-8 py-6"
        style={{ maxHeight: 'calc(100vh - 7rem)' }}
      >
        {children}
      </div>
    </div>
  );
}
