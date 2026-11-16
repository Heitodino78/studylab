import type { Data } from '../models';
import { accuracyBySubject } from './analytics';

/** At least three evaluated answers and less than 70% accuracy. */
export function weakSubjects(data: Data) {
  return accuracyBySubject(data)
    .filter(row => row.evaluated >= 3 && row.rate < 0.7)
    .map(row => ({ subject: data.subjects.find(subject => subject.id === row.id)!, total: row.evaluated, score: row.correct, rate: row.rate }));
}
export function elapsed(start: number | null, accumulated: number, now: number) {
  return Math.max(0, accumulated + (start === null ? 0 : Math.max(0, now - start)));
}
