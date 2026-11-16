import type { Data, Item } from '../models';

/**
 * Read-only analytics over real records. Every number comes from sessions, attempts, reviews,
 * cards, tasks or exams already stored; nothing is estimated or invented. Days and weeks use the
 * browser's local time zone; weeks run Monday to Sunday.
 */

export const DAY_MS = 86_400_000;
/** Minimum evaluated answers before an accuracy figure is considered meaningful. */
export const MIN_EVALUATED = 3;
export const WEAK_RATE = 0.7;

const pad = (value: number) => String(value).padStart(2, '0');

// ------------------------------------------------------------------ date helpers

export function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Calendar arithmetic (safe across daylight-saving changes). */
export function addDays(timestamp: number, days: number): number {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

export function startOfWeek(timestamp: number): number {
  const day = new Date(startOfDay(timestamp));
  return addDays(day.getTime(), -((day.getDay() + 6) % 7));
}

/** Whole days from today to a `YYYY-MM-DD` date; NaN when the text is not a valid date. */
export function daysUntil(due: string, now: number): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due);
  if (!match) return Number.NaN;
  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
  return Math.round((target - startOfDay(now)) / DAY_MS);
}

export interface Range { from: number; to: number } // [from, to)
export const ALL_TIME: Range = { from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY };
const within = (timestamp: number, range: Range) => timestamp >= range.from && timestamp < range.to;

/** The last `days` calendar days including today. */
export function lastDays(now: number, days: number): Range {
  const today = startOfDay(now);
  return { from: addDays(today, -(days - 1)), to: addDays(today, 1) };
}
export const todayRange = (now: number): Range => lastDays(now, 1);
export function weekRange(now: number): Range {
  const start = startOfWeek(now);
  return { from: start, to: addDays(start, 7) };
}

// ------------------------------------------------------------------------- focus

export function focusMs(data: Data, range: Range, subjectId?: string): number {
  return data.sessions
    .filter(session => within(session.createdAt, range) && (subjectId === undefined || (session.subjectId ?? '') === subjectId))
    .reduce((total, session) => total + (session.duration ?? 0), 0);
}

export interface Bucket { start: number; label: string; ms: number }

/** Focus time per day (up to 31 days) or per week (longer ranges), oldest first. */
export function focusSeries(data: Data, now: number, days: number): Bucket[] {
  const byDay = new Map<string, number>();
  for (const session of data.sessions) {
    const key = dayKey(session.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + (session.duration ?? 0));
  }
  const today = startOfDay(now);
  if (days <= 31) {
    return Array.from({ length: days }, (_, index) => {
      const start = addDays(today, -(days - 1 - index));
      const date = new Date(start);
      const label = days <= 7
        ? date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
        : `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
      return { start, label, ms: byDay.get(dayKey(start)) ?? 0 };
    });
  }
  const weeks = Math.ceil(days / 7);
  const firstWeek = addDays(startOfWeek(now), -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, index) => {
    const start = addDays(firstWeek, index * 7);
    let ms = 0;
    for (let offset = 0; offset < 7; offset++) ms += byDay.get(dayKey(addDays(start, offset))) ?? 0;
    const date = new Date(start);
    return { start, label: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`, ms };
  });
}

export interface SubjectTime { subjectId: string; title: string; ms: number }

export function timeBySubject(data: Data, range: Range): SubjectTime[] {
  const titles = new Map(data.subjects.map(subject => [subject.id, subject.title]));
  const totals = new Map<string, number>();
  for (const session of data.sessions) {
    if (!within(session.createdAt, range)) continue;
    const id = session.subjectId && titles.has(session.subjectId) ? session.subjectId : '';
    totals.set(id, (totals.get(id) ?? 0) + (session.duration ?? 0));
  }
  return [...totals.entries()]
    .filter(([, ms]) => ms > 0)
    .map(([subjectId, ms]) => ({ subjectId, title: subjectId ? titles.get(subjectId) ?? '' : 'Sem disciplina', ms }))
    .sort((a, b) => b.ms - a.ms);
}

// --------------------------------------------------------------------- exercises

/** An attempt counts toward accuracy only when it has a result (objective or manually graded). */
export function isEvaluated(attempt: Item): boolean {
  return attempt.assessment !== 'pending' && typeof attempt.score === 'number' && typeof attempt.total === 'number' && attempt.total > 0;
}

export interface ExerciseSummary { attempts: number; evaluated: number; correct: number; pending: number; rate: number | null }

export function exerciseSummary(data: Data, range: Range): ExerciseSummary {
  const attempts = data.attempts.filter(attempt => within(attempt.createdAt, range));
  const evaluated = attempts.filter(isEvaluated);
  const answers = evaluated.reduce((total, attempt) => total + (attempt.total ?? 0), 0);
  const correct = evaluated.reduce((total, attempt) => total + (attempt.score ?? 0), 0);
  return {
    attempts: attempts.length,
    evaluated: answers,
    correct,
    pending: attempts.filter(attempt => attempt.assessment === 'pending').length,
    rate: answers > 0 ? correct / answers : null,
  };
}

export interface AccuracyRow { id: string; title: string; subtitle?: string; evaluated: number; correct: number; errors: number; rate: number }

interface Tally { evaluated: number; correct: number }

function tallyAttempts(data: Data, range: Range, keyOf: (attempt: Item, question: Item | undefined) => string | undefined): Map<string, Tally> {
  const questions = new Map(data.questions.map(question => [question.id, question]));
  const tallies = new Map<string, Tally>();
  for (const attempt of data.attempts) {
    if (!within(attempt.createdAt, range) || !isEvaluated(attempt)) continue;
    const key = keyOf(attempt, attempt.questionId ? questions.get(attempt.questionId) : undefined);
    if (!key) continue;
    const tally = tallies.get(key) ?? { evaluated: 0, correct: 0 };
    tally.evaluated += attempt.total ?? 0;
    tally.correct += attempt.score ?? 0;
    tallies.set(key, tally);
  }
  return tallies;
}

function toRows(tallies: Map<string, Tally>, describe: (id: string) => { title: string; subtitle?: string } | undefined): AccuracyRow[] {
  const rows: AccuracyRow[] = [];
  for (const [id, tally] of tallies) {
    const label = describe(id);
    if (!label || tally.evaluated === 0) continue;
    rows.push({ id, ...label, evaluated: tally.evaluated, correct: tally.correct, errors: tally.evaluated - tally.correct, rate: tally.correct / tally.evaluated });
  }
  return rows;
}

export function accuracyBySubject(data: Data, range: Range = ALL_TIME): AccuracyRow[] {
  const titles = new Map(data.subjects.map(subject => [subject.id, subject.title]));
  const tallies = tallyAttempts(data, range, (attempt, question) => attempt.subjectId || question?.subjectId || undefined);
  return toRows(tallies, id => (titles.has(id) ? { title: titles.get(id) ?? '' } : undefined)).sort((a, b) => a.rate - b.rate || b.evaluated - a.evaluated);
}

/** Topics where the user made mistakes, most errors first. */
export function topicErrors(data: Data, range: Range = ALL_TIME): AccuracyRow[] {
  const topics = new Map(data.topics.map(topic => [topic.id, topic]));
  const subjects = new Map(data.subjects.map(subject => [subject.id, subject.title]));
  const tallies = tallyAttempts(data, range, (attempt, question) => attempt.topicId || question?.topicId || undefined);
  const rows = toRows(tallies, id => {
    const topic = topics.get(id);
    return topic ? { title: topic.title, subtitle: topic.subjectId ? subjects.get(topic.subjectId) : undefined } : undefined;
  });
  return rows.filter(row => row.errors > 0).sort((a, b) => b.errors - a.errors || a.rate - b.rate);
}

// ----------------------------------------------------------------------- reviews

export function isCardPending(card: Item, now: number): boolean {
  return !card.schedule || card.schedule.dueAt <= now;
}

export interface ReviewSummary { reviews: number; lapses: number; averageQuality: number | null; newCards: number; dueCards: number; pendingCards: number }

export function reviewSummary(data: Data, now: number, range: Range): ReviewSummary {
  const reviews = data.reviews.filter(review => within(review.createdAt, range));
  const graded = reviews.filter(review => typeof review.quality === 'number');
  const newCards = data.cards.filter(card => !card.schedule).length;
  const dueCards = data.cards.filter(card => card.schedule && card.schedule.dueAt <= now).length;
  return {
    reviews: reviews.length,
    lapses: graded.filter(review => (review.quality ?? 0) < 3).length,
    averageQuality: graded.length ? graded.reduce((total, review) => total + (review.quality ?? 0), 0) / graded.length : null,
    newCards,
    dueCards,
    pendingCards: newCards + dueCards,
  };
}

// ---------------------------------------------------------------------- activity

function activityTimestamps(data: Data): { at: number; subjectId?: string }[] {
  const records = [...data.sessions, ...data.attempts, ...data.reviews, ...data.simulations];
  return records.map(record => ({ at: record.createdAt, subjectId: record.subjectId }));
}

export function activeDays(data: Data, range: Range): number {
  return new Set(activityTimestamps(data).filter(entry => within(entry.at, range)).map(entry => dayKey(entry.at))).size;
}

/** Consecutive days with any study activity, ending today (or yesterday if today is still empty). */
export function currentStreak(data: Data, now: number): number {
  const keys = new Set(activityTimestamps(data).map(entry => dayKey(entry.at)));
  let cursor = startOfDay(now);
  if (!keys.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (keys.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface RecentSubject { subject: Item; lastAt: number | null; weekMs: number }

/** Subjects ordered by most recent activity; subjects never studied come last. */
export function recentSubjects(data: Data, now: number, limit = 4): RecentSubject[] {
  const lastBySubject = new Map<string, number>();
  for (const entry of activityTimestamps(data)) {
    if (entry.subjectId) lastBySubject.set(entry.subjectId, Math.max(lastBySubject.get(entry.subjectId) ?? 0, entry.at));
  }
  const week = weekRange(now);
  return data.subjects
    .map(subject => ({ subject, lastAt: lastBySubject.get(subject.id) ?? null, weekMs: focusMs(data, week, subject.id) }))
    .sort((a, b) => (b.lastAt ?? -1) - (a.lastAt ?? -1) || b.subject.createdAt - a.subject.createdAt)
    .slice(0, limit);
}

// -------------------------------------------------------------- goals and deadlines

export interface GoalProgress { goal: Item; targetMs: number; doneMs: number; ratio: number }

/** Goals with a period and a minute target, measured against focus time in the current day/week. */
export function goalProgress(data: Data, now: number): GoalProgress[] {
  return data.goals
    .filter(goal => (goal.period === 'daily' || goal.period === 'weekly') && (goal.targetMinutes ?? 0) > 0 && goal.status !== 'concluído')
    .map(goal => {
      const range = goal.period === 'daily' ? todayRange(now) : weekRange(now);
      const doneMs = focusMs(data, range, goal.subjectId || undefined);
      const targetMs = (goal.targetMinutes ?? 0) * 60_000;
      return { goal, targetMs, doneMs, ratio: targetMs ? doneMs / targetMs : 0 };
    });
}

export type DueState = 'overdue' | 'today' | 'soon';
export interface Deadline { item: Item; kind: 'tasks' | 'exams' | 'goals'; daysLeft: number; state: DueState }

/** Open tasks, exams and goals that are overdue or due within `horizonDays`, soonest first. */
export function deadlines(data: Data, now: number, horizonDays = 7): Deadline[] {
  const groups: ['tasks' | 'exams' | 'goals', Item[]][] = [['tasks', data.tasks], ['exams', data.exams], ['goals', data.goals]];
  const result: Deadline[] = [];
  for (const [kind, items] of groups) {
    for (const item of items) {
      if (!item.due || item.status === 'concluído') continue;
      const daysLeft = daysUntil(item.due, now);
      if (Number.isNaN(daysLeft) || daysLeft > horizonDays) continue;
      result.push({ item, kind, daysLeft, state: daysLeft < 0 ? 'overdue' : daysLeft === 0 ? 'today' : 'soon' });
    }
  }
  return result.sort((a, b) => a.daysLeft - b.daysLeft);
}

// --------------------------------------------------------------- recommendations

export interface Recommendation {
  id: string;
  /** Lower comes first. */
  priority: number;
  text: string;
  /** Plain-language rule that produced the recommendation, shown to the user. */
  rule: string;
  to: string;
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** Deterministic, explainable suggestions. Returns an empty list when there is not enough data. */
export function recommendations(data: Data, now: number): Recommendation[] {
  const result: Recommendation[] = [];

  for (const { item, kind, daysLeft } of deadlines(data, now, 7)) {
    if (kind !== 'exams') continue;
    const when = daysLeft < 0 ? 'prazo vencido' : daysLeft === 0 ? 'hoje' : `em ${daysLeft} ${plural(daysLeft, 'dia', 'dias')}`;
    result.push({
      id: `exam-${item.id}`, priority: 10, to: '/exams',
      text: `Prova “${item.title}” ${when}: reserve tempo para revisar.`,
      rule: 'Provas não concluídas com data nos próximos 7 dias (ou já vencidas).',
    });
  }

  const overdue = deadlines(data, now, 0).filter(entry => entry.kind === 'tasks' && entry.state === 'overdue');
  if (overdue.length) {
    result.push({
      id: 'tasks-overdue', priority: 20, to: '/tasks',
      text: `${overdue.length} ${plural(overdue.length, 'tarefa atrasada', 'tarefas atrasadas')}.`,
      rule: 'Tarefas não concluídas com prazo anterior a hoje.',
    });
  }

  const pending = reviewSummary(data, now, ALL_TIME).pendingCards;
  if (pending > 0) {
    result.push({
      id: 'cards-pending', priority: 30, to: '/cards',
      text: `Revisar ${pending} ${plural(pending, 'flashcard pendente', 'flashcards pendentes')}.`,
      rule: 'Cards ainda não revisados ou com revisão vencida (SM-2).',
    });
  }

  const weakTopics = topicErrors(data).filter(row => row.evaluated >= MIN_EVALUATED && row.rate < WEAK_RATE);
  for (const row of weakTopics.slice(0, 3)) {
    result.push({
      id: `topic-${row.id}`, priority: 40, to: '/questions',
      text: `Reforçar “${row.title}”: ${Math.round(row.rate * 100)}% de acerto em ${row.evaluated} respostas.`,
      rule: `Assunto com pelo menos ${MIN_EVALUATED} respostas avaliadas e menos de ${WEAK_RATE * 100}% de acerto.`,
    });
  }

  const weakSubjectRows = accuracyBySubject(data).filter(row => row.evaluated >= MIN_EVALUATED && row.rate < WEAK_RATE);
  for (const row of weakSubjectRows.slice(0, 3)) {
    result.push({
      id: `subject-${row.id}`, priority: 45, to: '/questions',
      text: `Reforçar ${row.title}: ${Math.round(row.rate * 100)}% de acerto em ${row.evaluated} respostas.`,
      rule: `Disciplina com pelo menos ${MIN_EVALUATED} respostas avaliadas e menos de ${WEAK_RATE * 100}% de acerto.`,
    });
  }

  const awaiting = data.attempts.filter(attempt => attempt.assessment === 'pending').length;
  if (awaiting > 0) {
    result.push({
      id: 'manual-pending', priority: 50, to: '/questions',
      text: `Corrigir ${awaiting} ${plural(awaiting, 'resposta discursiva', 'respostas discursivas')} para entrar na taxa de acerto.`,
      rule: 'Respostas discursivas só contam depois da sua autocorreção.',
    });
  }

  const goalMs = data.settings.dailyMinutes * 60_000;
  const todayMs = focusMs(data, todayRange(now));
  if (goalMs > 0 && todayMs < goalMs && data.subjects.length > 0) {
    const missing = Math.ceil((goalMs - todayMs) / 60_000);
    result.push({
      id: 'daily-goal', priority: 60, to: '/focus',
      text: `Faltam ${missing} min para a meta diária de foco.`,
      rule: 'Foco registrado hoje menor que a meta diária definida em Ajustes.',
    });
  }

  const lastBySubject = new Map<string, number>();
  for (const entry of activityTimestamps(data)) {
    if (entry.subjectId) lastBySubject.set(entry.subjectId, Math.max(lastBySubject.get(entry.subjectId) ?? 0, entry.at));
  }
  const idle = data.subjects
    .filter(subject => now - subject.createdAt >= 7 * DAY_MS && now - (lastBySubject.get(subject.id) ?? 0) >= 7 * DAY_MS)
    .slice(0, 2);
  for (const subject of idle) {
    result.push({
      id: `idle-${subject.id}`, priority: 70, to: '/focus',
      text: `Retomar ${subject.title}: sem atividade registrada nos últimos 7 dias.`,
      rule: 'Disciplina criada há mais de 7 dias sem foco, exercícios ou revisões recentes.',
    });
  }

  return result.sort((a, b) => a.priority - b.priority);
}
