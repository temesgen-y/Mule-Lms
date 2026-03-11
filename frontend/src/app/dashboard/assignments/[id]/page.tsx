'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type AssignmentDetail = {
  id: string;
  title: string;
  brief: string | null;
  due_date: string;
  max_score: number;
  allow_files: boolean;
  allow_text: boolean;
  late_allowed: boolean;
  offering_id: string;
  course_name: string;
};

type Submission = {
  id: string;
  text_body: string | null;
  file_urls: string[] | null;
  status: string;
  submitted_at: string;
  score: number | null;
  final_score: number | null;
  feedback: string | null;
};

export default function AssignmentSubmitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [textBody, setTextBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      if (!profile) return;
      setUserId(profile.id);

      // Fetch assignment
      const { data: asgn } = await supabase
        .from('assignments')
        .select(`
          id, title, brief, due_date, max_score,
          allow_files, allow_text, late_allowed, offering_id,
          course_offerings(courses(title))
        `)
        .eq('id', id)
        .single();

      if (!asgn) { setLoading(false); return; }

      setAssignment({
        id: asgn.id,
        title: asgn.title,
        brief: asgn.brief,
        due_date: asgn.due_date,
        max_score: asgn.max_score,
        allow_files: asgn.allow_files,
        allow_text: asgn.allow_text,
        late_allowed: asgn.late_allowed,
        offering_id: asgn.offering_id,
        course_name: (asgn as any).course_offerings?.courses?.title ?? 'Unknown Course',
      });

      // Fetch enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', profile.id)
        .eq('offering_id', asgn.offering_id)
        .eq('status', 'active')
        .single();
      if (enrollment) setEnrollmentId(enrollment.id);

      // Fetch existing submission
      const { data: sub } = await supabase
        .from('assignment_submissions')
        .select('id, text_body, file_urls, status, submitted_at, score, final_score, feedback')
        .eq('assignment_id', id)
        .eq('student_id', profile.id)
        .maybeSingle();

      if (sub) {
        setSubmission(sub);
        setTextBody(sub.text_body ?? '');
      }

      setLoading(false);
    };
    load();
  }, [id]);

  const handleSubmit = async () => {
    if (!assignment || !userId || !enrollmentId) return;
    setError(null);

    const now = new Date();
    const due = new Date(assignment.due_date);
    const isLate = now > due;

    if (isLate && !assignment.late_allowed) {
      setError('This assignment is past due and late submissions are not allowed.');
      return;
    }

    if (assignment.allow_text && !textBody.trim() && files.length === 0) {
      setError('Please enter a text response or upload a file.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    // Upload files if any
    let fileUrls: string[] = [];
    if (assignment.allow_files && files.length > 0) {
      for (const file of files) {
        const path = `assignments/${assignment.id}/${userId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('lms-uploads')
          .upload(path, file, { upsert: true });
        if (uploadError) {
          setError(`File upload failed: ${uploadError.message}`);
          setSubmitting(false);
          return;
        }
        const { data: urlData } = supabase.storage.from('lms-uploads').getPublicUrl(path);
        fileUrls.push(urlData.publicUrl);
      }
    }

    const payload: Record<string, unknown> = {
      assignment_id: assignment.id,
      student_id: userId,
      enrollment_id: enrollmentId,
      is_late: isLate,
      status: 'submitted',
      submitted_at: now.toISOString(),
    };
    if (assignment.allow_text) payload.text_body = textBody.trim() || null;
    if (fileUrls.length > 0) payload.file_urls = fileUrls;

    if (submission) {
      // Update existing submission
      const { error: updateError } = await supabase
        .from('assignment_submissions')
        .update(payload)
        .eq('id', submission.id);
      if (updateError) { setError(updateError.message); setSubmitting(false); return; }
    } else {
      const { error: insertError } = await supabase
        .from('assignment_submissions')
        .insert(payload);
      if (insertError) { setError(insertError.message); setSubmitting(false); return; }
    }

    setSuccess(true);
    setSubmitting(false);
    // Refresh submission state
    const { data: sub } = await supabase
      .from('assignment_submissions')
      .select('id, text_body, file_urls, status, submitted_at, score, final_score, feedback')
      .eq('assignment_id', id)
      .eq('student_id', userId)
      .maybeSingle();
    if (sub) setSubmission(sub);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#4c1d95] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p className="text-4xl mb-3">📭</p>
        <p>Assignment not found.</p>
        <Link href="/dashboard/assignments" className="text-[#4c1d95] underline text-sm mt-2 inline-block">
          Back to Assignments
        </Link>
      </div>
    );
  }

  const isOverdue = new Date(assignment.due_date) < new Date();
  const canSubmit = !isOverdue || assignment.late_allowed;
  const alreadySubmitted = !!submission;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard/assignments"
        className="inline-flex items-center gap-1 text-sm text-[#4c1d95] hover:underline mb-4"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
        </svg>
        Back to Assignments
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-medium text-[#4c1d95] bg-purple-50 px-2 py-0.5 rounded-full">
            {assignment.course_name}
          </span>
          {alreadySubmitted && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {submission.score !== null ? 'Graded' : 'Submitted'}
            </span>
          )}
          {!alreadySubmitted && isOverdue && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Overdue</span>
          )}
          {!alreadySubmitted && !isOverdue && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pending</span>
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">{assignment.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
          <span className={`flex items-center gap-1 ${!alreadySubmitted && isOverdue ? 'text-red-500 font-medium' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5V3.75Z" clipRule="evenodd" />
            </svg>
            Due {formatDate(assignment.due_date)}
          </span>
          <span>Max Score: {assignment.max_score} pts</span>
          {assignment.late_allowed && (
            <span className="text-green-600">Late submissions allowed</span>
          )}
        </div>
      </div>

      {/* Assignment instructions */}
      {assignment.brief && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Instructions</h2>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: assignment.brief }}
          />
        </div>
      )}

      {/* Grade feedback if graded */}
      {submission && submission.score !== null && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-green-800 mb-2">Grade</h2>
          <p className="text-2xl font-bold text-green-700">
            {submission.final_score ?? submission.score}
            <span className="text-sm font-normal text-green-600">/{assignment.max_score}</span>
          </p>
          {submission.feedback && (
            <div className="mt-3 text-sm text-green-800">
              <span className="font-medium">Feedback: </span>{submission.feedback}
            </div>
          )}
        </div>
      )}

      {/* Submission form or existing submission */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          {alreadySubmitted ? 'Your Submission' : 'Submit Your Work'}
        </h2>

        {alreadySubmitted && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            Submitted on {formatDate(submission.submitted_at)}
            {submission.status === 'resubmit_required' && (
              <span className="ml-2 font-semibold text-orange-600">(Resubmission required)</span>
            )}
          </div>
        )}

        {/* Text submission */}
        {assignment.allow_text && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text Response
            </label>
            {(canSubmit || submission?.status === 'resubmit_required') ? (
              <textarea
                value={textBody}
                onChange={e => setTextBody(e.target.value)}
                rows={8}
                placeholder="Write your answer here..."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4c1d95] resize-y"
              />
            ) : (
              <div className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 bg-gray-50 min-h-[120px] whitespace-pre-wrap">
                {submission?.text_body || <span className="text-gray-400 italic">No text submitted</span>}
              </div>
            )}
          </div>
        )}

        {/* File upload */}
        {assignment.allow_files && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File Attachment{assignment.allow_files ? '' : ' (not allowed)'}
            </label>
            {/* Show already uploaded files */}
            {submission?.file_urls && submission.file_urls.length > 0 && (
              <div className="mb-2 space-y-1">
                {submission.file_urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[#4c1d95] underline"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h6.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 1 .439 1.061V12.5A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-9Z" />
                    </svg>
                    Uploaded file {i + 1}
                  </a>
                ))}
              </div>
            )}
            {(canSubmit || submission?.status === 'resubmit_required') && (
              <input
                type="file"
                multiple
                onChange={e => setFiles(Array.from(e.target.files ?? []))}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-[#4c1d95] hover:file:bg-purple-100"
              />
            )}
            {files.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{files.length} file(s) selected</p>
            )}
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            Assignment submitted successfully!
          </div>
        )}

        {!canSubmit && !alreadySubmitted && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            This assignment is past due and late submissions are not allowed.
          </div>
        )}

        {(canSubmit || submission?.status === 'resubmit_required') && !success && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[#4c1d95] text-white text-sm font-semibold rounded-lg hover:bg-[#3b0764] transition-colors disabled:opacity-60"
          >
            {submitting && (
              <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v8H4Z" />
              </svg>
            )}
            {submitting ? 'Submitting...' : alreadySubmitted ? 'Resubmit' : 'Submit Assignment'}
          </button>
        )}
      </div>
    </div>
  );
}
