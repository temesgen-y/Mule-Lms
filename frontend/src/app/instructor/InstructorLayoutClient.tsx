'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const HEADER_BG = '#4c1d95';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const mainNav = [
  { href: '/instructor/dashboard', label: 'Calendar', icon: 'calendar' },
  { href: '/instructor/course-modules', label: 'Course Modules', icon: 'course-modules' },
  { href: '/instructor/lessons', label: 'Lessons', icon: 'lessons' },
  { href: '/instructor/announcements', label: 'Announcements', icon: 'announcements' },
  { href: '/instructor/syllabus', label: 'Syllabus', icon: 'syllabus' },
  { href: '/instructor/gradebook', label: 'Gradebook', icon: 'gradebook' },
  { href: '/instructor/worklist', label: 'Worklist', icon: 'worklist' },
  { href: '/instructor/forums', label: 'Forums', icon: 'forums' },
  { href: '/instructor/discussion-forums', label: 'Discussion Forums', icon: 'discussion' },
  { href: '/instructor/class-questions', label: 'Class Questions', icon: 'questions' },
];

const classroomMaterials = [
  { href: '/instructor/resources', label: 'Class Resources' },
  { href: '/instructor/instructor-only', label: 'Instructor Only' },
  { href: '/instructor/topic1', label: 'T1 Topic 1' },
];

const institutionResources = [
  { href: '/instructor/mission', label: 'MS Mission Statement' },
  { href: '/instructor/doctrinal', label: 'DS Doctrinal Statement' },
];

function NavIcon({ name }: { name: string }) {
  const c = 'w-5 h-5 shrink-0';
  switch (name) {
    case 'calendar':
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'course-modules':
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    case 'lessons':
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'announcements':
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.012-6.062a1.76 1.76 0 00-1.756-1.26H3.24A1.76 1.76 0 011.48 12 1.76 1.76 0 013.24 10.24h.586l2.012-6.062A1.76 1.76 0 017.235 3h.586a1.76 1.76 0 011.756 1.26L11 5.882z" />
        </svg>
      );
    case 'syllabus':
    case 'gradebook':
    case 'worklist':
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'forums':
    case 'discussion':
    case 'questions':
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    default:
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
  }
}

export type InstructorUser = { id: string; name: string; email: string };

export default function InstructorLayoutClient({
  user,
  children,
}: {
  user: InstructorUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [classesOpen, setClassesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Purple top header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 text-white shrink-0"
        style={{ backgroundColor: HEADER_BG }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded hover:bg-white/10"
            aria-label="Toggle sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/instructor/dashboard" className="font-semibold text-lg">
            MULE LMS
          </Link>
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={() => setClassesOpen((o) => !o)}
              className="flex items-center gap-1 px-3 py-1.5 rounded hover:bg-white/10 text-sm"
            >
              MY CLASSES
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <Link
              href="/instructor/messages"
              className="flex items-center gap-1 px-3 py-1.5 rounded hover:bg-white/10 text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              MESSAGES
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="p-2 rounded hover:bg-white/10" aria-label="Notifications">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button type="button" className="p-2 rounded hover:bg-white/10" aria-label="Profile">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          <a href="#" className="p-2 rounded hover:bg-white/10" aria-label="Help">
            <span className="text-lg font-bold">?</span>
          </a>
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded hover:bg-white/10"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">
                {getInitials(user.name)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-medium leading-tight">{user.name || 'Instructor'}</div>
                <div className="text-xs text-white/80">Instructor</div>
              </div>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 text-gray-900">
                  <div className="px-4 py-2 text-sm border-b border-gray-100">{user.email}</div>
                  <button
                    type="button"
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <aside
          className={`shrink-0 border-r border-gray-200 bg-gray-50/80 flex flex-col overflow-hidden transition-[width] duration-200 ${
            sidebarOpen ? 'w-64' : 'w-0'
          }`}
        >
          {sidebarOpen && (
            <div className="p-4 overflow-y-auto flex-1">
              <div className="mb-4 pb-3 border-b border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Topic 1</div>
                <div className="text-sm font-medium text-gray-900 mt-0.5">WTC-100-202603</div>
                <div className="text-sm text-gray-600">Sample Course</div>
                <div className="text-xs text-gray-500 mt-1">Mar 4 – 10, 2026 · 1 Student</div>
              </div>
              <div className="text-xs text-gray-500 mb-3">
                {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
              <nav className="space-y-0.5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Main</div>
                {mainNav.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                        isActive ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700 hover:bg-gray-200/80'
                      }`}
                    >
                      <NavIcon name={item.icon} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <nav className="mt-6 space-y-0.5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Classroom Materials</div>
                {classroomMaterials.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200/80"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <nav className="mt-4 space-y-0.5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Institution Resources</div>
                {institutionResources.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200/80"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <Link
                href="/instructor/library"
                className="block px-3 py-2 mt-4 rounded-lg text-sm text-gray-700 hover:bg-gray-200/80"
              >
                Library
              </Link>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
