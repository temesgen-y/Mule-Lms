import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserRoleNames } from '@/lib/auth/get-user-roles';
import { getHighestRole, type RoleName } from '@/types/auth';
import DashboardLayoutClient from './DashboardLayoutClient';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const roleNames = await getUserRoleNames(supabase, authUser.id);
  const role = getHighestRole(roleNames as RoleName[]);

  if (role !== 'STUDENT') {
    if (role === 'ADMIN') redirect('/admin/dashboard');
    if (role === 'INSTRUCTOR') redirect('/instructor/dashboard');
    redirect('/unauthorized');
  }

  const { data: appUser, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('auth_user_id', authUser.id)
    .single();

  if (error || !appUser) {
    redirect('/unauthorized');
  }

  const displayName = [appUser.first_name, appUser.last_name].filter(Boolean).join(' ').trim();
  const dashboardUser = {
    id: appUser.id,
    name: (displayName || authUser.email) ?? 'Student',
    email: (appUser.email ?? authUser.email) ?? '',
    role: 'student',
  };

  return (
    <DashboardLayoutClient user={dashboardUser}>
      {children}
    </DashboardLayoutClient>
  );
}
