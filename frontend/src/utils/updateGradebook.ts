import { SupabaseClient } from '@supabase/supabase-js';
import { getLetterGrade } from './gradeCalculator';

// ─────────────────────────────────────────────────────────────────────────────
// updateGradebookItem
//
// Called after EVERY grading action. Performs three steps:
//   1. Upsert grades table (raw score)
//   2. Upsert gradebook_items table (weighted score + letter grade)
//   3. Recalculate enrollment.final_score and final_grade
// ─────────────────────────────────────────────────────────────────────────────
export const updateGradebookItem = async (
  supabase    : SupabaseClient,
  enrollmentId: string,
  studentId   : string,
  itemId      : string,
  itemType    : 'assessment' | 'assignment',
  rawScore    : number,
  totalMarks  : number,
  weightPct   : number,
): Promise<void> => {
  const scorePct      = totalMarks > 0 ? (rawScore / totalMarks) * 100 : 0;
  const weightedScore = totalMarks > 0 ? (rawScore / totalMarks) * weightPct : 0;
  const letterGrade   = getLetterGrade(scorePct);

  // Step 1: upsert grades table
  await supabase
    .from('grades')
    .upsert(
      {
        student_id    : studentId,
        enrollment_id : enrollmentId,
        ...(itemType === 'assessment'
          ? { assessment_id: itemId, assignment_id: null }
          : { assignment_id: itemId, assessment_id: null }),
        raw_score  : rawScore,
        total_marks: totalMarks,
        score_pct  : Math.round(scorePct * 100) / 100,
        passed     : scorePct >= 50,
        recorded_at: new Date().toISOString(),
      },
      {
        onConflict: itemType === 'assessment'
          ? 'student_id,assessment_id'
          : 'student_id,assignment_id',
      }
    );

  // Step 2: upsert gradebook_items table
  await supabase
    .from('gradebook_items')
    .upsert(
      {
        enrollment_id : enrollmentId,
        ...(itemType === 'assessment'
          ? { assessment_id: itemId, assignment_id: null }
          : { assignment_id: itemId, assessment_id: null }),
        raw_score     : rawScore,
        weight_pct    : weightPct,
        weighted_score: Math.round(weightedScore * 100) / 100,
        letter_grade  : letterGrade,
      },
      {
        onConflict: itemType === 'assessment'
          ? 'enrollment_id,assessment_id'
          : 'enrollment_id,assignment_id',
      }
    );

  // Step 3: recalculate final grade for this enrollment
  await recalculateFinalGrade(supabase, enrollmentId);
};

// ─────────────────────────────────────────────────────────────────────────────
// recalculateFinalGrade
//
// Sums all weighted_scores for an enrollment and updates
// enrollments.final_score + enrollments.final_grade
// ─────────────────────────────────────────────────────────────────────────────
export const recalculateFinalGrade = async (
  supabase    : SupabaseClient,
  enrollmentId: string,
): Promise<void> => {
  const { data: items } = await supabase
    .from('gradebook_items')
    .select('weighted_score')
    .eq('enrollment_id', enrollmentId);

  if (!items || items.length === 0) return;

  const finalScore = items.reduce(
    (sum: number, item: any) => sum + (item.weighted_score ?? 0),
    0
  );

  const roundedScore = Math.round(finalScore * 100) / 100;
  const finalGrade   = getLetterGrade(roundedScore);

  await supabase
    .from('enrollments')
    .update({
      final_score: roundedScore,
      final_grade: finalGrade,
      updated_at : new Date().toISOString(),
    })
    .eq('id', enrollmentId);
};
