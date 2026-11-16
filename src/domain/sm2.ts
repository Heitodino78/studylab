import type { FlashcardSchedule } from '../models';

/** SM-2: quality 0–5; failure resets repetitions, successful intervals are 1, 6, then previous × ease. */
export function reviewCard(previous: FlashcardSchedule, quality: number, now: number): FlashcardSchedule {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5 || !Number.isFinite(now)) throw new Error('Avaliação inválida');
  const easeFactor = Math.max(1.3, previous.easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  const repetitions = quality < 3 ? 0 : previous.repetitions + 1;
  const intervalDays = quality < 3 ? 1 : repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.max(1, Math.round(previous.intervalDays * previous.easeFactor));
  return { repetitions, intervalDays, easeFactor, dueAt: now + intervalDays * 86400000 };
}
