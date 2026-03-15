// ─────────────────────────────────────────────────────────────────────────────
// getLetterGrade
// converts a percentage score (0–100) to a letter grade
// ─────────────────────────────────────────────────────────────────────────────
export const getLetterGrade = (scorePct: number): string => {
  if (scorePct >= 93) return 'A';
  if (scorePct >= 90) return 'A-';
  if (scorePct >= 87) return 'B+';
  if (scorePct >= 83) return 'B';
  if (scorePct >= 80) return 'B-';
  if (scorePct >= 77) return 'C+';
  if (scorePct >= 73) return 'C';
  if (scorePct >= 60) return 'D';
  return 'F';
};

// ─────────────────────────────────────────────────────────────────────────────
// GradebookEntry
// represents one graded item when calculating a final weighted grade
// ─────────────────────────────────────────────────────────────────────────────
export interface GradebookEntry {
  raw_score  : number;
  weight_pct : number;
  total_marks: number; // max possible for this item
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateFinalGrade
// sums all weighted scores and returns finalScore + letterGrade + breakdown
// ─────────────────────────────────────────────────────────────────────────────
export const calculateFinalGrade = (
  entries: GradebookEntry[]
): {
  finalScore : number;  // weighted sum (0–100)
  letterGrade: string;
  breakdown  : { weightedScore: number; scorePct: number; weight_pct: number }[];
} => {
  const breakdown = entries.map(e => ({
    scorePct     : e.total_marks > 0 ? (e.raw_score / e.total_marks) * 100 : 0,
    weightedScore: e.total_marks > 0 ? (e.raw_score / e.total_marks) * e.weight_pct : 0,
    weight_pct   : e.weight_pct,
  }));

  const finalScore = breakdown.reduce((sum, b) => sum + b.weightedScore, 0);

  return {
    finalScore : Math.round(finalScore * 100) / 100,
    letterGrade: getLetterGrade(finalScore),
    breakdown,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getGradeColor
// returns Tailwind color classes for a grade badge
// ─────────────────────────────────────────────────────────────────────────────
export const getGradeColor = (grade: string | null | undefined): string => {
  switch (grade) {
    case 'A' : return 'bg-green-100 text-green-800';
    case 'A-': return 'bg-green-100 text-green-700';
    case 'B+': return 'bg-blue-100 text-blue-800';
    case 'B' : return 'bg-blue-100 text-blue-700';
    case 'B-': return 'bg-blue-100 text-blue-600';
    case 'C+': return 'bg-yellow-100 text-yellow-800';
    case 'C' : return 'bg-yellow-100 text-yellow-700';
    case 'D' : return 'bg-orange-100 text-orange-700';
    case 'F' : return 'bg-red-100 text-red-700';
    default  : return 'bg-gray-100 text-gray-600';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getGpaPoints — converts a letter grade to a 4.0-scale GPA point value
// ─────────────────────────────────────────────────────────────────────────────
export const getGpaPoints = (grade: string): number => {
  const scale: Record<string, number> = {
    'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0,
    'D': 1.0, 'F': 0.0,
  };
  return scale[grade] ?? 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// calculateGpa — weighted GPA across courses using credit hours
// ─────────────────────────────────────────────────────────────────────────────
export const calculateGpa = (
  grades: { letter: string; credits: number }[]
): number => {
  const completed = grades.filter(g => g.letter != null && g.letter !== '');
  if (completed.length === 0) return 0;
  const totalPoints  = completed.reduce((sum, g) => sum + getGpaPoints(g.letter) * g.credits, 0);
  const totalCredits = completed.reduce((sum, g) => sum + g.credits, 0);
  return totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
};
