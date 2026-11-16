import type { Data } from '../models';

/** At least three objective answers and less than 70% accuracy. */
export function weakSubjects(data: Data) {
  return data.subjects.map(subject => {
    const attempts = data.attempts.filter(attempt => attempt.subjectId === subject.id &&
      attempt.assessment !== 'manual' && attempt.assessment !== 'pending' && attempt.score !== undefined && attempt.total);
    const total = attempts.reduce((sum, attempt) => sum + (attempt.total || 0), 0);
    const score = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
    return { subject, total, score, rate: total ? score / total : null };
  }).filter(result => result.total >= 3 && result.rate !== null && result.rate < 0.7)
    .sort((a, b) => a.rate! - b.rate!);
}
export function elapsed(start: number | null, accumulated: number, now: number) {
  return Math.max(0, accumulated + (start === null ? 0 : Math.max(0, now - start)));
}
