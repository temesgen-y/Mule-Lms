# Supabase setup for Mule LMS

Follow these steps **in order** so signup and login work.

## 1. Run migrations in the Supabase SQL Editor

Run these **in order** (Dashboard → SQL Editor → New query, paste and run each):

**Step 1a – Base tables (run this first):**

- **`migrations/20260301000000_base_tables_and_roles.sql`**  
  - Creates `public.users`, `public.admin_profiles`, `public.instructor_profiles`, and `public.student_profiles` (no `roles` or `user_roles`). Role is determined by which profile exists and by `users.role`. Without this, signup will fail with “relation does not exist”.

**Step 1b – RLS so the app can insert on signup:**

- **`migrations/20260302000001_users_and_student_profiles_insert.sql`**  
  - Adds `role` and `full_name` to `users` if missing, unique on `auth_user_id`, and RLS policies so authenticated users can create/update their own row and their own `student_profiles` row.

If you already have your own schema, ensure `users` and `student_profiles` (and optionally `admin_profiles`, `instructor_profiles`) exist, then run **Step 1b** only.

---

## 2. Enable Email Signup (required)

If you see **"Email signups are disabled"** or a 400 on signup:

1. In [Supabase Dashboard](https://supabase.com/dashboard), open your project.
2. Left sidebar: **Authentication** → **Providers**.
3. Click **Email**.
4. Turn **ON** **"Enable Email Signup"** (or "Enable email provider").
5. Click **Save**.

---

## 3. Turn off “Confirm email” (recommended)

**Do this so that:**
- New users get a session right after signup (no “Check your email to confirm”).
- Signup does **not** send confirmation emails, so you avoid **“email rate limit exceeded”** when many users sign up.

**Steps:**
1. In [Supabase Dashboard](https://supabase.com/dashboard), open your project.
2. Left sidebar: **Authentication** → **Providers**.
3. Click **Email**.
4. Find **“Confirm email”** (or “Enable email confirmations”) and **turn it OFF**.
5. Click **Save**.

---

## 4. If you already ran the old migration (role_name error)

If you ran `20260301000000_mule_lms_tables.sql` and see errors like `column "role_name" of relation "roles" does not exist`:

- Run **`20260301000001_lms_public_schema_v2.sql`** in full. It drops and recreates the v2 tables (including `roles` with column `name`).
- Then run **000002**, **000003**, and **000004** as in step 1.

---

## 5. If users exist in `users` but not in `user_roles` or `student_profiles`

This can happen if “Confirm email” was on at signup (so the RPC never ran). Run this **once** in the SQL Editor:

- **`backfill_user_roles_and_student_profiles.sql`**

It adds a STUDENT role and a student profile for every user in `public.users` who doesn’t have them. Ensure **`seed_roles_v2.sql`** and **`add_student_profile_columns.sql`** have been run first if needed.

---

## 6. Log in as admin

There is no public “admin signup”. To get an admin account:

1. **Create a normal user** (e.g. sign up on the app signup page with the email you want for admin, or add a user in **Authentication → Users** in the Supabase Dashboard).
2. **Promote that user to admin** by running **`migrations/promote_user_to_admin.sql`** in the Supabase SQL Editor.  
   - Open the file and change `'admin@example.com'` to the user’s email, then run the script.  
   - It sets `users.role = 'ADMIN'` and inserts a row into `admin_profiles`.
3. **Log in** on the app login page with that email and password. You’ll be redirected to **/admin/dashboard**.

---

## 7. Quick check

- Create a new account on the app signup page.
- You should be signed in and redirected to the dashboard (no “confirm your email” step if step 2 is done).
- If you still see “Check your email to confirm”, double‑check step 2 and that you saved the Email provider settings.
- If users are in `users` but not in `user_roles` / `student_profiles`, run **`backfill_user_roles_and_student_profiles.sql`** (see step 5).
- To log in as admin, follow **step 6** (promote a user to admin, then sign in).
