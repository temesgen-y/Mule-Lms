import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserRoleNames } from '@/lib/auth/get-user-roles';
import { getHighestRole, type RoleName } from '@/types/auth';

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

  return <>{children}</>;
}
