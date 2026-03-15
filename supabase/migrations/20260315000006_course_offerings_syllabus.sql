-- ---------------------------------------------------------------------------
-- Add syllabus column to course_offerings
-- Instructors write free-form text/markdown here; students can read it.
-- ---------------------------------------------------------------------------

alter table public.course_offerings
  add column if not exists syllabus text;
