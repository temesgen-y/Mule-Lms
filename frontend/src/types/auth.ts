/**
 * Role names for single sign-in redirect (stored in public.users.role).
 * Allowed values: ADMIN, STUDENT, INSTRUCTOR. Priority: admin > instructor > student.
 */
export const ROLE_PRIORITY = ['ADMIN', 'INSTRUCTOR', 'STUDENT'] as const;
export type RoleName = (typeof ROLE_PRIORITY)[number];

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
  authUserId: string;
}

export function getHighestRole(roles: RoleName[]): RoleName | null {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return null;
}

export function getRedirectForRole(role: RoleName): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'INSTRUCTOR':
      return '/instructor/dashboard';
    case 'STUDENT':
      return '/dashboard';
    default:
      return '/unauthorized';
  }
}
