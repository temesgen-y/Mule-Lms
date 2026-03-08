'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

type CourseModule = {
  id: string;
  offeringId: string;
  offeringLabel: string;
  title: string;
  description: string;
  sortOrder: number;
  isVisible: boolean;
  unlockDate: string;
};

type OfferingOption = { id: string; label: string };

const PAGE_SIZE = 10;

const initialForm = {
  offeringId: '',
  title: '',
  description: '',
  sortOrder: '0',
  isVisible: true,
  unlockDate: '',
};

export default function InstructorCourseModulesPage() {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [offerings, setOfferings] = useState<OfferingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOffering, setFilterOffering] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Get current instructor's user id ────────────────────────────
  const getCurrentUserId = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    return data?.id ?? null;
  }, []);

  // ─── Fetch offerings assigned to this instructor ──────────────────
  const fetchOfferings = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('course_instructors')
      .select(`
        course_offerings!fk_course_instructors_offering (
          id,
          section_name,
          courses!fk_course_offerings_course ( code, title ),
          academic_terms!fk_course_offerings_term ( academic_year_label, term_name, term_code )
        )
      `)
      .eq('instructor_id', userId);

    if (data) {
      const opts: OfferingOption[] = (data ?? []).map((r: any) => {
        const o = r.course_offerings ?? {};
        const c = o.courses ?? {};
        const t = o.academic_terms ?? {};
        const termStr = [t.academic_year_label, t.term_name ?? t.term_code].filter(Boolean).join(' · ');
        return {
          id: o.id,
          label: `${(c.code ?? '').toUpperCase()} — ${c.title ?? '—'} · ${termStr} · Sec ${o.section_name ?? 'A'}`,
        };
      }).filter((o: OfferingOption) => !!o.id);
      setOfferings(opts);
    }
  }, [getCurrentUserId]);

  // ─── Fetch modules ────────────────────────────────────────────────
  const fetchModules = useCallback(async () => {
    setLoading(true);
    const userId = await getCurrentUserId();
    if (!userId) { setLoading(false); return; }

    const supabase = createClient();

    // Get offering ids this instructor is assigned to
    const { data: ciData } = await supabase
      .from('course_instructors')
      .select('offering_id')
      .eq('instructor_id', userId);

    const offeringIds = (ciData ?? []).map((r: any) => r.offering_id);
    if (offeringIds.length === 0) { setModules([]); setLoading(false); return; }

    const { data, error } = await supabase
      .from('course_modules')
      .select(`
        id,
        offering_id,
        title,
        description,
        sort_order,
        is_visible,
        unlock_date,
        course_offerings!fk_course_modules_offering (
          section_name,
          courses!fk_course_offerings_course ( code, title ),
          academic_terms!fk_course_offerings_term ( academic_year_label, term_name, term_code )
        )
      `)
      .in('offering_id', offeringIds)
      .order('offering_id', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      toast.error('Failed to load course modules.');
    } else {
      setModules(
        (data ?? []).map((r: any) => {
          const o = r.course_offerings ?? {};
          const c = o.courses ?? {};
          const t = o.academic_terms ?? {};
          const termStr = [t.academic_year_label, t.term_name ?? t.term_code].filter(Boolean).join(' · ');
          return {
            id: r.id,
            offeringId: r.offering_id,
            offeringLabel: `${(c.code ?? '').toUpperCase()} — ${c.title ?? '—'} · ${termStr} · Sec ${o.section_name ?? 'A'}`,
            title: r.title ?? '',
            description: r.description ?? '',
            sortOrder: r.sort_order ?? 0,
            isVisible: r.is_visible ?? true,
            unlockDate: r.unlock_date ?? '',
          };
        })
      );
    }
    setLoading(false);
  }, [getCurrentUserId]);

  useEffect(() => {
    fetchOfferings();
    fetchModules();
  }, [fetchOfferings, fetchModules]);

  // ─── Modal helpers ────────────────────────────────────────────────
  const openAddModal = useCallback(() => {
    setEditingId(null);
    setForm({ ...initialForm, offeringId: filterOffering });
    setSubmitError('');
    setModalOpen(true);
  }, [filterOffering]);

  const openEditModal = useCallback((m: CourseModule) => {
    setEditingId(m.id);
    setForm({
      offeringId: m.offeringId,
      title: m.title,
      description: m.description,
      sortOrder: String(m.sortOrder),
      isVisible: m.isVisible,
      unlockDate: m.unlockDate,
    });
    setSubmitError('');
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (!isSubmitting) setModalOpen(false);
  }, [isSubmitting]);

  useEffect(() => {
    if (!modalOpen) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [modalOpen, closeModal]);

  // ─── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const title = form.title.trim();
    const sortOrder = parseInt(form.sortOrder, 10);

    if (!form.offeringId) { setSubmitError('Course offering is required.'); return; }
    if (!title) { setSubmitError('Title is required.'); return; }
    if (isNaN(sortOrder) || sortOrder < 0) { setSubmitError('Sort order must be 0 or greater.'); return; }

    setIsSubmitting(true);
    const supabase = createClient();

    const payload = {
      offering_id: form.offeringId,
      title,
      description: form.description.trim() || null,
      sort_order: sortOrder,
      is_visible: form.isVisible,
      unlock_date: form.unlockDate || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('course_modules').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('course_modules').insert(payload));
    }

    if (error) {
      setSubmitError(error.message || `Failed to ${editingId ? 'update' : 'create'} module.`);
      setIsSubmitting(false);
      return;
    }

    toast.success(editingId ? 'Module updated.' : 'Module created.');
    setModalOpen(false);
    setForm(initialForm);
    fetchModules();
    setIsSubmitting(false);
  };

  // ─── Delete ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('course_modules').delete().eq('id', deleteId);
    if (error) {
      toast.error('Failed to delete module.');
    } else {
      toast.success('Module deleted.');
      fetchModules();
    }
    setDeleteId(null);
    setIsDeleting(false);
  };

  // ─── Filter & paginate ────────────────────────────────────────────
  const filtered = modules.filter((m) => {
    const matchesOffering = !filterOffering || m.offeringId === filterOffering;
    const matchesSearch =
      !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.offeringLabel.toLowerCase().includes(search.toLowerCase());
    return matchesOffering && matchesSearch;
  });

  const totalCount = filtered.length;
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, totalCount);
  const paginated = filtered.slice(start, end);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        {/* Offering filter */}
        <select
          value={filterOffering}
          onChange={(e) => { setFilterOffering(e.target.value); setPage(1); }}
          className="flex-1 max-w-xs px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="">All My Offerings</option>
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="search"
            placeholder="Search modules..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <button
          type="button" onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Module
        </button>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" aria-hidden onClick={closeModal} />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-xl shadow-xl border border-gray-200"
            role="dialog" aria-modal="true" aria-labelledby="cm-modal-title"
          >
            <div className="flex items-center justify-between shrink-0 p-6 pb-0">
              <h2 id="cm-modal-title" className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Module' : 'Add Module'}
              </h2>
              <button type="button" onClick={closeModal} disabled={isSubmitting}
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

                {/* Offering */}
                <div>
                  <label htmlFor="cm-offering" className="block text-sm font-medium text-gray-700 mb-1">Course Offering *</label>
                  <select id="cm-offering" value={form.offeringId}
                    onChange={(e) => setForm((f) => ({ ...f, offeringId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">— Select Offering —</option>
                    {offerings.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label htmlFor="cm-title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input id="cm-title" type="text" value={form.title}
                    placeholder="e.g. Module 1: Introduction"
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="cm-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea id="cm-desc" rows={3} value={form.description}
                    placeholder="Brief overview of this module..."
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>

                {/* Sort Order & Unlock Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cm-order" className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                    <input id="cm-order" type="number" min={0} value={form.sortOrder}
                      onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="cm-unlock" className="block text-sm font-medium text-gray-700 mb-1">Unlock Date</label>
                    <input id="cm-unlock" type="date" value={form.unlockDate}
                      onChange={(e) => setForm((f) => ({ ...f, unlockDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Visible */}
                <div className="flex items-center gap-3">
                  <input id="cm-visible" type="checkbox" checked={form.isVisible}
                    onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="cm-visible" className="text-sm font-medium text-gray-700">Visible to students</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-4 shrink-0 border-t border-gray-100">
                <button type="button" onClick={closeModal} disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50"
                >Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50 min-w-[120px]"
                >
                  {isSubmitting ? (editingId ? 'Saving...' : 'Creating...') : (editingId ? 'Save Changes' : 'Add Module')}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" aria-hidden />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-xl shadow-xl border border-gray-200 p-6"
            role="dialog" aria-modal="true"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Module?</h2>
            <p className="text-sm text-gray-600 mb-6">
              This will permanently delete the module and all its items. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteId(null)} disabled={isDeleting}
                className="px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50"
              >Cancel</button>
              <button type="button" onClick={handleDelete} disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 min-w-[100px]"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Module Title</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Course Offering</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Order</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Visible</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Unlock Date</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">Loading modules...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">
                    {search || filterOffering ? 'No modules match your filter.' : 'No modules yet. Add one to get started.'}
                  </td>
                </tr>
              ) : (
                paginated.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium text-gray-900">{m.title}</div>
                      {m.description && (
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{m.description}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 max-w-xs">
                      <span className="line-clamp-2">{m.offeringLabel}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{m.sortOrder}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-medium ${m.isVisible ? 'text-green-600' : 'text-gray-400'}`}>
                        {m.isVisible ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {m.unlockDate
                        ? new Date(m.unlockDate).toLocaleDateString()
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button" onClick={() => openEditModal(m)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900" title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button" onClick={() => setDeleteId(m.id)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-red-600" title="Delete"
                        >
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
            {totalCount === 0 ? 'No results' : `Showing ${start + 1}–${end} of ${totalCount}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none" aria-label="Previous page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button" onClick={() => setPage((p) => p + 1)} disabled={end >= totalCount}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none" aria-label="Next page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
