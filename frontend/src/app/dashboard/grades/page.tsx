'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getLetterGrade, getGradeColor } from '@/utils/gradeCalculator';

type GradeRow = {
  id: string;
  itemTitle: string;
  itemType: 'assignment' | 'assessment';
  courseCode: string;
  courseTitle: string;
  rawScore: number;
  totalMarks: number;
  scorePct: number;
  passed: boolean;
  recordedAt: string;
};

export default function GradesPage() {
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { setLoading(false); return; }

      const { data: appUser } = await supabase
        .from('users').select('id').eq('auth_user_id', authData.user.id).single();
      if (!appUser) { setLoading(false); return; }

      const userId = (appUser as { id: string }).id;

      const { data: rows } = await supabase
        .from('grades')
        .select(`
          id, raw_score, total_marks, score_pct, passed, recorded_at,
          assignment_id, assessment_id,
          assignments!fk_grades_assignment(title, offering_id, course_offerings!fk_assignments_offering(courses!fk_course_offerings_course(code, title))),
          assessments!fk_grades_assessment(title, offering_id, course_offerings!fk_assessments_offering(courses!fk_course_offerings_course(code, title)))
        `)
        .eq('student_id', userId)
        .order('recorded_at', { ascending: false });

      const mapped: GradeRow[] = (rows ?? []).map((r: any) => {
        const isAssignment = !!r.assignment_id;
        const item = isAssignment ? r.assignments : r.assessments;
        const offeringCourse = item?.course_offerings?.courses;
        return {
          id: r.id,
          itemTitle:   item?.title ?? 'Unknown',
          itemType:    isAssignment ? 'assignment' : 'assessment',
          courseCode:  offeringCourse?.code ?? '—',
          courseTitle: offeringCourse?.title ?? '—',
          rawScore:    r.raw_score,
          totalMarks:  r.total_marks,
          scorePct:    r.score_pct,
          passed:      r.passed,
          recordedAt:  r.recorded_at,
        };
      });

      setGrades(mapped);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = grades.filter(g => {
    const q = search.toLowerCase();
    return !q || g.itemTitle.toLowerCase().includes(q) || g.courseCode.toLowerCase().includes(q);
  });

  const avg = filtered.length
    ? Math.round(filtered.reduce((s, g) => s + g.scorePct, 0) / filtered.length)
    : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>📊</span>
              <h1 className="text-2xl font-bold text-gray-900">My Grades</h1>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">All graded assignments and assessments</p>
          </div>
          {!loading && filtered.length > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-[#4c1d95]">{avg}%</p>
              <p className="text-xs text-gray-500">Average · {getLetterGrade(avg)}</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="search"
            placeholder="Search by title or course…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72"
          />
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading grades…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            {search ? 'No grades match your search.' : 'No grades recorded yet.'}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Item', 'Course', 'Type', 'Score', 'Grade', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[200px]" title={g.itemTitle}>{g.itemTitle}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-medium">{g.courseCode}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs capitalize">{g.itemType}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900">{g.rawScore}</span>
                      <span className="text-gray-400 text-xs">/{g.totalMarks}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${getGradeColor(getLetterGrade(g.scorePct))}`}>
                        {getLetterGrade(g.scorePct)}
                        <span className="font-normal opacity-70">({g.scorePct.toFixed(0)}%)</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(g.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
