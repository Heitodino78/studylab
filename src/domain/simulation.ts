import type { Data, Difficulty, Item, QuestionSnapshot, SimulationRun } from '../models';

/**
 * Simulation domain. A run copies ("snapshots") every question when it starts, so editing or
 * deleting a question later never rewrites a past result. All state changes are pure functions
 * over `Data`, meant to be passed to `update()`, and idempotent by run id.
 */

// -------------------------------------------------------------------- selection

export interface SimulationFilter {
  subjectIds: string[];
  /** Topics also include all of their subtopics. */
  topicIds: string[];
  difficulty: Difficulty | '';
}

/** Only multiple-choice questions with a valid answer key can be auto-graded. */
export function isObjectiveQuestion(question: Item): boolean {
  return Array.isArray(question.options) && question.options.length >= 2
    && typeof question.answer === 'string' && question.options.includes(question.answer);
}

export function expandTopicIds(topics: Item[], ids: string[]): Set<string> {
  const selected = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const topic of topics) {
      if (topic.parentId && selected.has(topic.parentId) && !selected.has(topic.id)) {
        selected.add(topic.id);
        grew = true;
      }
    }
  }
  return selected;
}

export function eligibleQuestions(data: Data, filter: SimulationFilter): Item[] {
  const topicIds = filter.topicIds.length ? expandTopicIds(data.topics, filter.topicIds) : null;
  return data.questions.filter(question =>
    isObjectiveQuestion(question)
    && (!filter.subjectIds.length || (!!question.subjectId && filter.subjectIds.includes(question.subjectId)))
    && (!topicIds || (!!question.topicId && topicIds.has(question.topicId)))
    && (!filter.difficulty || question.difficulty === filter.difficulty));
}

/** Fisher–Yates shuffle on a copy. `random` is injectable for tests. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export type Selection = { ok: true; questions: Item[] } | { ok: false; error: string };

/** Never silently accepts an impossible count. */
export function selectQuestions(pool: readonly Item[], count: number, random: () => number = Math.random): Selection {
  if (pool.length === 0) return { ok: false, error: 'Nenhuma questão objetiva corresponde aos filtros.' };
  if (!Number.isInteger(count) || count < 1) return { ok: false, error: 'Informe uma quantidade inteira de questões, de pelo menos 1.' };
  if (count > pool.length) return { ok: false, error: `Há apenas ${pool.length} ${pool.length === 1 ? 'questão disponível' : 'questões disponíveis'} para estes filtros.` };
  return { ok: true, questions: shuffle(pool, random).slice(0, count) };
}

// --------------------------------------------------------------------- snapshots

function omitUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

/** Copies everything needed to show and grade the question later, independent of the live record. */
export function snapshotQuestion(question: Item, data: Data): QuestionSnapshot {
  const subject = data.subjects.find(candidate => candidate.id === question.subjectId);
  const topic = data.topics.find(candidate => candidate.id === question.topicId);
  return omitUndefined({
    id: question.id,
    title: question.title,
    body: question.body ?? '',
    options: [...(question.options ?? [])],
    answer: question.answer ?? '',
    explanation: question.explanation ?? '',
    subjectId: question.subjectId || undefined,
    topicId: question.topicId || undefined,
    subjectTitle: subject?.title,
    topicTitle: topic?.title,
    difficulty: question.difficulty,
  });
}

// -------------------------------------------------------------------------- run

export interface NewRun {
  id: string;
  title: string;
  questions: Item[];
  data: Data;
  now: number;
  /** Time limit in minutes; null means no limit. */
  minutes: number | null;
}

export function createRun({ id, title, questions, data, now, minutes }: NewRun): SimulationRun {
  return {
    id,
    title,
    questions: questions.map(question => snapshotQuestion(question, data)),
    answers: {},
    startedAt: now,
    deadline: minutes === null ? null : now + minutes * 60_000,
  };
}

export const isExpired = (run: SimulationRun, now: number): boolean => run.deadline !== null && now >= run.deadline;

export function remainingMs(run: SimulationRun, now: number): number | null {
  return run.deadline === null ? null : Math.max(0, run.deadline - now);
}

/** Starts a run unless one is already active (so a double click cannot replace progress). */
export function startSimulation(data: Data, run: SimulationRun): Data {
  return data.activeSimulation ? data : { ...data, activeSimulation: run };
}

/** Saves one answer. Ignored for another run, unknown question/option, or after the deadline. */
export function recordAnswer(data: Data, input: { runId: string; questionId: string; answer: string; now: number }): Data {
  const run = data.activeSimulation;
  if (!run || run.id !== input.runId || isExpired(run, input.now)) return data;
  const question = run.questions.find(candidate => candidate.id === input.questionId);
  if (!question || !question.options.includes(input.answer)) return data;
  if (run.answers[input.questionId] === input.answer) return data;
  return { ...data, activeSimulation: { ...run, answers: { ...run.answers, [input.questionId]: input.answer } } };
}

/** Clears an answer (back to "not answered"). */
export function clearAnswer(data: Data, input: { runId: string; questionId: string; now: number }): Data {
  const run = data.activeSimulation;
  if (!run || run.id !== input.runId || isExpired(run, input.now) || !(input.questionId in run.answers)) return data;
  const answers = { ...run.answers };
  delete answers[input.questionId];
  return { ...data, activeSimulation: { ...run, answers } };
}

export function cancelSimulation(data: Data, runId: string): Data {
  return data.activeSimulation?.id === runId ? { ...data, activeSimulation: null } : data;
}

// ---------------------------------------------------------------------- grading

export type AnswerStatus = 'correct' | 'wrong' | 'blank';
export interface ReviewRow { snapshot: QuestionSnapshot; response: string; status: AnswerStatus }
export interface Grade { score: number; total: number; answered: number; rows: ReviewRow[] }

export function gradeAnswers(snapshots: readonly QuestionSnapshot[], responses: Record<string, string>): Grade {
  const rows = snapshots.map<ReviewRow>(snapshot => {
    const response = responses[snapshot.id] ?? '';
    const status: AnswerStatus = response === '' ? 'blank' : response === snapshot.answer ? 'correct' : 'wrong';
    return { snapshot, response, status };
  });
  return {
    score: rows.filter(row => row.status === 'correct').length,
    total: rows.length,
    answered: rows.filter(row => row.status !== 'blank').length,
    rows,
  };
}

/** Review rows for a stored simulation; null when the record has no snapshots (older format). */
export function reviewSimulation(simulation: Item): Grade | null {
  return simulation.snapshots ? gradeAnswers(simulation.snapshots, simulation.responses ?? {}) : null;
}

// ----------------------------------------------------------------------- finish

/**
 * Finishes the active run: stores the simulation (snapshots + responses) and one objective
 * attempt per ANSWERED question. Blank questions are wrong in the simulation score but create
 * no attempt, so they do not distort exercise statistics.
 *
 * Idempotent: a different/missing run id returns the data untouched. Used both for the manual
 * button and for the automatic finish at the deadline; the end time is then the deadline itself.
 */
export function finishSimulation(data: Data, input: { runId: string; now: number }): Data {
  const run = data.activeSimulation;
  if (!run || run.id !== input.runId) return data;

  const endedAt = Math.max(run.startedAt, run.deadline === null ? input.now : Math.min(input.now, run.deadline));
  const grade = gradeAnswers(run.questions, run.answers);
  const simulationId = `simulation-${run.id}`;

  const simulations = data.simulations.some(item => item.id === simulationId)
    ? data.simulations
    : [...data.simulations, {
      id: simulationId,
      title: run.title,
      createdAt: endedAt,
      startedAt: run.startedAt,
      duration: endedAt - run.startedAt,
      score: grade.score,
      total: grade.total,
      snapshots: run.questions,
      responses: run.answers,
    } satisfies Item];

  const knownIds = new Set(data.attempts.map(attempt => attempt.id));
  const existing = {
    questions: new Set(data.questions.map(item => item.id)),
    subjects: new Set(data.subjects.map(item => item.id)),
    topics: new Map(data.topics.map(item => [item.id, item])),
  };
  const attempts = [...data.attempts];
  for (const row of grade.rows) {
    const id = `attempt-${run.id}-${row.snapshot.id}`;
    if (row.status === 'blank' || knownIds.has(id)) continue;
    const { snapshot } = row;
    // References may have been deleted or moved during/after the run. Keep only what is still
    // consistent today; the stored simulation snapshot keeps the original history untouched.
    const subjectId = snapshot.subjectId && existing.subjects.has(snapshot.subjectId) ? snapshot.subjectId : undefined;
    const topic = snapshot.topicId ? existing.topics.get(snapshot.topicId) : undefined;
    const topicId = topic && (topic.subjectId || undefined) === subjectId ? topic.id : undefined;
    attempts.push(omitUndefined<Item>({
      id,
      title: snapshot.title,
      createdAt: endedAt,
      body: row.response,
      assessment: 'objective',
      score: row.status === 'correct' ? 1 : 0,
      total: 1,
      difficulty: snapshot.difficulty,
      questionId: existing.questions.has(snapshot.id) ? snapshot.id : undefined,
      subjectId,
      topicId,
    }));
  }

  return { ...data, simulations, attempts, activeSimulation: null };
}
