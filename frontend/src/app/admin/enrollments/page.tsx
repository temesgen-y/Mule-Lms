'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const PAGE_SIZE = 15;
const STATUSES = ['active', 'completed', 'dropped', 'failed'] as const;
const FINAL_GRADES = ['A', 'B', 'C', 'D', 'F', 'I'] as const;
type EnrollmentStatus = typeof STATUSES[number];

type Enrollment = {
  id: string;
  student_id: string;
  offering_id: string;
  enrolled_by: string | null;
  status: EnrollmentStatus;
  final_grade: string | null;
  final_score: number | null;
  enrolled_at: string;
  completed_at: string | null;
  dropped_at: string | null;
  student_name: string;
  student_email: string;
  offering_label: string;
};

type StudentOption = { id: string; name: string; email: string };
type OfferingOption = { id: string; label: string };

const blank = () => ({
  student_id: '',
  offering_id: '',
  status: 'active' as EnrollmentStatus,
  final_grade: '' as string,
  final_score: '' as string,
});

export default function EnrollmentsPage() {
  const supabase = createClient();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [offerings, setOfferings] = useState<OfferingOption[]>([]);

  const [search, setSearch] = useState('');
  const [filterOffering, setFilterOffering] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Enrollment | null>(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Enrollment | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');

  const loadOptions = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      const { data: u } = await supabase.from('users').select('id').eq('auth_user_id', authData.user.id).single();
      if (u) setCurrentUserId(u.id);
    }
    const { data: sData } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('role', 'student')
      .eq('status', 'active')
      .order('first_name');
    setStudents((sData ?? []).map((r: any) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`,
      email: r.email,
    })));

    const { data: oData } = await supabase
      .from('course_offerings')
      .select('id, section_name, courses!fk_course_offerings_course(code, title)')
      .in('status', ['upcoming', 'active'])
      .order('section_name');
    setOfferings((oData ?? []).map((r: any) => ({
      id: r.id,
      label: `${r.courses?.code ?? ''} – ${r.section_name}`,
    })));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        id, student_id, offering_id, enrolled_by, status,
        final_grade, final_score, enrolled_at, completed_at, dropped_at,
        users!fk_enrollments_student(first_name, last_name, email),
        course_offerings!fk_enrollments_offering(
          section_name, courses!fk_course_offerings_course(code, title)
        )
      `)
      .order('enrolled_at', { ascending: false });

    if (error) { toast.error(error.message); setLoading(false); return; }

    setEnrollments((data ?? []).map((r: any) => ({
      id: r.id,
      student_id: r.student_id,
      offering_id: r.offering_id,
      enrolled_by: r.enrolled_by,
      status: r.status,
      final_grade: r.final_grade,
      final_score: r.final_score,
      enrolled_at: r.enrolled_at,
      completed_at: r.completed_at,
      dropped_at: r.dropped_at,
      student_name: r.users ? `${r.users.first_name} ${r.users.last_name}` : '—',
      student_email: r.users?.email ?? '',
      offering_label: r.course_offerings
        ? `${r.course_offerings.courses?.code ?? ''} – ${r.course_offerings.section_name}`
        : '—',
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadOptions(); load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...blank(), offering_id: filterOffering });
    setShowModal(true);
  };

  const openEdit = (e: Enrollment) => {
    setEditing(e);
    setForm({
      student_id: e.student_id,
      offering_id: e.offering_id,
      status: e.status,
      final_grade: e.final_grade ?? '',
      final_score: e.final_score !== null ? String(e.final_score) : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.student_id) { toast.error('Select a student'); return; }
    if (!form.offering_id) { toast.error('Select a course offering'); return; }
    setSaving(true);

    const payload: any = {
      student_id: form.student_id,
      offering_id: form.offering_id,
      status: form.status,
      final_grade: form.final_grade || null,
      final_score: form.final_score !== '' ? Number(form.final_score) : null,
    };

    if (editing) {
      const statusExtras: any = {};
      if (form.status === 'completed' && !editing.completed_at) statusExtras.completed_at = new Date().toISOString();
      if (form.status === 'dropped' && !editing.dropped_at) statusExtras.dropped_at = new Date().toISOString();
      const { error } = await supabase.from('enrollments').update({ ...payload, ...statusExtras }).eq('id', editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Enrollment updated');
    } else {
      payload.enrolled_by = currentUserId;
      const { error } = await supabase.from('enrollments').insert(payload);
      if (error) {
        if (error.message.includes('uq_enrollments')) {
          toast.error('This student is already enrolled in that course offering.');
        } else if (error.message.includes('chk_course_offerings_enrolled')) {
          toast.error('Course offering is at maximum capacity.');
        } else {
          toast.error(error.message);
        }
        setSaving(false);
        return;
      }
      toast.success('Student enrolled successfully');
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('enrollments').delete().eq('id', deleteTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Enrollment removed');
    setDeleteTarget(null);
    load();
  };

  const statusBadge = (s: EnrollmentStatus) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
      dropped: 'bg-gray-100 text-gray-500',
      failed: 'bg-red-100 text-red-600',
    };
    return map[s] ?? 'bg-gray-100 text-gray-600';
  };

  const filtered = enrollments
    .filter(e => !filterOffering || e.offering_id === filterOffering)
    .filter(e => !filterStatus || e.status === filterStatus)
    .filter(e => !search || `${e.student_name} ${e.student_email}`.toLowerCase().includes(search.toLowerCase()));

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manually enroll students and monitor all enrollments</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
          + Enroll Student
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {STATUSES.map(s => {
          const count = enrollments.filter(e => e.status === s).length;
          const colors: Record<string, string> = { active: 'text-green-600', completed: 'text-blue-600', dropped: 'text-gray-500', failed: 'text-red-600' };
          return (
            <button
              key={s}
              onClick={() => { setFilterStatus(filterStatus === s ? '' : s); setPage(1); }}
              className={`bg-white rounded-xl border p-4 text-left hover:shadow-sm transition ${filterStatus === s ? 'border-primary ring-1 ring-primary' : 'border-gray-200'}`}
            >
              <div className={`text-2xl font-bold ${colors[s]}`}>{count}</div>
              <div className="text-xs text-gray-500 mt-0.5 capitalize">{s}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          placeholder="Search student…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-56"
        />
        <select value={filterOffering} onChange={e => { setFilterOffering(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Offerings</option>
          {offerings.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Student', 'Email', 'Course Offering', 'Status', 'Grade', 'Score', 'Enrolled', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No enrollments found</td></tr>
                ) : paginated.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{e.student_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{e.student_email}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{e.offering_label}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(e.status)}`}>
                        {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {e.final_grade ? (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">{e.final_grade}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{e.final_score !== null ? e.final_score : '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(e.enrolled_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(e)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        <button onClick={() => setDeleteTarget(e)} className="text-red-500 hover:underline text-xs">Remove</button>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Enrollment' : 'Enroll Student'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student <span className="text-red-500">*</span></label>
                <select
                  value={form.student_id}
                  onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  disabled={!!editing}
                >
                  <option value="">Select student…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                </select>
                {editing && <p className="text-xs text-gray-400 mt-1">Student cannot be changed after enrollment.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Offering <span className="text-red-500">*</span></label>
                <select
                  value={form.offering_id}
                  onChange={e => setForm(f => ({ ...f, offering_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  disabled={!!editing}
                >
                  <option value="">Select offering…</option>
                  {offerings.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                {editing && <p className="text-xs text-gray-400 mt-1">Offering cannot be changed after enrollment.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as EnrollmentStatus }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Final Grade</label>
                  <select
                    value={form.final_grade}
                    onChange={e => setForm(f => ({ ...f, final_grade: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Not set</option>
                    {FINAL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Final Score (0–100)</label>
                  <input
                    type="number" min={0} max={100} step={0.01}
                    value={form.final_score}
                    onChange={e => setForm(f => ({ ...f, final_score: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. 85.50"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-60">
                {saving ? 'Saving…' : editing ? 'Update' : 'Enroll'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-2">Remove Enrollment?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Remove <strong>{deleteTarget.student_name}</strong> from <strong>{deleteTarget.offering_label}</strong>?
              This will delete associated grades and progress records.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
