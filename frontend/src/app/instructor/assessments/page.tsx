'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import RichTextEditor from '@/components/shared/RichTextEditor';

type Assessment = {
  id: string; offeringId: string; offeringLabel: string; title: string; type: string;
  instructions: string; totalMarks: number; passMark: number; timeLimitMins: number | null; maxAttempts: number;
  weightPct: number; status: string; availableFrom: string; availableUntil: string;
};
type OfferingOption = { id: string; label: string };
const TYPES = ['quiz', 'midterm', 'final_exam', 'practice'];
const TYPE_LABELS: Record<string, string> = { quiz: 'Quiz', midterm: 'Midterm', final_exam: 'Final Exam', practice: 'Practice' };
const STATUSES = ['draft', 'published', 'closed', 'archived'];
const STATUS_COLORS: Record<string, string> = { draft: 'text-gray-500', published: 'text-green-600', closed: 'text-amber-600', archived: 'text-gray-400' };
const PAGE_SIZE = 10;
const initialForm = { offeringId: '', title: '', type: 'quiz', instructions: '', totalMarks: '100', timeLimitMins: '', maxAttempts: '1', shuffleQuestions: false, shuffleOptions: false, showResult: true, showAnswers: false, availableFrom: '', availableUntil: '', weightPct: '0', status: 'draft' };

async function notifyEnrolledStudents(supabase: any, offeringId: string, type: string, title: string, body: string) {
  const { data: enrollments } = await supabase.from('enrollments').select('student_id').eq('offering_id', offeringId).eq('status', 'active');
  if (!enrollments?.length) return;
  await supabase.from('notifications').insert(enrollments.map((e: any) => ({ user_id: e.student_id, type, title, body })));
}

export default function InstructorAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
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

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    const userId = await getCurrentUserId(); if (!userId) { setLoading(false); return; }
    const supabase = createClient();
    const { data: ciData } = await supabase.from('course_instructors').select('offering_id').eq('instructor_id', userId);
    const offeringIds = (ciData ?? []).map((r: any) => r.offering_id);
    if (!offeringIds.length) { setAssessments([]); setLoading(false); return; }
    const { data, error } = await supabase.from('assessments').select(`id,offering_id,title,type,total_marks,pass_mark,time_limit_mins,max_attempts,weight_pct,status,available_from,available_until,course_offerings!fk_assessments_offering(section_name,courses!fk_course_offerings_course(code,title),academic_terms!fk_course_offerings_term(academic_year_label,term_name,term_code))`).in('offering_id', offeringIds).order('created_at', { ascending: false });
    if (error) toast.error('Failed to load assessments.');
    else setAssessments((data ?? []).map((r: any) => { const o = r.course_offerings ?? {}; const c = o.courses ?? {}; const t = o.academic_terms ?? {}; return { id: r.id, offeringId: r.offering_id, offeringLabel: `${(c.code ?? '').toUpperCase()} — ${c.title ?? '—'} · ${[t.academic_year_label, t.term_name ?? t.term_code].filter(Boolean).join(' · ')} · Sec ${o.section_name ?? 'A'}`, title: r.title ?? '', type: r.type ?? 'quiz', instructions: r.instructions ?? '', totalMarks: r.total_marks ?? 100, passMark: r.pass_mark ?? 50, timeLimitMins: r.time_limit_mins ?? null, maxAttempts: r.max_attempts ?? 1, weightPct: r.weight_pct ?? 0, status: r.status ?? 'draft', availableFrom: r.available_from ?? '', availableUntil: r.available_until ?? '' }; }));
    setLoading(false);
  }, [getCurrentUserId]);

  useEffect(() => { fetchOfferings(); fetchAssessments(); }, [fetchOfferings, fetchAssessments]);

  const openAddModal = useCallback(() => { setEditingId(null); setForm({ ...initialForm, offeringId: filterOffering }); setSubmitError(''); setModalOpen(true); }, [filterOffering]);
  const openEditModal = useCallback((a: Assessment) => {
    setEditingId(a.id);
    setForm({ offeringId: a.offeringId, title: a.title, type: a.type, instructions: a.instructions ?? '', totalMarks: String(a.totalMarks), timeLimitMins: a.timeLimitMins !== null ? String(a.timeLimitMins) : '', maxAttempts: String(a.maxAttempts), shuffleQuestions: false, shuffleOptions: false, showResult: true, showAnswers: false, availableFrom: a.availableFrom ? new Date(a.availableFrom).toISOString().slice(0, 16) : '', availableUntil: a.availableUntil ? new Date(a.availableUntil).toISOString().slice(0, 16) : '', weightPct: String(a.weightPct), status: a.status });
    setSubmitError(''); setModalOpen(true);
  }, []);
  const closeModal = useCallback(() => { if (!isSubmitting) setModalOpen(false); }, [isSubmitting]);
  useEffect(() => { if (!modalOpen) return; const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [modalOpen, closeModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitError('');
    if (!form.offeringId) { setSubmitError('Offering is required.'); return; }
    if (!form.title.trim()) { setSubmitError('Title is required.'); return; }
    const totalMarks = parseInt(form.totalMarks, 10);
    if (!totalMarks || totalMarks < 1) { setSubmitError('Total marks must be at least 1.'); return; }
    const timeLimitMins = form.timeLimitMins ? parseInt(form.timeLimitMins, 10) : null;
    const maxAttempts = parseInt(form.maxAttempts, 10) || 1;
    const weightPct = parseFloat(form.weightPct) || 0;
    setIsSubmitting(true);
    const userId = await getCurrentUserId();
    const supabase = createClient();
    const payload: any = { offering_id: form.offeringId, created_by: userId, title: form.title.trim(), type: form.type, instructions: form.instructions || null, total_marks: totalMarks, pass_mark: Math.round(totalMarks * 0.5), time_limit_mins: timeLimitMins, max_attempts: maxAttempts, shuffle_questions: form.shuffleQuestions, shuffle_options: form.shuffleOptions, show_result: form.showResult, show_answers: form.showAnswers, available_from: form.availableFrom ? new Date(form.availableFrom).toISOString() : null, available_until: form.availableUntil ? new Date(form.availableUntil).toISOString() : null, weight_pct: weightPct, status: form.status };
    let error; let prevStatus = '';
    if (editingId) {
      const existing = assessments.find(a => a.id === editingId); prevStatus = existing?.status ?? '';
      ({ error } = await supabase.from('assessments').update(payload).eq('id', editingId));
    } else { ({ error } = await supabase.from('assessments').insert(payload)); }
    if (error) { setSubmitError(error.message); setIsSubmitting(false); return; }
    // notify students when publishing
    if (form.status === 'published' && prevStatus !== 'published') {
      await notifyEnrolledStudents(supabase, form.offeringId, 'exam_published', `New assessment: ${form.title.trim()}`, `A new ${TYPE_LABELS[form.type] ?? form.type} has been published in your course.`);
    }
    toast.success(editingId ? 'Assessment updated.' : 'Assessment created.'); setModalOpen(false); setForm(initialForm); fetchAssessments(); setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return; setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('assessments').delete().eq('id', deleteId);
    if (error) toast.error('Failed to delete assessment.'); else { toast.success('Assessment deleted.'); fetchAssessments(); }
    setDeleteId(null); setIsDeleting(false);
  };

  const filtered = assessments.filter(a => {
    const matchO = !filterOffering || a.offeringId === filterOffering;
    const matchS = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.offeringLabel.toLowerCase().includes(search.toLowerCase());
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
            <input type="search" placeholder="Search assessments..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
        <button type="button" onClick={openAddModal} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New Assessment
        </button>
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" aria-hidden onClick={closeModal} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-xl shadow-xl border border-gray-200" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between shrink-0 p-6 pb-0">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Assessment' : 'New Assessment'}</h2>
              <button type="button" onClick={closeModal} disabled={isSubmitting} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 p-6">
              <div className="space-y-4 overflow-y-auto pr-1 max-h-[60vh]">
                {submitError && <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2">{submitError}</div>}
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Offering *</label>
                  <select value={form.offeringId} onChange={e => setForm((f: any) => ({ ...f, offeringId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"><option value="">— Select —</option>{offerings.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input type="text" value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select value={form.type} onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20">{TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20">{STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label><input type="number" min={1} value={form.totalMarks} onChange={e => setForm((f: any) => ({ ...f, totalMarks: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (mins)</label><input type="number" min={1} value={form.timeLimitMins} placeholder="No limit" onChange={e => setForm((f: any) => ({ ...f, timeLimitMins: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts</label><input type="number" min={1} value={form.maxAttempts} onChange={e => setForm((f: any) => ({ ...f, maxAttempts: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Weight %</label><input type="number" min={0} max={100} step={0.01} value={form.weightPct} onChange={e => setForm((f: any) => ({ ...f, weightPct: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Available From</label><input type="datetime-local" value={form.availableFrom} onChange={e => setForm((f: any) => ({ ...f, availableFrom: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Available Until</label><input type="datetime-local" value={form.availableUntil} onChange={e => setForm((f: any) => ({ ...f, availableUntil: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label><RichTextEditor value={form.instructions} onChange={(html: string) => setForm((f: any) => ({ ...f, instructions: html }))} minHeight="160px" /></div>
                <div className="grid grid-cols-2 gap-4">
                  {[['shuffleQuestions', 'Shuffle Questions'], ['shuffleOptions', 'Shuffle Options'], ['showResult', 'Show Result'], ['showAnswers', 'Show Answers']].map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2"><input type="checkbox" id={key} checked={form[key]} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" /><label htmlFor={key} className="text-sm text-gray-700">{label}</label></div>
                  ))}
                </div>
                {form.status === 'published' && !editingId && <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2">Students will be notified when this assessment is published.</div>}
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-4 shrink-0 border-t border-gray-100">
                <button type="button" onClick={closeModal} disabled={isSubmitting} className="px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 min-w-[130px]">{isSubmitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </>
      )}

      {deleteId && (<><div className="fixed inset-0 bg-black/50 z-40" aria-hidden /><div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-xl shadow-xl border border-gray-200 p-6" role="dialog"><h2 className="text-lg font-bold text-gray-900 mb-2">Delete Assessment?</h2><p className="text-sm text-gray-600 mb-6">This will delete the assessment and all its questions.</p><div className="flex justify-end gap-3"><button type="button" onClick={() => setDeleteId(null)} disabled={isDeleting} className="px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-50">Cancel</button><button type="button" onClick={handleDelete} disabled={isDeleting} className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 min-w-[100px]">{isDeleting ? 'Deleting...' : 'Delete'}</button></div></div></>)}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead><tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Title</th>
              <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Type</th>
              <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Marks</th>
              <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Weight</th>
              <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Status</th>
              <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">Loading...</td></tr>
                : paginated.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">No assessments found.</td></tr>
                : paginated.map(a => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-5 py-3"><div className="text-sm font-medium text-gray-900">{a.title}</div><div className="text-xs text-gray-500 line-clamp-1">{a.offeringLabel}</div></td>
                    <td className="px-5 py-3 text-sm text-gray-600">{TYPE_LABELS[a.type] ?? a.type}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{a.passMark}/{a.totalMarks}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{a.weightPct}%</td>
                    <td className="px-5 py-3"><span className={`text-sm font-medium capitalize ${STATUS_COLORS[a.status] ?? 'text-gray-500'}`}>{a.status}</span></td>
                    <td className="px-5 py-3"><div className="flex items-center gap-2">
                      <button type="button" onClick={() => openEditModal(a)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900" title="Edit"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button type="button" onClick={() => setDeleteId(a.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-red-600" title="Delete"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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
