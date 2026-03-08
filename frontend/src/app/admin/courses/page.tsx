'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

type Course = {
  id: string;
  code: string;
  title: string;
  description: string;
  departmentName: string;
  level: string;
  creditHours: number;
  isActive: boolean;
};

type DepartmentOption = {
  id: string;
  name: string;
};

const PAGE_SIZE = 10;
const LEVELS = ['100', '200', '300', '400', 'postgraduate'];

const initialForm = {
  code: '',
  title: '',
  description: '',
  departmentId: '',
  level: '100',
  creditHours: '3',
  isActive: true,
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        code,
        title,
        description,
        credit_hours,
        level,
        is_active,
        departments!fk_courses_department (
          name
        )
      `)
      .order('title', { ascending: true });

    if (error) {
      toast.error('Failed to load courses.');
    } else {
      setCourses(
        (data ?? []).map((row: any) => ({
          id: row.id,
          code: row.code ?? '—',
          title: row.title ?? '—',
          description: row.description ?? '—',
          departmentName: row.departments?.name ?? '—',
          level: row.level ?? '—',
          creditHours: row.credit_hours ?? 0,
          isActive: row.is_active ?? false,
        }))
      );
    }
    setLoading(false);
  }, []);

  const fetchDepartments = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('departments')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (data) setDepartments(data.map((d: any) => ({ id: d.id, name: d.name })));
  }, []);

  useEffect(() => {
    fetchCourses();
    fetchDepartments();
  }, [fetchCourses, fetchDepartments]);

  const openModal = useCallback(() => {
    setForm(initialForm);
    setSubmitError('');
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (!isSubmitting) setModalOpen(false);
  }, [isSubmitting]);

  useEffect(() => {
    if (!modalOpen) return;
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [modalOpen, closeModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const code = form.code.trim().toLowerCase();
    const title = form.title.trim();
    const creditHours = parseInt(form.creditHours, 10);

    if (!code) { setSubmitError('Course code is required.'); return; }
    if (!title) { setSubmitError('Course title is required.'); return; }
    if (!form.departmentId) { setSubmitError('Department is required.'); return; }
    if (!creditHours || creditHours < 1 || creditHours > 6) {
      setSubmitError('Credit hours must be between 1 and 6.'); return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    // Get the current user id for created_by
    const { data: { user } } = await supabase.auth.getUser();
    const { data: appUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user?.id)
      .single();

    if (!appUser) {
      setSubmitError('Could not identify current user.');
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from('courses').insert({
      code,
      title,
      description: form.description.trim() || null,
      department_id: form.departmentId,
      level: form.level,
      credit_hours: creditHours,
      is_active: form.isActive,
      created_by: appUser.id,
    });

    if (error) {
      const msg = error.message ?? '';
      if (msg.includes('uq_courses_code')) {
        setSubmitError('A course with this code already exists.');
      } else {
        setSubmitError(msg || 'Failed to create course.');
      }
      setIsSubmitting(false);
      return;
    }

    toast.success(`Course "${title}" created successfully.`);
    setModalOpen(false);
    setForm(initialForm);
    fetchCourses();
    setIsSubmitting(false);
  };

  const filtered = courses.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.departmentName.toLowerCase().includes(search.toLowerCase()) ||
    c.level.toLowerCase().includes(search.toLowerCase())
  );

  const totalCount = filtered.length;
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, totalCount);
  const paginated = filtered.slice(start, end);

  return (
    <div className="space-y-6">
      {/* Search and action bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <input
            type="search"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="button" onClick={openModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Course
        </button>
      </div>

      {/* Modal */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" aria-hidden onClick={closeModal} />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-xl shadow-xl border border-gray-200"
            role="dialog" aria-modal="true" aria-labelledby="add-course-title"
          >
            <div className="flex items-center justify-between shrink-0 p-6 pb-0">
              <h2 id="add-course-title" className="text-lg font-bold text-gray-900">Add Course</h2>
              <button type="button" onClick={() => setModalOpen(false)} disabled={isSubmitting}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50" aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 p-6">
              <div className="space-y-4 overflow-y-auto pr-1 max-h-[60vh]">
                {submitError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2">{submitError}</div>
                )}
                <div>
                  <label htmlFor="course-code" className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input id="course-code" type="text" required value={form.code}
                    placeholder="e.g. cs301"
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="course-title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input id="course-title" type="text" required value={form.title}
                    placeholder="e.g. Introduction to Databases"
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="course-dept" className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <select id="course-dept" value={form.departmentId}
                    onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">— Select Department —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="course-level" className="block text-sm font-medium text-gray-700 mb-1">Level *</label>
                    <select id="course-level" value={form.level}
                      onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>{l === 'postgraduate' ? 'Postgraduate' : `Level ${l}`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="course-credits" className="block text-sm font-medium text-gray-700 mb-1">Credit Hours *</label>
                    <input id="course-credits" type="number" min={1} max={6} required value={form.creditHours}
                      onChange={(e) => setForm((f) => ({ ...f, creditHours: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="course-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea id="course-desc" rows={3} value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input id="course-active" type="checkbox" checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="course-active" className="text-sm font-medium text-gray-700">Active</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-4 shrink-0 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)} disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition disabled:opacity-50"
                >Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50 min-w-[120px]"
                >
                  {isSubmitting ? 'Creating...' : 'Add Course'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Code</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Title</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Department</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Level</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Credits</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Status</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-500">Loading courses...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-500">
                  {search ? 'No courses match your search.' : 'No courses found.'}
                </td></tr>
              ) : (
                paginated.map((course) => (
                  <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 uppercase">{course.code}</td>
                    <td className="px-5 py-3 text-sm text-gray-900">{course.title}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{course.departmentName}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {course.level === 'postgraduate' ? 'Postgraduate' : `Level ${course.level}`}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{course.creditHours} hr{course.creditHours !== 1 ? 's' : ''}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-medium ${course.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                        {course.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button type="button" className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900" title="View">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button type="button" className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button type="button" className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-red-600" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50/50">
          <p className="text-sm text-gray-600">
            {totalCount === 0 ? 'No results' : `Showing ${start + 1}-${end} of ${totalCount}`}
          </p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none" aria-label="Previous page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={end >= totalCount}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none" aria-label="Next page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
