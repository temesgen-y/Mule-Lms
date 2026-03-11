import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserRoleNames } from '@/lib/auth/get-user-roles';
import { getHighestRole, type RoleName } from '@/types/auth';

export type InviteInstructorBody = {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  title?: string;
  specialization?: string;
  qualification?: string;
  bio?: string;
  officeHours?: string;
  employmentStatus?: string;
  profileStatus?: string;
};

function validateBody(body: unknown): { ok: true; data: InviteInstructorBody } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body is required.' };
  }
  const b = body as Record<string, unknown>;
  const firstName = typeof b.firstName === 'string' ? b.firstName.trim() : '';
  const lastName = typeof b.lastName === 'string' ? b.lastName.trim() : '';
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const department = typeof b.department === 'string' ? b.department.trim() : '';

  if (!firstName) return { ok: false, error: 'First name is required.' };
  if (!lastName) return { ok: false, error: 'Last name is required.' };
  if (!email) return { ok: false, error: 'Email is required.' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (!department) return { ok: false, error: 'Department is required.' };

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      email,
      department,
      title: typeof b.title === 'string' ? b.title.trim() || undefined : undefined,
      specialization: typeof b.specialization === 'string' ? b.specialization.trim() || undefined : undefined,
      qualification: typeof b.qualification === 'string' ? b.qualification.trim() || undefined : undefined,
      bio: typeof b.bio === 'string' ? b.bio.trim() || undefined : undefined,
      officeHours: typeof b.officeHours === 'string' ? b.officeHours.trim() || undefined : undefined,
      employmentStatus: typeof b.employmentStatus === 'string' ? b.employmentStatus.trim() || undefined : undefined,
      profileStatus: typeof b.profileStatus === 'string' ? b.profileStatus.trim() || undefined : undefined,
    },
  };
}

/**
 * POST /api/admin/instructors/invite
 * Admin-only. Creates instructor via Supabase Auth invite, then inserts users + instructor_profiles.
 * Instructor receives an email to set their password; they then use the single login page.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !authUser) {
      return NextResponse.json({ error: 'You must be signed in to perform this action.' }, { status: 401 });
    }

    const roleNames = await getUserRoleNames(supabase, authUser.id);
    const role = getHighestRole(roleNames as RoleName[]);
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can invite instructors.' }, { status: 403 });
    }

    const { data: appUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single();
    const createdByUserId = (appUser as { id: string } | null)?.id ?? null;

    const body = await request.json();
    const validated = validateBody(body);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const { data } = validated;

    const admin = createAdminClient();

    const appOrigin =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      request.headers.get('origin') ||
      request.nextUrl.origin;
    const inviteUrl = `${appOrigin.replace(/\/$/, '')}/login`;

    const {
      data: inviteData,
      error: inviteError,
    } = await admin.auth.admin.inviteUserByEmail(data.email, {
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
      },
      redirectTo: inviteUrl,
    });

    if (inviteError) {
      const msg = inviteError.message ?? '';
      if (msg.toLowerCase().includes('already been registered') || inviteError.status === 422) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Use a different email or ask them to sign in.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: msg || 'Failed to send invitation email.' },
        { status: 400 }
      );
    }

    const invitedAuthUserId = inviteData?.user?.id;
    if (!invitedAuthUserId) {
      return NextResponse.json(
        { error: 'Invitation was sent but we could not create the app profile. Please contact support.' },
        { status: 500 }
      );
    }

    const { data: existingByEmail } = await admin
      .from('users')
      .select('id, auth_user_id')
      .eq('email', data.email)
      .maybeSingle();

    if (existingByEmail) {
      const existing = existingByEmail as { id: string; auth_user_id: string };
      if (existing.auth_user_id !== invitedAuthUserId) {
        return NextResponse.json(
          {
            error:
              'An account with this email already exists. Use a different email or ask them to sign in to the existing account.',
          },
          { status: 409 }
        );
      }
    }

    const { data: upsertedUser, error: userError } = await admin
      .from('users')
      .upsert(
        {
          auth_user_id: invitedAuthUserId,
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          role: 'INSTRUCTOR',
          status: 'ACTIVE',
          updated_at: new Date().toISOString(),
          created_by: createdByUserId,
        },
        { onConflict: 'auth_user_id' }
      )
      .select('id')
      .single();

    if (userError || !upsertedUser) {
      const msg = userError?.message ?? '';
      const isDuplicateEmail = userError?.code === '23505' && msg.includes('users_email_key');
      if (isDuplicateEmail) {
        return NextResponse.json(
          {
            error:
              'An account with this email already exists. Use a different email or ask them to sign in to the existing account.',
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error:
            msg || 'User record could not be created. The instructor may still receive an invite; check the Users table.',
        },
        { status: 500 }
      );
    }

    const userId = (upsertedUser as { id: string }).id;

    const ALLOWED_EMPLOYMENT = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'ADJUNCT'] as const;
    const employmentStatus =
      data.employmentStatus && ALLOWED_EMPLOYMENT.includes(data.employmentStatus as (typeof ALLOWED_EMPLOYMENT)[number])
        ? data.employmentStatus
        : null;

    const { error: profileError } = await admin.from('instructor_profiles').upsert(
      {
        user_id: userId,
        department: data.department,
        title: data.title || null,
        specialization: data.specialization || null,
        qualification: data.qualification || null,
        bio: data.bio || null,
        office_hours: data.officeHours || null,
        employment_status: employmentStatus,
        profile_status: data.profileStatus || 'ACTIVE',
        updated_at: new Date().toISOString(),
        created_by: createdByUserId,
      },
      { onConflict: 'user_id' }
    );

    if (profileError) {
      return NextResponse.json(
        {
          error:
            profileError.message ||
            'Instructor profile could not be created. The user record may already exist; check the database.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Instructor invited. They will receive an email to set their password and can then sign in.',
      userId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
