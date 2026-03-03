'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useClassSidebar } from '../../ClassSidebarContext';

// Demo course data — replace with API
const COURSE = {
  id: 'swe-520-0500',
  topic: 'Topic 4',
  shortCode: 'SWE-520',
  title: 'SWE-520-0500 Advanced Software Engineering Project',
  startDate: 'Dec 18, 2025',
  endDate: 'Feb 18, 2026',
  studentCount: 7,
};

const NAV = [
  { href: 'calendar', label: 'Calendar', icon: '📅' },
  { href: 'announcements', label: 'Announcements', icon: '📢' },
  { href: 'syllabus', label: 'Syllabus', icon: '📋' },
  { href: 'gradebook', label: 'Gradebook', icon: '📊' },
];

const FORUMS = [
  { href: 'forums', label: 'Discussion Forums', icon: '💬', badge: 1 },
  { href: 'questions', label: 'Class Questions', icon: '👤⚙', badge: null },
];

const MATERIALS = [
  { href: 'resources', label: 'Class Resources', short: '📚' },
  { href: 't1', label: 'T1 Topic 1', short: 'T1' },
  { href: 't2', label: 'T2 Topic 2', short: 'T2' },
  { href: 't3', label: 'T3 Topic 3', short: 'T3' },
  { href: 't4', label: 'T4 Topic 4', short: 'T4' },
];

const INSTITUTION = [
  { href: 'mission', label: 'MS Mission Statement', short: 'MS' },
  { href: 'mission', label: 'DS', short: 'DS' },
  { href: 'mission', label: 'SSC', short: 'SSC' },
];

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

export default function ClassLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = params?.id as string;
  const base = `/dashboard/class/${id}`;
  const { collapsed } = useClassSidebar();
  const [time, setTime] = useState(formatGcuTime());

  useEffect(() => {
    const t = setInterval(() => setTime(formatGcuTime()), 60000);
    return () => clearInterval(t);
  }, []);

  const isActive = (href: string) => {
    if (href === 'calendar') return pathname === base || pathname === `${base}/calendar`;
    return pathname === `${base}/${href}`;
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left sidebar: fixed max height so vertical scroll works like main page */}
      <aside
        className={`${sidebarWidth} flex-shrink-0 border-r border-gray-200 bg-white flex flex-col transition-[width] duration-200 self-stretch`}
      >
        <div
          className={`sidebar-scroll flex flex-col overflow-y-auto overflow-x-hidden min-h-0 ${collapsed ? 'items-center py-3 px-2' : 'py-4 px-3'}`}
          style={{ maxHeight: 'calc(100vh - 7rem)' }}
        >
          {/* Logo: star + deer (icon only when collapsed) */}
          <div className={`flex justify-center mb-3 ${collapsed ? '' : 'hidden'}`}>
            <span className="text-2xl" aria-hidden title="Mule LMS">⭐</span>
          </div>

          {/* Left section: MULE LMS + course card (when expanded) */}
          {!collapsed ? (
            <div className="space-y-3 mb-3">
              <div>
                <p className="text-xl font-bold text-[#1565C0] tracking-tight">MULE LMS</p>
              </div>
              <div
                className="rounded-lg overflow-hidden bg-white shadow-md"
                title={COURSE.title}
              >
                <div className="h-3 bg-[#FEF08A]" aria-hidden />
                <div className="px-3 py-3.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#B39DDB] text-white text-xs font-medium">
                      {COURSE.topic}
                    </span>
                    <span className="text-xs font-medium text-gray-900">{COURSE.id.toUpperCase()}</span>
                  </div>
                  <h2 className="text-sm font-bold text-gray-900 truncate mt-2.5">{COURSE.title}</h2>
                  <p className="text-xs text-gray-700 flex items-center gap-1.5 mt-2">
                    <span className="text-gray-600" aria-hidden>📅</span>
                    {COURSE.startDate} - {COURSE.endDate}
                  </p>
                  <p className="text-xs flex items-center gap-1.5 mt-2">
                    <span className="text-gray-600" aria-hidden>👥</span>
                    <span className="text-[#1565C0] font-medium cursor-pointer hover:underline">
                      {COURSE.studentCount} Students
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-lg mb-3 overflow-hidden bg-white shadow-md px-2 py-2 text-center"
              title={COURSE.title}
            >
              <span className="text-gray-800 text-xs font-semibold leading-tight">SWE<br />-520</span>
            </div>
          )}

          {/* Time: clock icon when collapsed */}
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

          {/* Main: Calendar, Announcements, Syllabus, Gradebook */}
          {!collapsed && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Main</p>
          )}
          <nav className={`space-y-1 ${collapsed ? 'flex flex-col items-center gap-1' : ''}`}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href === 'calendar' ? base : `${base}/${item.href}`}
                className={`flex items-center rounded text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center w-10 h-10' : 'gap-2 px-3 py-2'
                } ${
                  isActive(item.href) ? 'bg-[#4c1d95] text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span aria-hidden className="text-base">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Forums: Discussion Forums, Class Questions */}
          {!collapsed && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-1">Forums</p>
          )}
          <nav className={`space-y-1 ${collapsed ? 'flex flex-col items-center gap-1' : ''}`}>
            {FORUMS.map((item) => (
              <Link
                key={item.href}
                href={`${base}/${item.href}`}
                className={`flex items-center rounded text-sm font-medium transition-colors relative ${
                  collapsed ? 'justify-center w-10 h-10' : 'justify-between gap-1.5 px-3 py-2'
                } ${
                  isActive(item.href) ? 'bg-[#4c1d95] text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span aria-hidden className="text-base flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
                {item.badge != null ? (
                  <span className="w-5 h-5 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {item.badge}
                  </span>
                ) : !collapsed ? (
                  <span className="w-5 h-5 flex-shrink-0" aria-hidden />
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-200 my-2 w-full" />

          {/* Classroom Materials: T1, T2, T3, T4 when collapsed */}
          {!collapsed && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Classroom Materials</p>
          )}
          <nav className={`space-y-1 ${collapsed ? 'flex flex-col items-center gap-0.5' : ''}`}>
            {MATERIALS.map((item) => (
              <Link
                key={item.href + item.short}
                href={`${base}/${item.href}`}
                className={`flex items-center rounded text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center w-10 py-1.5 text-xs' : 'px-3 py-2 gap-2'
                } ${
                  isActive(item.href) ? 'bg-[#4c1d95] text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {collapsed ? <span>{item.short}</span> : <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-200 my-2 w-full" />

          {/* Institution Resources: MS, DS, Library, SSC, Learning Support, Classroom Policies */}
          {!collapsed && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Institution Resources</p>
          )}
          <nav className={`space-y-0.5 ${collapsed ? 'flex flex-col items-center gap-0.5' : ''}`}>
            <Link
              href={`${base}/mission`}
              className={`flex items-center rounded text-sm font-medium transition-colors ${
                collapsed ? 'justify-center w-10 py-1.5 text-xs' : 'px-3 py-2 gap-2'
              } ${isActive('mission') ? 'bg-[#4c1d95] text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              title="MS Mission Statement"
            >
              {collapsed ? 'MS' : 'MS Mission Statement'}
            </Link>
            <Link
              href={`${base}/doctrinal-statement`}
              className={`flex items-center rounded text-sm transition-colors ${
                collapsed ? 'justify-center w-10 py-1.5 text-xs' : 'px-3 py-2 gap-2'
              } ${isActive('doctrinal-statement') ? 'bg-[#4c1d95] text-white font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
              title="DS Doctrinal Statement"
            >
              {collapsed ? 'DS' : <><span className="text-gray-400 font-medium">DS</span> Doctrinal Statement</>}
            </Link>
            <Link
              href={`${base}/library`}
              className={`flex items-center rounded text-sm transition-colors ${
                collapsed ? 'justify-center w-10 py-1.5 text-xs' : 'px-3 py-2 gap-2'
              } ${isActive('library') ? 'bg-[#4c1d95] text-white font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Library"
            >
              {collapsed ? '📖' : <><span className="text-gray-500" aria-hidden>📚</span> Library</>}
            </Link>
            <Link
              href={`${base}/student-success-center`}
              className={`flex items-center rounded text-sm transition-colors ${
                collapsed ? 'justify-center w-10 py-1.5 text-xs' : 'px-3 py-2 gap-2'
              } ${isActive('student-success-center') ? 'bg-[#4c1d95] text-white font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
              title="SSC Student Success Center"
            >
              {collapsed ? 'SSC' : <><span className="text-gray-400 font-medium">SSC</span> Student Success Center</>}
            </Link>
            <Link
              href={`${base}/learning-support`}
              className={`flex items-center rounded text-sm transition-colors ${
                collapsed ? 'justify-center w-10 py-1.5 text-xs' : 'px-3 py-2 gap-2'
              } ${isActive('learning-support') ? 'bg-[#4c1d95] text-white font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Learning Support"
            >
              {collapsed ? '👥' : <><span className="text-gray-500" aria-hidden>👥</span> Learning Support</>}
            </Link>
            <Link
              href={`${base}/classroom-policies`}
              className={`flex items-center rounded text-sm transition-colors ${
                collapsed ? 'justify-center w-10 py-1.5 text-xs' : 'px-3 py-2 gap-2'
              } ${isActive('classroom-policies') ? 'bg-[#4c1d95] text-white font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Classroom Policies"
            >
              {collapsed ? '📄' : <><span className="text-gray-500" aria-hidden>📄</span> Classroom Policies</>}
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main content: scrollable, spacing from sidebar, right scrollbar always visible */}
      <div
        className="main-content-scroll flex-1 min-w-0 min-h-0 overflow-y-scroll overflow-x-hidden bg-white pl-8 pr-8 py-6"
        style={{ maxHeight: 'calc(100vh - 7rem)' }}
      >
        {children}
      </div>
    </div>
  );
}
