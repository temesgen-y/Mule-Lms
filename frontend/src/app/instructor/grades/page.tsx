'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

type Grade = {
  id: string;
  student_id: string;
  enrollment_id: string;
  assessment_id: string | null;
  assignment_id: string | null;
  attempt_id: string | null;
  raw_score: number;
  total_marks: number;
  score_pct: number;
  passed: boolean;
  recorded_at: string;
  updated_at: string;
  student_name?: string;
  item_title?: string;
  item_type?: 'assessment' | 'assignment';
};

type OfferingOption = { id: string; label: string };
type EnrollmentOption = { id: string; student_id: string; student_name: string };
type AssessmentOption = { id: string; title: string; total_marks: number };
type AssignmentOption = { id: string; title: string; max_score: number };

const blank = () => ({
  student_id: '',
  enrollment_id: '',
  item_type: 'assessment' as 'assessment' | 'assignment',
  assessment_id: '' as string | null,
  assignment_id: '' as string | null,
  attempt_id: null as string | null,
  raw_score: 0,
  total_marks: 100,
  passed: false,
});

async function notifyStudent(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  title: string,
  body: string,
  link?: string
) {
  await supabase.from('notifications').insert({
    user_id: studentId,
    type: 'grade_released',
    title,
    body,
    link: link ?? null,
  });
}

export default function GradesPage() {
  const supabase = createClient();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [offerings, setOfferings] = useState<OfferingOption[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentOption[]>([]);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentOption[]>([]);

  const [filterOffering, setFilterOffering] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Grade | null>(null);
  const [offeringForForm, setOfferingForForm] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const loadOfferings = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authData.user.id)
      .single();
    if (!userData) return;
    setCurrentUserId(userData.id);
    const { data: ciRows } = await supabase
      .from('course_instructors')
      .select('offering_id, course_offerings!fk_course_instructors_offering(id, section_name, courses!fk_course_offerings_course(code, title))')
      .eq('instructor_id', userData.id);
    if (!ciRows) return;
    const opts: OfferingOption[] = ciRows.map((r: any) => ({
      id: r.offering_id,
      label: `${r.course_offerings?.courses?.code ?? ''} – ${r.course_offerings?.section_name ?? r.offering_id}`,
    }));
    setOfferings(opts);
  }, []);

  const loadGrades = useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { setLoading(false); return; }
    const { data: userData } = await supabase
      .from('users').select('id').eq('auth_user_id', authData.user.id).single();
    if (!userData) { setLoading(false); return; }

    const { data: ciRows } = await supabase
      .from('course_instructors').select('offering_id').eq('instructor_id', userData.id);
    const offeringIds = (ciRows ?? []).map((r: any) => r.offering_id);
    if (!offeringIds.length) { setGrades([]); setLoading(false); return; }

    const { data: enRows } = await supabase
      .from('enrollments')
      .select('id, student_id')
      .in('offering_id', offeringIds)
      .eq('status', 'active');
    const enrollmentIds = (enRows ?? []).map((r: any) => r.id);
    if (!enrollmentIds.length) { setGrades([]); setLoading(false); return; }

    const { data, error } = await supabase
      .from('grades')
      .select(`
        id, student_id, enrollment_id, assessment_id, assignment_id, attempt_id,
        raw_score, total_marks, score_pct, passed, recorded_at, updated_at,
        users!fk_grades_student(first_name, last_name),
        assessments!fk_grades_assessment(title),
        assignments!fk_grades_assignment(title)
      `)
      .in('enrollment_id', enrollmentIds)
      .order('recorded_at', { ascending: false });

    if (error) { toast.error(error.message); setLoading(false); return; }

    const rows: Grade[] = (data ?? []).map((r: any) => ({
      id: r.id,
      student_id: r.student_id,
      enrollment_id: r.enrollment_id,
      assessment_id: r.assessment_id,
      assignment_id: r.assignment_id,
      attempt_id: r.attempt_id,
      raw_score: r.raw_score,
      total_marks: r.total_marks,
      score_pct: r.score_pct,
      passed: r.passed,
      recorded_at: r.recorded_at,
      updated_at: r.updated_at,
      student_name: r.users ? `${r.users.first_name} ${r.users.last_name}` : '—',
      item_title: r.assessments?.title ?? r.assignments?.title ?? '—',
      item_type: r.assessment_id ? 'assessment' : 'assignment',
    }));
    setGrades(rows);
    setLoading(false);
  }, []);

  useEffect(() => { loadOfferings(); loadGrades(); }, []);

  const loadEnrollmentsForOffering = async (offeringId: string) => {
    const { data } = await supabase
      .from('enrollments')
      .select('id, student_id, users!fk_enrollments_student(first_name, last_name)')
      .eq('offering_id', offeringId)
      .eq('status', 'active');
    setEnrollments((data ?? []).map((r: any) => ({
      id: r.id,
      student_id: r.student_id,
      student_name: r.users ? `${r.users.first_name} ${r.users.last_name}` : r.student_id,
    })));
    const { data: aData } = await supabase
      .from('assessments').select('id, title, total_marks').eq('offering_id', offeringId);
    setAssessments(aData ?? []);
    const { data: assignData } = await supabase
      .from('assignments').select('id, title, max_score').eq('offering_id', offeringId);
    setAssignments(assignData ?? []);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(blank());
    setOfferingForForm(filterOffering);
    if (filterOffering) loadEnrollmentsForOffering(filterOffering);
    setShowModal(true);
  };

  const openEdit = (g: Grade) => {
    setEditing(g);
    const offeringId = offerings.find(() => true)?.id ?? '';
    setOfferingForForm('');
    setEnrollments([]);
    setAssessments([]);
    setAssignments([]);
    setForm({
      student_id: g.student_id,
      enrollment_id: g.enrollment_id,
      item_type: g.item_type ?? 'assessment',
      assessment_id: g.assessment_id,
      assignment_id: g.assignment_id,
      attempt_id: g.attempt_id,
      raw_score: g.raw_score,
      total_marks: g.total_marks,
      passed: g.passed,
    });
    setShowModal(true);
  };

  const handleOfferingChange = (id: string) => {
    setOfferingForForm(id);
    setForm(f => ({ ...f, enrollment_id: '', student_id: '', assessment_id: null, assignment_id: null, total_marks: 100 }));
    if (id) loadEnrollmentsForOffering(id);
  };

  const handleEnrollmentChange = (enrollmentId: string) => {
    const en = enrollments.find(e => e.id === enrollmentId);
    setForm(f => ({ ...f, enrollment_id: enrollmentId, student_id: en?.student_id ?? '' }));
  };

  const handleItemSelect = (id: string) => {
    if (form.item_type === 'assessment') {
      const a = assessments.find(a => a.id === id);
      setForm(f => ({ ...f, assessment_id: id, assignment_id: null, total_marks: a?.total_marks ?? 100 }));
    } else {
      const a = assignments.find(a => a.id === id);
      setForm(f => ({ ...f, assignment_id: id, assessment_id: null, total_marks: a?.max_score ?? 100 }));
    }
  };

  const handleSave = async () => {
    if (!form.enrollment_id) { toast.error('Select a student enrollment'); return; }
    if (form.item_type === 'assessment' && !form.assessment_id) { toast.error('Select an assessment'); return; }
    if (form.item_type === 'assignment' && !form.assignment_id) { toast.error('Select an assignment'); return; }
    if (form.raw_score < 0) { toast.error('Score cannot be negative'); return; }
    if (form.raw_score > form.total_marks) { toast.error('Score exceeds total marks'); return; }

    setSaving(true);
    const score_pct = form.total_marks > 0 ? Math.round((form.raw_score / form.total_marks) * 10000) / 100 : 0;
    const passed = score_pct >= 50;

    const payload = {
      student_id: form.student_id,
      enrollment_id: form.enrollment_id,
      assessment_id: form.item_type === 'assessment' ? form.assessment_id : null,
      assignment_id: form.item_type === 'assignment' ? form.assignment_id : null,
      attempt_id: form.attempt_id,
      raw_score: form.raw_score,
      total_marks: form.total_marks,
      score_pct,
      passed,
    };

    if (editing) {
      const { error } = await supabase.from('grades').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      const itemTitle = form.item_type === 'assessment'
        ? assessments.find(a => a.id === form.assessment_id)?.title
        : assignments.find(a => a.id === form.assignment_id)?.title;
      await notifyStudent(supabase, form.student_id,
        'Grade Updated',
        `Your grade for "${itemTitle ?? 'an item'}" has been updated: ${form.raw_score}/${form.total_marks} (${score_pct}%)`
      );
      toast.success('Grade updated');
    } else {
      const { error } = await supabase.from('grades').insert(payload);
      if (error) {
        if (error.message.includes('uq_grades_assessment') || error.message.includes('uq_grades_assignment')) {
          toast.error('A grade already exists for this student and item. Edit the existing record instead.');
        } else {
          toast.error(error.message);
        }
        setSaving(false);
        return;
      }
      const itemTitle = form.item_type === 'assessment'
        ? assessments.find(a => a.id === form.assessment_id)?.title
        : assignments.find(a => a.id === form.assignment_id)?.title;
      await notifyStudent(supabase, form.student_id,
        'Grade Released',
        `Your grade for "${itemTitle ?? 'an item'}" is available: ${form.raw_score}/${form.total_marks} (${score_pct}%)`
      );
      toast.success('Grade recorded and student notified');
    }
    setSaving(false);
    setShowModal(false);
    loadGrades();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('grades').delete().eq('id', deleteTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Grade deleted');
    setDeleteTarget(null);
    loadGrades();
  };

  const filtered = filterOffering
    ? grades.filter(g => {
        const enr = enrollments.find(e => e.id === g.enrollment_id);
        return true;
      })
    : grades;

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Grades</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
          + Record Grade
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
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
                  {['Student', 'Item', 'Type', 'Score', '% / Pass', 'Recorded', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No grades found</td></tr>
                ) : paginated.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{g.student_name}</td>
                    <td className="px-4 py-3 text-gray-700">{g.item_title}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.item_type === 'assessment' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {g.item_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{g.raw_score}/{g.total_marks}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${g.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {g.score_pct}% — {g.passed ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(g.recorded_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(g)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        <button onClick={() => setDeleteTarget(g)} className="text-red-500 hover:underline text-xs">Delete</button>
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
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Grade' : 'Record Grade'}</h2>
            <div className="space-y-4">
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offering</label>
                  <select
                    value={offeringForForm}
                    onChange={e => handleOfferingChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select offering…</option>
                    {offerings.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
              )}
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                  <select
                    value={form.enrollment_id}
                    onChange={e => handleEnrollmentChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    disabled={!offeringForForm}
                  >
                    <option value="">Select student…</option>
                    {enrollments.map(e => <option key={e.id} value={e.id}>{e.student_name}</option>)}
                  </select>
                </div>
              )}
              {editing && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  <strong>Student:</strong> {editing.student_name} &nbsp;|&nbsp;
                  <strong>Item:</strong> {editing.item_title}
                </div>
              )}
              {!editing && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
                    <div className="flex gap-4">
                      {(['assessment', 'assignment'] as const).map(t => (
                        <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" checked={form.item_type === t} onChange={() => setForm(f => ({ ...f, item_type: t, assessment_id: null, assignment_id: null }))} />
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
                      onChange={e => handleItemSelect(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      disabled={!offeringForForm}
                    >
                      <option value="">Select…</option>
                      {(form.item_type === 'assessment' ? assessments : assignments).map((a: any) => (
                        <option key={a.id} value={a.id}>{a.title}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raw Score</label>
                  <input
                    type="number" min={0} max={form.total_marks} step={0.5}
                    value={form.raw_score}
                    onChange={e => setForm(f => ({ ...f, raw_score: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                  <input
                    type="number" min={1}
                    value={form.total_marks}
                    onChange={e => setForm(f => ({ ...f, total_marks: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    disabled={!editing}
                  />
                </div>
              </div>
              {form.total_marks > 0 && (
                <div className="text-sm text-gray-500">
                  Score: {Math.round((form.raw_score / form.total_marks) * 10000) / 100}%
                  &nbsp;— {(form.raw_score / form.total_marks) >= 0.5 ? '✓ Pass' : '✗ Fail'}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-60">
                {saving ? 'Saving…' : editing ? 'Update' : 'Record & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-2">Delete Grade?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Delete grade for <strong>{deleteTarget.student_name}</strong> on <strong>{deleteTarget.item_title}</strong>? This cannot be undone.
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
