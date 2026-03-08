'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const PAGE_SIZE = 15;

type Student = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  created_at: string;
  student_no: string | null;
  program: string | null;
  degree_level: string | null;
  profile_status: string | null;
};

export default function StudentsPage() {
  const supabase = createClient();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, email, first_name, last_name, status, created_at,
        student_profiles!user_id(student_no, program, degree_level, profile_status)
      `)
      .in('role', ['STUDENT', 'student'])
      .order('created_at', { ascending: false });

    if (error) { toast.error(error.message); setLoading(false); return; }

    setStudents(
      (data ?? []).map((r: any) => ({
        id: r.id,
        email: r.email,
        first_name: r.first_name,
        last_name: r.last_name,
        status: r.status,
        created_at: r.created_at,
        student_no: r.student_profiles?.student_no ?? null,
        program: r.student_profiles?.program ?? null,
        degree_level: r.student_profiles?.degree_level ?? null,
        profile_status: r.student_profiles?.profile_status ?? null,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      ACTIVE: 'bg-green-100 text-green-700',
      pending: 'bg-amber-100 text-amber-700',
      PENDING: 'bg-amber-100 text-amber-700',
      inactive: 'bg-gray-100 text-gray-500',
      INACTIVE: 'bg-gray-100 text-gray-500',
      suspended: 'bg-red-100 text-red-600',
      SUSPENDED: 'bg-red-100 text-red-600',
    };
    return map[s] ?? 'bg-gray-100 text-gray-600';
  };

  const filtered = students
    .filter(s => !filterStatus || s.status.toLowerCase() === filterStatus.toLowerCase())
    .filter(s => {
      const q = search.toLowerCase();
      return (
        !q ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.student_no ?? '').toLowerCase().includes(q) ||
        (s.program ?? '').toLowerCase().includes(q)
      );
    });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const counts = {
    total: students.length,
    active: students.filter(s => s.status.toLowerCase() === 'active').length,
    pending: students.filter(s => s.status.toLowerCase() === 'pending').length,
    suspended: students.filter(s => s.status.toLowerCase() === 'suspended').length,
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">All registered students and their profiles</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', count: counts.total, color: 'text-gray-700', key: '' },
          { label: 'Active', count: counts.active, color: 'text-green-600', key: 'active' },
          { label: 'Pending', count: counts.pending, color: 'text-amber-600', key: 'pending' },
          { label: 'Suspended', count: counts.suspended, color: 'text-red-600', key: 'suspended' },
        ].map(c => (
          <button
            key={c.key}
            onClick={() => { setFilterStatus(filterStatus === c.key ? '' : c.key); setPage(1); }}
            className={`bg-white rounded-xl border p-4 text-left hover:shadow-sm transition ${filterStatus === c.key ? 'border-primary ring-1 ring-primary' : 'border-gray-200'}`}
          >
            <div className={`text-2xl font-bold ${c.color}`}>{c.count}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          placeholder="Search name, email, student no, program…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72"
        />
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Student', 'Email', 'Student No.', 'Program', 'Degree Level', 'Status', 'Registered'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">No students found</td>
                  </tr>
                ) : paginated.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {s.first_name?.[0]?.toUpperCase()}{s.last_name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 whitespace-nowrap">
                          {s.first_name} {s.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.email}</td>
                    <td className="px-4 py-3">
                      {s.student_no ? (
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {s.student_no}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs italic">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-[130px] truncate" title={s.program ?? ''}>
                      {s.program ?? <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {s.degree_level ? (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs capitalize">
                          {s.degree_level.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(s.status)}`}>
                        {s.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
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
    </div>
  );
}
