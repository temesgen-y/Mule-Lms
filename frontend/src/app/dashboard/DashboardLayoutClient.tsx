'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClassSidebarProvider, useClassSidebar } from './ClassSidebarContext';
import { createClient } from '@/lib/supabase/client';

export type DashboardUser = { id: string; name: string; email: string; role: string };

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function DashboardLayoutClient({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <ClassSidebarProvider>
      <DashboardLayoutContent
        user={user}
        pathname={pathname}
        userMenuOpen={userMenuOpen}
        helpOpen={helpOpen}
        setUserMenuOpen={setUserMenuOpen}
        setHelpOpen={setHelpOpen}
        handleLogout={handleLogout}
      >
        {children}
      </DashboardLayoutContent>
    </ClassSidebarProvider>
  );
}

function DashboardLayoutContent({
  user,
  pathname,
  userMenuOpen,
  helpOpen,
  setUserMenuOpen,
  setHelpOpen,
  handleLogout,
  children,
}: {
  user: DashboardUser;
  pathname: string | null;
  userMenuOpen: boolean;
  helpOpen: boolean;
  setUserMenuOpen: (v: boolean) => void;
  setHelpOpen: (v: boolean) => void;
  handleLogout: () => void;
  children: React.ReactNode;
}) {
  const isStudent = user.role.toLowerCase() === 'student';
  const isClassView = pathname?.includes('/dashboard/class');
  const isStudentHome = pathname === '/dashboard';
  const headerPurple = isClassView || isStudentHome;
  const { toggle: toggleClassSidebar } = useClassSidebar();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header
        className={`sticky top-0 z-50 ${
          headerPurple ? 'bg-[#4c1d95] border-b border-[#5b21b6]' : 'bg-white border-b border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            {isClassView && (
              <button
                type="button"
                onClick={toggleClassSidebar}
                className="p-3 text-white/90 hover:bg-white/10 rounded text-lg leading-none"
                aria-label="Toggle sidebar"
              >
                ☰
              </button>
            )}
            <Link
              href="/dashboard"
              className={`font-bold text-xl tracking-tight ${headerPurple ? 'text-white' : 'text-[#4c1d95]'}`}
            >
              Mule LMS
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/dashboard"
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium ${
                  pathname === '/dashboard'
                    ? headerPurple ? 'bg-white/20 text-white' : 'bg-[#4c1d95] text-white'
                    : headerPurple ? 'text-white/90 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span aria-hidden>🏛️</span>
                <span>MY CLASSES</span>
                <span className="text-xs">▼</span>
              </Link>
              <Link
                href="/dashboard/messages"
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium ${
                  pathname === '/dashboard/messages'
                    ? headerPurple ? 'bg-white/20 text-white' : 'bg-[#4c1d95] text-white'
                    : headerPurple ? 'text-white/90 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span aria-hidden>💬</span>
                <span>MESSAGES</span>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`p-2 rounded-full ${headerPurple ? 'text-white/90 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
              aria-label="Notifications"
            >
              🔔
            </button>
            <button
              type="button"
              className={`p-2 rounded-full ${headerPurple ? 'text-white/90 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
              aria-label="Accessibility"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="6" r="2" fill="currentColor" stroke="none" />
                <path d="M12 8v5M8 11h8M10.5 13l-2 4M13.5 13l2 4" />
              </svg>
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setHelpOpen(!helpOpen); setUserMenuOpen(false); }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded text-sm ${
                  headerPurple ? 'text-white/90 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>?</span>
                <span>▼</span>
              </button>
              {helpOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                  <a href="#" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Help & Support</a>
                  <button type="button" onClick={() => setHelpOpen(false)} className="sr-only">Close</button>
                </div>
              )}
            </div>
            <div className={`relative pl-2 ${headerPurple ? 'border-l border-white/30' : 'border-l border-gray-200'}`}>
              <button
                type="button"
                onClick={() => { setUserMenuOpen(!userMenuOpen); setHelpOpen(false); }}
                className="flex items-center gap-2 pl-2"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                    headerPurple ? 'bg-white/20 text-white' : 'bg-[#4c1d95] text-white'
                  }`}
                  aria-hidden
                >
                  {getInitials(user.name)}
                </span>
                <div className="text-left hidden sm:block">
                  <p className={`text-sm font-medium leading-tight ${headerPurple ? 'text-white' : 'text-gray-900'}`}>
                    {user.name}
                  </p>
                  <p className={`text-xs leading-tight ${headerPurple ? 'text-white/80' : 'text-gray-500'}`}>
                    {isStudent ? 'Student' : `${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`}
                  </p>
                </div>
                <span className={headerPurple ? 'text-white/70 text-xs' : 'text-gray-500 text-xs'}>▼</span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                  <p className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">{user.email}</p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Log out
                  </button>
                  <button type="button" onClick={() => setUserMenuOpen(false)} className="sr-only">Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <main className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          {children}
        </main>
        {!isClassView && (
          <aside className="hidden lg:flex lg:w-56 xl:w-64 flex-shrink-0 bg-white items-start justify-center pt-12 pb-8 px-4">
            <div className="text-center">
              <p className="text-xl font-bold text-[#1565C0] tracking-tight">MULE LMS</p>
            </div>
          </aside>
        )}
      </div>

      <footer className="border-t border-gray-200 py-3 px-4 text-center text-xs text-gray-500">
        Grand Canyon University © 2026 All Rights Reserved | 3300 West Camelback Road - Phoenix, AZ 85017
        <span className="mx-2">|</span>
        <span>v1.4.12.84 PROD</span>
      </footer>
    </div>
  );
}
