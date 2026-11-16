import { describe, expect, it } from 'vitest';
import { reviewCard } from './sm2';
describe('SM-2', () => {
  it('schedules successful reviews and resets failures', () => {
    const first = reviewCard({ repetitions: 0, intervalDays: 0, easeFactor: 2.5, dueAt: 0 }, 5, 0);
    expect(first.intervalDays).toBe(1);
    const second = reviewCard(first, 4, first.dueAt);
    expect(second.intervalDays).toBe(6);
    expect(reviewCard(second, 1, second.dueAt).repetitions).toBe(0);
  });
  it('rejects invalid grades', () => expect(() => reviewCard({ repetitions: 0, intervalDays: 0, easeFactor: 2.5, dueAt: 0 }, 6, 0)).toThrow());
});
