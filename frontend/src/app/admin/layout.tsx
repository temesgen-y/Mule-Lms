import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserRoleNames } from '@/lib/auth/get-user-roles';
import { getHighestRole, type RoleName } from '@/types/auth';
import AdminShell from '@/components/admin/AdminShell';

export default async function AdminLayout({
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

  if (role !== 'ADMIN') {
    if (role === 'INSTRUCTOR') redirect('/instructor/dashboard');
    if (role === 'STUDENT') redirect('/dashboard');
    redirect('/unauthorized');
  }

  return <AdminShell>{children}</AdminShell>;
}
