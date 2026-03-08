'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Thread = {
  id: string;
  title: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  created_at: string;
  authorName: string;
  authorId: string;
};

type Post = {
  id: string;
  body: string;
  created_at: string;
  is_answer: boolean;
  upvotes: number;
  authorName: string;
  authorInitials: string;
  parent_id: string | null;
};

function timeAgo(ts: string): string {
  const d = new Date(ts);
  const diffH = (Date.now() - d.getTime()) / 3_600_000;
  if (diffH < 1) return `${Math.floor(diffH * 60)}m ago`;
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  if (diffH < 48) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ClassForumsPage() {
  const params = useParams();
  const offeringId = params?.id as string;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    if (!offeringId) return;
    (async () => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const { data: appUser } = authData.user
        ? await supabase.from('users').select('id').eq('auth_user_id', authData.user.id).single()
        : { data: null };
      if (appUser) setUserId((appUser as { id: string }).id);

      const { data: rows } = await supabase
        .from('forum_threads')
        .select(`
          id, title, is_pinned, is_locked, reply_count, created_at, author_id,
          users!fk_forum_threads_author(first_name, last_name)
        `)
        .eq('offering_id', offeringId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      setThreads(
        ((rows ?? []) as any[]).map(t => ({
          id: t.id,
          title: t.title,
          is_pinned: t.is_pinned,
          is_locked: t.is_locked,
          reply_count: t.reply_count ?? 0,
          created_at: t.created_at,
          authorName: t.users ? `${t.users.first_name} ${t.users.last_name}` : 'Unknown',
          authorId: t.author_id,
        }))
      );
      setLoadingThreads(false);
    })();
  }, [offeringId]);

  const openThread = async (thread: Thread) => {
    setSelectedThread(thread);
    setLoadingPosts(true);
    const supabase = createClient();
    const { data: rows } = await supabase
      .from('forum_posts')
      .select(`
        id, body, created_at, is_answer, upvotes, parent_id,
        users!fk_forum_posts_author(first_name, last_name)
      `)
      .eq('thread_id', thread.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    setPosts(
      ((rows ?? []) as any[]).map(p => {
        const name = p.users ? `${p.users.first_name} ${p.users.last_name}` : 'Unknown';
        return {
          id: p.id,
          body: p.body,
          created_at: p.created_at,
          is_answer: p.is_answer,
          upvotes: p.upvotes ?? 0,
          authorName: name,
          authorInitials: initials(name),
          parent_id: p.parent_id,
        };
      })
    );
    setLoadingPosts(false);
  };

  // ── Thread list view ──────────────────────────────────────────────────────
  if (!selectedThread) {
    return (
      <div className="w-full min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl" aria-hidden>💬</span>
          <h1 className="text-2xl font-bold text-gray-900">Discussion Forums</h1>
        </div>
        <div className="border-t border-gray-200 mb-6" />

        {loadingThreads ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-gray-200 rounded-lg" />)}
          </div>
        ) : threads.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <span className="text-4xl block mb-3">💬</span>
            <p className="text-gray-400">No discussion threads yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Thread', 'Posted by', 'Replies', 'Last Posted'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {threads.map(t => (
                  <tr
                    key={t.id}
                    className="hover:bg-indigo-50 cursor-pointer transition-colors"
                    onClick={() => openThread(t)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {t.is_pinned && <span className="text-amber-500 text-xs">📌</span>}
                        {t.is_locked && <span className="text-gray-400 text-xs">🔒</span>}
                        <span className="font-medium text-gray-900 hover:text-[#4c1d95]">{t.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{t.authorName}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${t.reply_count === 0 ? 'text-amber-600' : 'text-gray-600'}`}>
                        💬 {t.reply_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{timeAgo(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Thread detail view ────────────────────────────────────────────────────
  const topLevelPosts = posts.filter(p => !p.parent_id);

  return (
    <div className="w-full min-w-0">
      {/* Back button */}
      <button
        type="button"
        onClick={() => setSelectedThread(null)}
        className="flex items-center gap-1.5 text-sm text-[#4c1d95] hover:underline mb-4"
      >
        ‹ Back to Forums
      </button>

      {/* Thread title */}
      <div className="flex items-start gap-2 mb-1">
        {selectedThread.is_pinned && <span className="text-amber-500 mt-1">📌</span>}
        {selectedThread.is_locked && <span className="text-gray-400 mt-1">🔒</span>}
        <h1 className="text-xl font-bold text-gray-900">{selectedThread.title}</h1>
      </div>
      <p className="text-sm text-gray-500 mb-1">
        Started by {selectedThread.authorName} · {timeAgo(selectedThread.created_at)}
      </p>
      <div className="border-t border-gray-200 mb-6" />

      {loadingPosts ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
        </div>
      ) : topLevelPosts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400">No replies yet. Be the first to respond!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevelPosts.map(post => {
            const replies = posts.filter(p => p.parent_id === post.id);
            return (
              <div key={post.id}>
                {/* Main post */}
                <div className={`bg-white rounded-xl border overflow-hidden ${post.is_answer ? 'border-green-300' : 'border-gray-200'}`}>
                  {post.is_answer && <div className="h-1 bg-green-400" />}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-full bg-[#4c1d95] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                        {post.authorInitials}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900">{post.authorName}</span>
                          {post.is_answer && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">✓ Answer</span>
                          )}
                          <span className="text-xs text-gray-400 ml-auto">{timeAgo(post.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{post.body}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">👍 {post.upvotes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="ml-8 mt-2 space-y-2">
                    {replies.map(reply => (
                      <div key={reply.id} className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                        <div className="flex items-start gap-2">
                          <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {reply.authorInitials}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-semibold text-xs text-gray-900">{reply.authorName}</span>
                              <span className="text-xs text-gray-400 ml-auto">{timeAgo(reply.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{reply.body}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
