'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

type Assignment = {
  id: string; offeringId: string; offeringLabel: string; title: string;
  maxScore: number; weightPct: number; dueDate: string;
  allowFiles: boolean; allowText: boolean; lateAllowed: boolean; status: string;
};
type OfferingOption = { id: string; label: string };
const STATUSES = ['draft', 'published', 'closed'];
const STATUS_COLORS: Record<string, string> = { draft: 'text-gray-500', published: 'text-green-600', closed: 'text-amber-600' };
const PAGE_SIZE = 10;
const initialForm = { offeringId: '', title: '', brief: '', maxScore: '100', weightPct: '0', allowFiles: true, allowedTypes: '', maxFileMb: '10', allowText: false, dueDate: '', lateAllowed: false, latePenaltyPct: '0', status: 'draft' };

async function notifyEnrolledStudents(supabase: any, offeringId: string, type: string, title: string, body: string) {
  const { data: enrollments } = await supabase.from('enrollments').select('student_id').eq('offering_id', offeringId).eq('status', 'active');
  if (!enrollments?.length) return;
  await supabase.from('notifications').insert(enrollments.map((e: any) => ({ user_id: e.student_id, type, title, body })));
}

export default function InstructorAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [offerings, setOfferings] = useState<OfferingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOffering, setFilterOffering] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(initialForm);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getCurrentUserId = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();
    return data?.id ?? null;
  }, []);

  const fetchOfferings = useCallback(async () => {
    const userId = await getCurrentUserId(); if (!userId) return;
    const supabase = createClient();
    const { data } = await supabase.from('course_instructors').select(`course_offerings!fk_course_instructors_offering(id,section_name,courses!fk_course_offerings_course(code,title),academic_terms!fk_course_offerings_term(academic_year_label,term_name,term_code))`).eq('instructor_id', userId);
    if (data) setOfferings((data ?? []).map((r: any) => { const o = r.course_offerings ?? {}; const c = o.courses ?? {}; const t = o.academic_terms ?? {}; return { id: o.id, label: `${(c.code ?? '').toUpperCase()} — ${c.title ?? '—'} · ${[t.academic_year_label, t.term_name ?? t.term_code].filter(Boolean).join(' · ')} · Sec ${o.section_name ?? 'A'}` }; }).filter((o: OfferingOption) => !!o.id));
  }, [getCurrentUserId]);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    const userId = await getCurrentUserId(); if (!userId) { setLoading(false); return; }
    const supabase = createClient();
    const { data: ciData } = await supabase.from('course_instructors').select('offering_id').eq('instructor_id', userId);
    const offeringIds = (ciData ?? []).map((r: any) => r.offering_id);
    if (!offeringIds.length) { setAssignments([]); setLoading(false); return; }
    const { data, error } = await supabase.from('assignments').select(`id,offering_id,title,max_score,weight_pct,due_date,allow_files,allow_text,late_allowed,status,course_offerings!fk_assignments_offering(section_name,courses!fk_course_offerings_course(code,title),academic_terms!fk_course_offerings_term(academic_year_label,term_name,term_code))`).in('offering_id', offeringIds).order('created_at', { ascending: false });
    if (error) toast.error('Failed to load assignments.');
    else setAssignments((data ?? []).map((r: any) => { const o = r.course_offerings ?? {}; const c = o.courses ?? {}; const t = o.academic_terms ?? {}; return { id: r.id, offeringId: r.offering_id, offeringLabel: `${(c.code ?? '').toUpperCase()} — ${c.title ?? '—'} · ${[t.academic_year_label, t.term_name ?? t.term_code].filter(Boolean).join(' · ')} · Sec ${o.section_name ?? 'A'}`, title: r.title ?? '', maxScore: r.max_score ?? 100, weightPct: r.weight_pct ?? 0, dueDate: r.due_date ?? '', allowFiles: r.allow_files ?? true, allowText: r.allow_text ?? false, lateAllowed: r.late_allowed ?? false, status: r.status ?? 'draft' }; }));
    setLoading(false);
  }, [getCurrentUserId]);

  useEffect(() => { fetchOfferings(); fetchAssignments(); }, [fetchOfferings, fetchAssignments]);

  const openAddModal = useCallback(() => { setEditingId(null); setForm({ ...initialForm, offeringId: filterOffering }); setSubmitError(''); setModalOpen(true); }, [filterOffering]);
  const openEditModal = useCallback((a: Assignment) => {
    setEditingId(a.id);
    setForm({ offeringId: a.offeringId, title: a.title, brief: '', maxScore: String(a.maxScore), weightPct: String(a.weightPct), allowFiles: a.allowFiles, allowedTypes: '', maxFileMb: '10', allowText: a.allowText, dueDate: a.dueDate ? new Date(a.dueDate).toISOString().slice(0, 16) : '', lateAllowed: a.lateAllowed, latePenaltyPct: '0', status: a.status });
    setSubmitError(''); setModalOpen(true);
  }, []);
  const closeModal = useCallback(() => { if (!isSubmitting) setModalOpen(false); }, [isSubmitting]);
  useEffect(() => { if (!modalOpen) return; const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [modalOpen, closeModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitError('');
    if (!form.offeringId) { setSubmitError('Offering is required.'); return; }
    if (!form.title.trim()) { setSubmitError('Title is required.'); return; }
    if (!form.dueDate) { setSubmitError('Due date is required.'); return; }
    const maxScore = parseInt(form.maxScore, 10);
    if (!maxScore || maxScore < 1) { setSubmitError('Max score must be at least 1.'); return; }
    setIsSubmitting(true);
    const userId = await getCurrentUserId();
    const supabase = createClient();
    const prevStatus = editingId ? (assignments.find(a => a.id === editingId)?.status ?? '') : '';
    const payload: any = { offering_id: form.offeringId, created_by: userId, title: form.title.trim(), brief: form.brief.trim() || '(no brief)', max_score: maxScore, weight_pct: parseFloat(form.weightPct) || 0, allow_files: form.allowFiles, allowed_types: form.allowedTypes.trim() || null, max_file_mb: parseInt(form.maxFileMb, 10) || 10, allow_text: form.allowText, due_date: new Date(form.dueDate).toISOString(), late_allowed: form.lateAllowed, late_penalty_pct: parseFloat(form.latePenaltyPct) || 0, status: form.status };
    let error;
    if (editingId) ({ error } = await supabase.from('assignments').update(payload).eq('id', editingId));
    else ({ error } = await supabase.from('assignments').insert(payload));
    if (error) { setSubmitError(error.message); setIsSubmitting(false); return; }
    if (form.status === 'published' && prevStatus !== 'published') {
      await notifyEnrolledStudents(supabase, form.offeringId, 'assignment_due', `New assignment: ${form.title.trim()}`, `A new assignment has been published. Due: ${new Date(form.dueDate).toLocaleDateString()}`);
    }
    toast.success(editingId ? 'Assignment updated.' : 'Assignment created.'); setModalOpen(false); setForm(initialForm); fetchAssignments(); setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return; setIsDeleting(true);
    const { error } = await createClient().from('assignments').delete().eq('id', deleteId);
    if (error) toast.error('Failed to delete assignment.'); else { toast.success('Assignment deleted.'); fetchAssignments(); }
    setDeleteId(null); setIsDeleting(false);
  };

  const filtered = assignments.filter(a => {
    const matchO = !filterOffering || a.offeringId === filterOffering;
    const matchS = !search || a.title.toLowerCase().includes(search.toLowerCase());
    return matchO && matchS;
  });
  const totalCount = filtered.length; const start = (page - 1) * PAGE_SIZE; const end = Math.min(start + PAGE_SIZE, totalCount); const paginated = filtered.slice(start, end);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex flex-wrap gap-3 flex-1">
          <select value={filterOffering} onChange={e => { setFilterOffering(e.target.value); setPage(1); }} className="flex-1 min-w-[200px] max-w-xs px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">All Offerings</option>{offerings.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <input type="search" placeholder="Search assignments..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
        <button type="button" onClick={openAddModal} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New Assignment
        </button>
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" aria-hidden onClick={closeModal} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-xl shadow-xl border border-gray-200" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between shrink-0 p-6 pb-0">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Assignment' : 'New Assignment'}</h2>
              <button type="button" onClick={closeModal} disabled={isSubmitting} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 p-6">
              <div className="space-y-4 overflow-y-auto pr-1 max-h-[60vh]">
                {submitError && <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2">{submitError}</div>}
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Offering *</label><select value={form.offeringId} onChange={e => setForm((f: any) => ({ ...f, offeringId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"><option value="">— Select —</option>{offerings.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input type="text" value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Brief / Instructions</label><textarea rows={3} value={form.brief} onChange={e => setForm((f: any) => ({ ...f, brief: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label><input type="number" min={1} value={form.maxScore} onChange={e => setForm((f: any) => ({ ...f, maxScore: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Weight %</label><input type="number" min={0} max={100} value={form.weightPct} onChange={e => setForm((f: any) => ({ ...f, weightPct: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label><input type="datetime-local" value={form.dueDate} onChange={e => setForm((f: any) => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20">{STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[['allowFiles', 'Allow file uploads'], ['allowText', 'Allow text submission'], ['lateAllowed', 'Allow late submission']].map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2"><input type="checkbox" id={key} checked={form[key]} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" /><label htmlFor={key} className="text-sm text-gray-700">{label}</label></div>
                  ))}
                </div>
                {form.lateAllowed && <div><label className="block text-sm font-medium text-gray-700 mb-1">Late Penalty %</label><input type="number" min={0} max={100} value={form.latePenaltyPct} onChange={e => setForm((f: any) => ({ ...f, latePenaltyPct: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>}
                {form.allowFiles && <div><label className="block text-sm font-medium text-gray-700 mb-1">Allowed File Types</label><input type="text" value={form.allowedTypes} placeholder="e.g. .pdf,.docx" onChange={e => setForm((f: any) => ({ ...f, allowedTypes: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>}
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-4 shrink-0 border-t border-gray-100">
                <button type="button" onClick={closeModal} disabled={isSubmitting} className="px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 min-w-[120px]">{isSubmitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </>
      )}

      {deleteId && (<><div className="fixed inset-0 bg-black/50 z-40" aria-hidden /><div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-xl shadow-xl border border-gray-200 p-6" role="dialog"><h2 className="text-lg font-bold text-gray-900 mb-2">Delete Assignment?</h2><p className="text-sm text-gray-600 mb-6">This will delete the assignment and all submissions.</p><div className="flex justify-end gap-3"><button type="button" onClick={() => setDeleteId(null)} disabled={isDeleting} className="px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-50">Cancel</button><button type="button" onClick={handleDelete} disabled={isDeleting} className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 min-w-[100px]">{isDeleting ? 'Deleting...' : 'Delete'}</button></div></div></>)}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead><tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Title</th>
              <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Score</th>
              <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Weight</th>
              <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Due Date</th>
              <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Status</th>
              <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">Loading...</td></tr>
                : paginated.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">No assignments found.</td></tr>
                : paginated.map(a => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-5 py-3"><div className="text-sm font-medium text-gray-900">{a.title}</div><div className="text-xs text-gray-500 line-clamp-1">{a.offeringLabel}</div></td>
                    <td className="px-5 py-3 text-sm text-gray-600">{a.maxScore}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{a.weightPct}%</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3"><span className={`text-sm font-medium capitalize ${STATUS_COLORS[a.status] ?? 'text-gray-500'}`}>{a.status}</span></td>
                    <td className="px-5 py-3"><div className="flex items-center gap-2">
                      <button type="button" onClick={() => openEditModal(a)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button type="button" onClick={() => setDeleteId(a.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-red-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center px-5 py-3 border-t border-gray-200 bg-gray-50/50">
          <p className="text-sm text-gray-600">{totalCount === 0 ? 'No results' : `Showing ${start + 1}–${end} of ${totalCount}`}</p>
          <div className="flex gap-1">
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
            <button type="button" onClick={() => setPage(p => p + 1)} disabled={end >= totalCount} className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
          </div>
        </div>
      </div>
    </div>
  );
}
