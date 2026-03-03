import type { SupabaseClient } from '@supabase/supabase-js';
import type { RoleName } from '@/types/auth';

const ALLOWED_ROLES: RoleName[] = ['ADMIN', 'STUDENT', 'INSTRUCTOR'];

function normalizeRoleName(value: unknown): RoleName | null {
  if (typeof value !== 'string') return null;
  const upper = value.trim().toUpperCase();
  return ALLOWED_ROLES.includes(upper as RoleName) ? (upper as RoleName) : null;
}

/**
 * Fetches role for the current auth user (single sign-in redirect).
 * Uses public.users.role when set; otherwise derives from which profile exists:
 *   admin_profiles → ADMIN, instructor_profiles → INSTRUCTOR, student_profiles → STUDENT.
 */
export async function getUserRoleNames(
  supabase: SupabaseClient,
  authUserId: string
): Promise<RoleName[]> {
  // 1) Get app user (id + role)
  const { data: appUser, error: userError } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .single();

  if (userError || !appUser) return [];

  const userId = (appUser as { id: string }).id;

  // 2) Prefer users.role column when set
  const roleFromColumn = normalizeRoleName((appUser as { role?: unknown }).role);
  if (roleFromColumn) return [roleFromColumn];

  // 3) Derive role from which profile table has a row (admin > instructor > student)
  const [adminRes, instructorRes, studentRes] = await Promise.all([
    supabase.from('admin_profiles').select('user_id').eq('user_id', userId).limit(1).maybeSingle(),
    supabase.from('instructor_profiles').select('user_id').eq('user_id', userId).limit(1).maybeSingle(),
    supabase.from('student_profiles').select('user_id').eq('user_id', userId).limit(1).maybeSingle(),
  ]);

  if (!adminRes.error && adminRes.data) return ['ADMIN'];
  if (!instructorRes.error && instructorRes.data) return ['INSTRUCTOR'];
  if (!studentRes.error && studentRes.data) return ['STUDENT'];

  return [];
}
