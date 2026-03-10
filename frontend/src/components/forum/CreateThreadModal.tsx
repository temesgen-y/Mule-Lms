'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface CreateThreadModalProps {
  offeringId: string;
  userId: string;
  onCreated: () => void;
  onClose: () => void;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function weekLaterStr() {
  const d = new Date();
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
}

// ── Toolbar button ────────────────────────────────────────────────────────────

function TBtn({
  onClick, title, children,
}: {
  onClick: () => void; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded text-gray-600 hover:bg-gray-100 text-sm font-medium transition-colors"
    >
      {children}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CreateThreadModal({
  offeringId, userId, onCreated, onClose,
}: CreateThreadModalProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(weekLaterStr());
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [attachments] = useState<string[]>([]);

  const editorRef = useRef<HTMLDivElement>(null);

  // Count words on every keystroke in the editor
  const handleEditorInput = () => {
    const text = editorRef.current?.innerText ?? '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  };

  // Focus editor on mount
  useEffect(() => { editorRef.current?.focus(); }, []);

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const getDescription = () => editorRef.current?.innerHTML?.trim() ?? '';

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error('Discussion name is required.'); return; }
    if (!startDate) { toast.error('Start date is required.'); return; }
    if (!endDate) { toast.error('End date is required.'); return; }
    if (endDate < startDate) { toast.error('End date must be after start date.'); return; }

    setSubmitting(true);
    try {
      const supabase = createClient();

      const { data: threadData, error: threadError } = await supabase
        .from('forum_threads')
        .insert({
          offering_id: offeringId,
          author_id: userId,
          title: trimmedTitle,
          is_pinned: isPinned,
          is_locked: false,
          reply_count: 0,
          last_reply_at: null,
          start_date: startDate,
          end_date: endDate,
        })
        .select('id')
        .single();

      if (threadError) throw threadError;
      const threadId = (threadData as any).id as string;

      const desc = getDescription();
      if (desc) {
        const { error: postError } = await supabase.from('forum_posts').insert({
          thread_id: threadId,
          parent_id: null,
          author_id: userId,
          body: desc,
          is_answer: false,
          upvotes: 0,
        });
        if (postError) throw postError;
      }

      toast.success('Discussion published successfully.');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to publish discussion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">

        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Add Discussion</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 pb-2">

          {/* Subtitle */}
          <p className="text-sm text-amber-600 mb-5 leading-relaxed">
            Create your own discussion for this course by filling out the form below.
            This discussion will only count for participation points.
          </p>

          {/* Discussion Name */}
          <div className="mb-5">
            <label className="block text-xs text-gray-500 mb-1">
              Discussion Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter Discussion Name"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={submitting}
              className="w-full border-0 border-b border-gray-400 focus:border-blue-500 focus:outline-none pb-1 text-sm text-gray-900 bg-transparent placeholder-gray-400"
              maxLength={200}
            />
          </div>

          {/* Start Date + End Date */}
          <div className="flex gap-6 mb-5">
            {/* Start Date */}
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 border-b border-gray-400 pb-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  disabled={submitting}
                  className="flex-1 text-sm text-gray-900 bg-transparent border-0 focus:outline-none"
                />
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* End Date */}
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 border-b border-gray-400 pb-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  disabled={submitting}
                  className="flex-1 text-sm text-gray-900 bg-transparent border-0 focus:outline-none"
                />
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">
              Description <span className="text-red-500">*</span>
            </label>

            {/* Rich text editor box */}
            <div className="border border-gray-300 rounded overflow-hidden">

              {/* Menu bar row */}
              <div className="flex items-center gap-4 px-3 py-1.5 border-b border-gray-200 bg-white">
                {['File', 'Edit', 'Insert', 'Format', 'Table', 'Help'].map(item => (
                  <button
                    key={item}
                    type="button"
                    className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                  >
                    {item}
                  </button>
                ))}
              </div>

              {/* Toolbar row 1 */}
              <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-white flex-wrap">
                {/* Expand */}
                <TBtn onClick={() => {}} title="Fullscreen">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                </TBtn>
                <div className="w-px h-5 bg-gray-200 mx-0.5" />
                {/* Undo */}
                <TBtn onClick={() => execCmd('undo')} title="Undo">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </TBtn>
                {/* Redo */}
                <TBtn onClick={() => execCmd('redo')} title="Redo">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                  </svg>
                </TBtn>
                <div className="w-px h-5 bg-gray-200 mx-0.5" />
                {/* Bold */}
                <TBtn onClick={() => execCmd('bold')} title="Bold">
                  <span className="font-bold text-sm">B</span>
                </TBtn>
                {/* Italic */}
                <TBtn onClick={() => execCmd('italic')} title="Italic">
                  <span className="italic text-sm">I</span>
                </TBtn>
                {/* Underline */}
                <TBtn onClick={() => execCmd('underline')} title="Underline">
                  <span className="underline text-sm">U</span>
                </TBtn>
                {/* Strikethrough */}
                <TBtn onClick={() => execCmd('strikeThrough')} title="Strikethrough">
                  <span className="line-through text-sm">S</span>
                </TBtn>
                <div className="w-px h-5 bg-gray-200 mx-0.5" />
                {/* Align */}
                <TBtn onClick={() => execCmd('justifyLeft')} title="Align">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8M4 18h12" />
                  </svg>
                </TBtn>
                {/* Ordered list */}
                <TBtn onClick={() => execCmd('insertOrderedList')} title="Ordered List">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01" />
                  </svg>
                </TBtn>
                {/* Unordered list */}
                <TBtn onClick={() => execCmd('insertUnorderedList')} title="Unordered List">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                </TBtn>
              </div>

              {/* Toolbar row 2 */}
              <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-white flex-wrap">
                {/* Image */}
                <TBtn onClick={() => {}} title="Insert Image">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </TBtn>
                {/* Video */}
                <TBtn onClick={() => {}} title="Insert Video">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </TBtn>
                {/* Link */}
                <TBtn onClick={() => {
                  const url = prompt('Enter URL:');
                  if (url) execCmd('createLink', url);
                }} title="Insert Link">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </TBtn>
                {/* Emoji */}
                <TBtn onClick={() => {}} title="Emoji">
                  <span className="text-sm">😊</span>
                </TBtn>
                {/* Quote */}
                <TBtn onClick={() => execCmd('formatBlock', 'blockquote')} title="Blockquote">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </TBtn>
                {/* Code */}
                <TBtn onClick={() => execCmd('formatBlock', 'pre')} title="Code">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </TBtn>
                {/* Omega */}
                <TBtn onClick={() => {}} title="Special characters">
                  <span className="text-sm font-medium">Ω</span>
                </TBtn>
                {/* Search */}
                <TBtn onClick={() => {}} title="Find & Replace">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </TBtn>
                {/* Clear formatting */}
                <TBtn onClick={() => execCmd('removeFormat')} title="Clear formatting">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </TBtn>
              </div>

              {/* Editable area */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                className="min-h-[140px] px-3 py-2.5 text-sm text-gray-800 focus:outline-none"
                style={{ lineHeight: 1.6 }}
              />

              {/* Footer */}
              <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 bg-gray-50 text-xs text-gray-400">
                <span>Press Alt + 0 for help</span>
                <span>{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Add Attachment */}
          <div className="mb-4">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Attachment
            </button>
          </div>

          {/* Pin this discussion */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none mb-2">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={e => setIsPinned(e.target.checked)}
              disabled={submitting}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">📌 Pin this discussion to top</span>
          </label>

        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-sm font-semibold text-gray-500 hover:text-gray-700 uppercase tracking-wide transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
            className="px-6 py-2 text-sm font-bold bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50 uppercase tracking-wide transition-colors"
          >
            {submitting ? 'Publishing…' : 'PUBLISH'}
          </button>
        </div>

      </div>
    </div>
  );
}
