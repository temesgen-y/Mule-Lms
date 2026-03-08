'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const PAGE_SIZE = 10;
const LETTER_GRADES = ['A', 'B', 'C', 'D', 'F'] as const;

type GradebookItem = {
  id: string;
  enrollment_id: string;
  assessment_id: string | null;
  assignment_id: string | null;
  grade_id: string | null;
  raw_score: number;
  weight_pct: number;
  weighted_score: number;
  letter_grade: string | null;
  is_overridden: boolean;
  override_by: string | null;
  override_note: string | null;
  recorded_at: string;
  updated_at: string;
  student_name?: string;
  item_title?: string;
  item_type?: 'assessment' | 'assignment';
};

type OfferingOption = { id: string; label: string };
type EnrollmentOption = { id: string; student_id: string; student_name: string };
type AssessmentOption = { id: string; title: string; weight_pct: number };
type AssignmentOption = { id: string; title: string; weight_pct: number };
type GradeOption = { id: string; label: string; raw_score: number; total_marks: number };

const blank = () => ({
  enrollment_id: '',
  item_type: 'assessment' as 'assessment' | 'assignment',
  assessment_id: null as string | null,
  assignment_id: null as string | null,
  grade_id: null as string | null,
  raw_score: 0,
  weight_pct: 0,
  weighted_score: 0,
  letter_grade: null as string | null,
  is_overridden: false,
  override_note: '',
});

export default function GradebookItemsPage() {
  const supabase = createClient();

  const [items, setItems] = useState<GradebookItem[]>([]);
  const [offerings, setOfferings] = useState<OfferingOption[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentOption[]>([]);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentOption[]>([]);
  const [gradeOptions, setGradeOptions] = useState<GradeOption[]>([]);

  const [filterOffering, setFilterOffering] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GradebookItem | null>(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GradebookItem | null>(null);
  const [offeringForForm, setOfferingForForm] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const loadOfferings = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { data: userData } = await supabase.from('users').select('id').eq('auth_user_id', authData.user.id).single();
    if (!userData) return;
    setCurrentUserId(userData.id);
    const { data: ciRows } = await supabase
      .from('course_instructors')
      .select('offering_id, course_offerings!fk_course_instructors_offering(id, section_name, courses!fk_course_offerings_course(code, title))')
      .eq('instructor_id', userData.id);
    if (!ciRows) return;
    setOfferings(ciRows.map((r: any) => ({
      id: r.offering_id,
      label: `${r.course_offerings?.courses?.code ?? ''} – ${r.course_offerings?.section_name ?? r.offering_id}`,
    })));
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { setLoading(false); return; }
    const { data: userData } = await supabase.from('users').select('id').eq('auth_user_id', authData.user.id).single();
    if (!userData) { setLoading(false); return; }

    const { data: ciRows } = await supabase.from('course_instructors').select('offering_id').eq('instructor_id', userData.id);
    const offeringIds = (ciRows ?? []).map((r: any) => r.offering_id);
    if (!offeringIds.length) { setItems([]); setLoading(false); return; }

    const { data: enRows } = await supabase.from('enrollments').select('id').in('offering_id', offeringIds);
    const enrollmentIds = (enRows ?? []).map((r: any) => r.id);
    if (!enrollmentIds.length) { setItems([]); setLoading(false); return; }

    const { data, error } = await supabase
      .from('gradebook_items')
      .select(`
        id, enrollment_id, assessment_id, assignment_id, grade_id,
        raw_score, weight_pct, weighted_score, letter_grade,
        is_overridden, override_by, override_note, recorded_at, updated_at,
        enrollments!fk_gradebook_items_enrollment(
          student_id, users!fk_enrollments_student(first_name, last_name)
        ),
        assessments!fk_gradebook_items_assessment(title),
        assignments!fk_gradebook_items_assignment(title)
      `)
      .in('enrollment_id', enrollmentIds)
      .order('recorded_at', { ascending: false });

    if (error) { toast.error(error.message); setLoading(false); return; }

    setItems((data ?? []).map((r: any) => ({
      id: r.id,
      enrollment_id: r.enrollment_id,
      assessment_id: r.assessment_id,
      assignment_id: r.assignment_id,
      grade_id: r.grade_id,
      raw_score: r.raw_score,
      weight_pct: r.weight_pct,
      weighted_score: r.weighted_score,
      letter_grade: r.letter_grade,
      is_overridden: r.is_overridden,
      override_by: r.override_by,
      override_note: r.override_note,
      recorded_at: r.recorded_at,
      updated_at: r.updated_at,
      student_name: r.enrollments?.users ? `${r.enrollments.users.first_name} ${r.enrollments.users.last_name}` : '—',
      item_title: r.assessments?.title ?? r.assignments?.title ?? '—',
      item_type: r.assessment_id ? 'assessment' : 'assignment',
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadOfferings(); loadItems(); }, []);

  const loadFormData = async (offeringId: string) => {
    const { data: enRows } = await supabase
      .from('enrollments')
      .select('id, student_id, users!fk_enrollments_student(first_name, last_name)')
      .eq('offering_id', offeringId).eq('status', 'active');
    setEnrollments((enRows ?? []).map((r: any) => ({
      id: r.id,
      student_id: r.student_id,
      student_name: r.users ? `${r.users.first_name} ${r.users.last_name}` : r.student_id,
    })));
    const { data: aData } = await supabase.from('assessments').select('id, title, weight_pct').eq('offering_id', offeringId);
    setAssessments(aData ?? []);
    const { data: assignData } = await supabase.from('assignments').select('id, title, weight_pct').eq('offering_id', offeringId);
    setAssignments(assignData ?? []);
  };

  const loadGradeOptions = async (enrollmentId: string, itemType: string) => {
    const { data } = await supabase
      .from('grades')
      .select('id, raw_score, total_marks, assessment_id, assignment_id')
      .eq('enrollment_id', enrollmentId);
    const filtered = (data ?? []).filter((g: any) =>
      itemType === 'assessment' ? g.assessment_id !== null : g.assignment_id !== null
    );
    setGradeOptions(filtered.map((g: any) => ({
      id: g.id,
      label: `Score: ${g.raw_score}/${g.total_marks}`,
      raw_score: g.raw_score,
      total_marks: g.total_marks,
    })));
  };

  const openAdd = () => {
    setEditing(null);
    setForm(blank());
    setOfferingForForm(filterOffering);
    setEnrollments([]); setAssessments([]); setAssignments([]); setGradeOptions([]);
    if (filterOffering) loadFormData(filterOffering);
    setShowModal(true);
  };

  const openEdit = (item: GradebookItem) => {
    setEditing(item);
    setForm({
      enrollment_id: item.enrollment_id,
      item_type: item.item_type ?? 'assessment',
      assessment_id: item.assessment_id,
      assignment_id: item.assignment_id,
      grade_id: item.grade_id,
      raw_score: item.raw_score,
      weight_pct: item.weight_pct,
      weighted_score: item.weighted_score,
      letter_grade: item.letter_grade,
      is_overridden: item.is_overridden,
      override_note: item.override_note ?? '',
    });
    setShowModal(true);
  };

  const calcWeightedScore = (raw: number, weight: number) =>
    Math.round((raw * weight / 100) * 100) / 100;

  const handleSave = async () => {
    if (!form.enrollment_id) { toast.error('Select a student'); return; }
    if (form.item_type === 'assessment' && !form.assessment_id) { toast.error('Select an assessment'); return; }
    if (form.item_type === 'assignment' && !form.assignment_id) { toast.error('Select an assignment'); return; }
    if (form.is_overridden && !form.override_note) { toast.error('Override note required when overriding'); return; }

    setSaving(true);
    const weighted_score = calcWeightedScore(form.raw_score, form.weight_pct);

    const payload = {
      enrollment_id: form.enrollment_id,
      assessment_id: form.item_type === 'assessment' ? form.assessment_id : null,
      assignment_id: form.item_type === 'assignment' ? form.assignment_id : null,
      grade_id: form.grade_id || null,
      raw_score: form.raw_score,
      weight_pct: form.weight_pct,
      weighted_score,
      letter_grade: form.letter_grade || null,
      is_overridden: form.is_overridden,
      override_by: form.is_overridden ? currentUserId : null,
      override_note: form.is_overridden ? form.override_note : null,
    };

    if (editing) {
      const { error } = await supabase.from('gradebook_items').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Gradebook item updated');
    } else {
      const { error } = await supabase.from('gradebook_items').insert(payload);
      if (error) {
        if (error.message.includes('uq_gradebook_items')) {
          toast.error('A gradebook entry already exists for this enrollment and item.');
        } else {
          toast.error(error.message);
        }
        setSaving(false);
        return;
      }
      toast.success('Gradebook item recorded');
    }
    setSaving(false);
    setShowModal(false);
    loadItems();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('gradebook_items').delete().eq('id', deleteTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Gradebook item deleted');
    setDeleteTarget(null);
    loadItems();
  };

  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gradebook Items</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
          + Add Entry
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={filterOffering}
          onChange={e => { setFilterOffering(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Offerings</option>
          {offerings.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Student', 'Item', 'Type', 'Raw', 'Weight', 'Weighted', 'Letter', 'Override', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No gradebook entries found</td></tr>
                ) : paginated.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.student_name}</td>
                    <td className="px-4 py-3 text-gray-700">{item.item_title}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.item_type === 'assessment' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.item_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.raw_score}</td>
                    <td className="px-4 py-3">{item.weight_pct}%</td>
                    <td className="px-4 py-3 font-medium">{item.weighted_score}</td>
                    <td className="px-4 py-3">
                      {item.letter_grade ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">{item.letter_grade}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.is_overridden ? (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">Overridden</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        <button onClick={() => setDeleteTarget(item)} className="text-red-500 hover:underline text-xs">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm text-gray-600">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Gradebook Entry' : 'Add Gradebook Entry'}</h2>
            <div className="space-y-4">
              {!editing && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Offering</label>
                    <select
                      value={offeringForForm}
                      onChange={e => { setOfferingForForm(e.target.value); if (e.target.value) loadFormData(e.target.value); }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Select offering…</option>
                      {offerings.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                    <select
                      value={form.enrollment_id}
                      onChange={e => {
                        setForm(f => ({ ...f, enrollment_id: e.target.value }));
                        if (e.target.value) loadGradeOptions(e.target.value, form.item_type);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      disabled={!offeringForForm}
                    >
                      <option value="">Select student…</option>
                      {enrollments.map(e => <option key={e.id} value={e.id}>{e.student_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
                    <div className="flex gap-4">
                      {(['assessment', 'assignment'] as const).map(t => (
                        <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" checked={form.item_type === t} onChange={() => setForm(f => ({ ...f, item_type: t, assessment_id: null, assignment_id: null, weight_pct: 0 }))} />
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {form.item_type === 'assessment' ? 'Assessment' : 'Assignment'}
                    </label>
                    <select
                      value={form.item_type === 'assessment' ? form.assessment_id ?? '' : form.assignment_id ?? ''}
                      onChange={e => {
                        if (form.item_type === 'assessment') {
                          const a = assessments.find(a => a.id === e.target.value);
                          setForm(f => ({ ...f, assessment_id: e.target.value, weight_pct: a?.weight_pct ?? 0 }));
                        } else {
                          const a = assignments.find(a => a.id === e.target.value);
                          setForm(f => ({ ...f, assignment_id: e.target.value, weight_pct: a?.weight_pct ?? 0 }));
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      disabled={!offeringForForm}
                    >
                      <option value="">Select…</option>
                      {(form.item_type === 'assessment' ? assessments : assignments).map((a: any) => (
                        <option key={a.id} value={a.id}>{a.title} ({a.weight_pct}%)</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {editing && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  <strong>Student:</strong> {editing.student_name} &nbsp;|&nbsp;
                  <strong>Item:</strong> {editing.item_title}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raw Score</label>
                  <input
                    type="number" min={0} step={0.5}
                    value={form.raw_score}
                    onChange={e => setForm(f => ({ ...f, raw_score: Number(e.target.value), weighted_score: calcWeightedScore(Number(e.target.value), f.weight_pct) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight %</label>
                  <input
                    type="number" min={0} max={100} step={0.5}
                    value={form.weight_pct}
                    onChange={e => setForm(f => ({ ...f, weight_pct: Number(e.target.value), weighted_score: calcWeightedScore(f.raw_score, Number(e.target.value)) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="text-sm text-gray-500">Weighted score: <strong>{calcWeightedScore(form.raw_score, form.weight_pct)}</strong></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Letter Grade</label>
                <select
                  value={form.letter_grade ?? ''}
                  onChange={e => setForm(f => ({ ...f, letter_grade: e.target.value || null }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Not set</option>
                  {LETTER_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox" id="is_overridden" checked={form.is_overridden}
                  onChange={e => setForm(f => ({ ...f, is_overridden: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="is_overridden" className="text-sm text-gray-700">Manual override</label>
              </div>
              {form.is_overridden && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Override Note <span className="text-red-500">*</span></label>
                  <textarea
                    rows={2}
                    value={form.override_note}
                    onChange={e => setForm(f => ({ ...f, override_note: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Reason for override…"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-60">
                {saving ? 'Saving…' : editing ? 'Update' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-2">Delete Gradebook Entry?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Delete entry for <strong>{deleteTarget.student_name}</strong> on <strong>{deleteTarget.item_title}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
