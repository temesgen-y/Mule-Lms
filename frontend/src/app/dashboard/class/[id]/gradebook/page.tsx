'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getGradeColor } from '@/utils/gradeCalculator';

type GradeItem = {
  id: string;
  itemTitle: string;
  itemType: string;
  rawScore: number | null;
  weightPct: number | null;
  weightedScore: number | null;
  letterGrade: string | null;
  isOverridden: boolean;
  recordedAt: string | null;
};

function fmt(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClassGradebookPage() {
  const params = useParams();
  const offeringId = params?.id as string;

  const [items, setItems] = useState<GradeItem[]>([]);
  const [finalGrade, setFinalGrade] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!offeringId) return;
    (async () => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { setLoading(false); return; }

      const { data: appUser } = await supabase
        .from('users').select('id').eq('auth_user_id', authData.user.id).single();
      if (!appUser) { setLoading(false); return; }
      const userId = (appUser as { id: string }).id;

      // Get enrollment for this offering
      const { data: enr } = await supabase
        .from('enrollments')
        .select('id, final_grade, final_score')
        .eq('student_id', userId)
        .eq('offering_id', offeringId)
        .single();

      if (!enr) { setLoading(false); return; }
      const enrollmentId = (enr as any).id;
      setFinalGrade((enr as any).final_grade);
      setFinalScore((enr as any).final_score);

      // Gradebook items
      const { data: gbRows } = await supabase
        .from('gradebook_items')
        .select(`
          id, raw_score, weight_pct, weighted_score, letter_grade, is_overridden, recorded_at,
          assessment_id, assignment_id,
          assessments!fk_gradebook_items_assessment(title, type),
          assignments!fk_gradebook_items_assignment(title)
        `)
        .eq('enrollment_id', enrollmentId)
        .order('recorded_at', { ascending: false });

      setItems(
        ((gbRows ?? []) as any[]).map(r => ({
          id: r.id,
          itemTitle: r.assessment_id
            ? (r.assessments?.title ?? 'Assessment')
            : (r.assignments?.title ?? 'Assignment'),
          itemType: r.assessment_id ? (r.assessments?.type ?? 'assessment') : 'assignment',
          rawScore: r.raw_score,
          weightPct: r.weight_pct,
          weightedScore: r.weighted_score,
          letterGrade: r.letter_grade,
          isOverridden: !!r.is_overridden,
          recordedAt: r.recorded_at,
        }))
      );
      setLoading(false);
    })();
  }, [offeringId]);

  const totalWeighted = items.reduce((s, i) => s + (i.weightedScore ?? 0), 0);
  const allGraded = items.length > 0 && items.every(i => i.letterGrade !== null);

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl" aria-hidden>📊</span>
        <h1 className="text-2xl font-bold text-gray-900">Gradebook</h1>
      </div>
      <div className="border-t border-gray-200 mb-6" />

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="h-20 bg-gray-200 rounded-xl" />
            <div className="h-20 bg-gray-200 rounded-xl" />
          </div>
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <span className="text-4xl block mb-3">📊</span>
          <p className="text-gray-400 font-medium">No grades recorded yet.</p>
          <p className="text-gray-400 text-sm mt-1">Grades will appear here once assessments or assignments are graded.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-[150px]">
              <p className="text-xs text-gray-500 mb-1">Total Weighted Score</p>
              <p className="text-2xl font-bold text-[#4c1d95]">{totalWeighted.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-0.5">out of 100</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-[150px]">
              <p className="text-xs text-gray-500 mb-1">Final Grade</p>
              {finalGrade ? (
                <p className={`text-2xl font-bold ${getGradeColor(finalGrade).split(' ')[1]}`}>{finalGrade}</p>
              ) : allGraded ? (
                <p className="text-2xl font-bold text-amber-600">{totalWeighted >= 60 ? 'Passing' : 'Failing'}</p>
              ) : (
                <p className="text-2xl font-bold text-gray-400">Pending</p>
              )}
              {finalScore != null && <p className="text-xs text-gray-400 mt-0.5">{finalScore.toFixed(1)}%</p>}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-[150px]">
              <p className="text-xs text-gray-500 mb-1">Graded Items</p>
              <p className="text-2xl font-bold text-gray-700">
                {items.filter(i => i.letterGrade !== null).length}
                <span className="text-base font-normal text-gray-400"> / {items.length}</span>
              </p>
            </div>
          </div>

          {/* Gradebook table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Item', 'Type', 'Raw Score', 'Weight %', 'Weighted Score', 'Grade', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900 text-sm line-clamp-1">{item.itemTitle}</span>
                        {item.isOverridden && (
                          <span className="text-xs text-purple-600" title="Grade overridden by instructor">✏️</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 capitalize">{item.itemType.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {item.rawScore ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.weightPct != null ? `${item.weightPct}%` : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {item.weightedScore != null ? item.weightedScore.toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.letterGrade ? (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${getGradeColor(item.letterGrade)}`}>
                          {item.letterGrade}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmt(item.recordedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary row */}
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-700">Total Weighted Score</span>
              <span className="font-bold text-[#4c1d95] text-base">{totalWeighted.toFixed(2)} / 100</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
