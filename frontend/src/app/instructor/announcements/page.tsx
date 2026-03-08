'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

type Announcement = {
  id: string;
  offering_id: string | null;
  author_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  send_email: boolean;
  created_at: string;
  updated_at: string;
  offering_label?: string;
};

type OfferingOption = { id: string; label: string };

const blank = () => ({
  offering_id: '' as string,
  title: '',
  body: '',
  is_pinned: false,
  send_email: false,
});

async function notifyEnrolledStudents(
  supabase: ReturnType<typeof createClient>,
  offeringId: string,
  title: string,
  body: string
) {
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('offering_id', offeringId)
    .eq('status', 'active');
  if (!enrollments?.length) return;
  await supabase.from('notifications').insert(
    enrollments.map((e: any) => ({
      user_id: e.student_id,
      type: 'announcement',
      title,
      body,
      link: `/dashboard/announcements`,
    }))
  );
}

export default function AnnouncementsPage() {
  const supabase = createClient();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [offerings, setOfferings] = useState<OfferingOption[]>([]);
  const [filterOffering, setFilterOffering] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
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

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { setLoading(false); return; }
    const { data: userData } = await supabase.from('users').select('id').eq('auth_user_id', authData.user.id).single();
    if (!userData) { setLoading(false); return; }

    const { data: ciRows } = await supabase.from('course_instructors').select('offering_id').eq('instructor_id', userData.id);
    const offeringIds = (ciRows ?? []).map((r: any) => r.offering_id);

    const { data, error } = await supabase
      .from('announcements')
      .select(`
        id, offering_id, author_id, title, body, is_pinned, send_email, created_at, updated_at,
        course_offerings!fk_announcements_offering(
          section_name, courses!fk_course_offerings_course(code, title)
        )
      `)
      .eq('author_id', userData.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) { toast.error(error.message); setLoading(false); return; }

    setAnnouncements((data ?? []).map((r: any) => ({
      id: r.id,
      offering_id: r.offering_id,
      author_id: r.author_id,
      title: r.title,
      body: r.body,
      is_pinned: r.is_pinned,
      send_email: r.send_email,
      created_at: r.created_at,
      updated_at: r.updated_at,
      offering_label: r.course_offerings
        ? `${r.course_offerings.courses?.code ?? ''} – ${r.course_offerings.section_name}`
        : 'Global',
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadOfferings(); loadAnnouncements(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...blank(), offering_id: filterOffering });
    setShowModal(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      offering_id: a.offering_id ?? '',
      title: a.title,
      body: a.body,
      is_pinned: a.is_pinned,
      send_email: a.send_email,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.body.trim()) { toast.error('Body is required'); return; }
    setSaving(true);

    const payload = {
      offering_id: form.offering_id || null,
      author_id: currentUserId,
      title: form.title.trim(),
      body: form.body.trim(),
      is_pinned: form.is_pinned,
      send_email: form.send_email,
    };

    if (editing) {
      const { error } = await supabase.from('announcements').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Announcement updated');
    } else {
      const { error } = await supabase.from('announcements').insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      if (form.offering_id) {
        await notifyEnrolledStudents(supabase, form.offering_id, form.title, form.body.slice(0, 120));
        toast.success('Announcement posted and students notified');
      } else {
        toast.success('Announcement posted');
      }
    }
    setSaving(false);
    setShowModal(false);
    loadAnnouncements();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('announcements').delete().eq('id', deleteTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Announcement deleted');
    setDeleteTarget(null);
    loadAnnouncements();
  };

  const filtered = announcements.filter(a =>
    !filterOffering || a.offering_id === filterOffering
  );
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
          + New Announcement
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
        <div className="space-y-3">
          {paginated.length === 0 ? (
            <div className="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">No announcements found</div>
          ) : paginated.map(a => (
            <div key={a.id} className={`rounded-xl border p-4 ${a.is_pinned ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {a.is_pinned && (
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs font-semibold">Pinned</span>
                    )}
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{a.offering_label}</span>
                    {a.send_email && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">Email Sent</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.body}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(a.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(a)} className="text-blue-600 hover:underline text-sm">Edit</button>
                  <button onClick={() => setDeleteTarget(a)} className="text-red-500 hover:underline text-sm">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm text-gray-600">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Announcement' : 'New Announcement'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Offering (leave blank for global)</label>
                <select
                  value={form.offering_id}
                  onChange={e => setForm(f => ({ ...f, offering_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Global (all students)</option>
                  {offerings.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Announcement title…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body <span className="text-red-500">*</span></label>
                <textarea
                  rows={5}
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Write your announcement…"
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))} className="rounded" />
                  Pin announcement
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.send_email} onChange={e => setForm(f => ({ ...f, send_email: e.target.checked }))} className="rounded" />
                  Send email
                </label>
              </div>
              {!editing && form.offering_id && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  Enrolled students will receive an in-app notification when you post this announcement.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-60">
                {saving ? 'Posting…' : editing ? 'Update' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-2">Delete Announcement?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Delete <strong>"{deleteTarget.title}"</strong>? This cannot be undone.
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
