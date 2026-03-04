import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserRoleNames } from '@/lib/auth/get-user-roles';
import { getHighestRole, type RoleName } from '@/types/auth';
import InstructorLayoutClient from './InstructorLayoutClient';

export default async function InstructorLayout({
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

  if (role !== 'ADMIN' && role !== 'INSTRUCTOR') {
    if (role === 'STUDENT') redirect('/dashboard');
    redirect('/unauthorized');
  }

  const { data: appUser } = await supabase
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('auth_user_id', authUser.id)
    .single();

  const displayName = appUser
    ? [appUser.first_name, appUser.last_name].filter(Boolean).join(' ').trim()
    : '';
  const instructorUser = {
    id: appUser?.id ?? authUser.id,
    name: (displayName || authUser.email) ?? 'Instructor',
    email: (appUser?.email ?? authUser.email) ?? '',
  };

  return (
    <InstructorLayoutClient user={instructorUser}>
      {children}
    </InstructorLayoutClient>
  );
}
