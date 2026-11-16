import { describe, expect, it } from 'vitest';
import { emptyData, type Data, type Item } from '../models';
import { exportBackup, parseBackup, validate } from '../storage';
import { cancelSimulation, clearAnswer, createRun, eligibleQuestions, expandTopicIds, finishSimulation, gradeAnswers, isExpired, isObjectiveQuestion, recordAnswer, remainingMs, reviewSimulation, selectQuestions, shuffle, snapshotQuestion, startSimulation } from './simulation';

const MIN = 60_000;
const T0 = new Date(2026, 10, 16, 10, 0, 0).getTime();

const question = (id: string, extra: Partial<Item> = {}): Item => ({ id, title: `Q ${id}`, createdAt: 0, body: `Enunciado ${id}`, options: ['A', 'B', 'C'], answer: 'B', explanation: `Porque ${id}`, ...extra });

function world(): Data {
  return {
    ...emptyData(),
    subjects: [{ id: 's1', title: 'Matemática', createdAt: 0 }, { id: 's2', title: 'Física', createdAt: 0 }],
    topics: [
      { id: 't1', title: 'Álgebra', subjectId: 's1', createdAt: 0 },
      { id: 't2', title: 'Equações', subjectId: 's1', parentId: 't1', createdAt: 0 },
      { id: 't3', title: 'Cinemática', subjectId: 's2', createdAt: 0 },
    ],
    questions: [
      question('q1', { subjectId: 's1', topicId: 't1', difficulty: 'easy' }),
      question('q2', { subjectId: 's1', topicId: 't2', difficulty: 'hard' }),
      question('q3', { subjectId: 's2', topicId: 't3' }),
      question('q4', { subjectId: 's2', options: [], answer: 'orientação' }), // discursiva
      question('q5', { subjectId: 's2', options: ['A', 'B'], answer: 'Z' }), // gabarito inválido
    ],
  };
}

const sequence = (values: number[]) => { let index = 0; return () => values[index++ % values.length]; };

describe('seleção', () => {
  it('só questões objetivas com gabarito válido', () => {
    const data = world();
    expect(data.questions.filter(isObjectiveQuestion).map(item => item.id)).toEqual(['q1', 'q2', 'q3']);
    expect(eligibleQuestions(data, { subjectIds: [], topicIds: [], difficulty: '' }).map(item => item.id)).toEqual(['q1', 'q2', 'q3']);
  });
  it('filtra por disciplina, assunto (com subassuntos) e dificuldade', () => {
    const data = world();
    expect(eligibleQuestions(data, { subjectIds: ['s2'], topicIds: [], difficulty: '' }).map(item => item.id)).toEqual(['q3']);
    expect(eligibleQuestions(data, { subjectIds: [], topicIds: ['t1'], difficulty: '' }).map(item => item.id)).toEqual(['q1', 'q2']);
    expect(eligibleQuestions(data, { subjectIds: ['s1'], topicIds: ['t2'], difficulty: '' }).map(item => item.id)).toEqual(['q2']);
    expect(eligibleQuestions(data, { subjectIds: [], topicIds: ['t1'], difficulty: 'hard' }).map(item => item.id)).toEqual(['q2']);
    expect([...expandTopicIds(data.topics, ['t1'])].sort()).toEqual(['t1', 't2']);
  });
  it('Fisher–Yates devolve uma permutação sem alterar a entrada', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, sequence([0.9, 0.1, 0.5, 0.3]));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect(shuffle(input, () => 0.999999)).toEqual(input); // always picks the last slot: identity
  });
  it('recusa contagem impossível ou pool vazio', () => {
    const pool = [question('a'), question('b')];
    expect(selectQuestions(pool, 3)).toMatchObject({ ok: false });
    expect(selectQuestions(pool, 0)).toMatchObject({ ok: false });
    expect(selectQuestions(pool, 1.5)).toMatchObject({ ok: false });
    expect(selectQuestions([], 1)).toMatchObject({ ok: false });
    const ok = selectQuestions(pool, 2);
    expect(ok.ok && ok.questions).toHaveLength(2);
  });
});

describe('snapshots', () => {
  it('copiam o enunciado e não mudam quando a questão é editada ou excluída', () => {
    const data = world();
    const run = createRun({ id: 'r1', title: 'Simulado', questions: [data.questions[0]], data, now: T0, minutes: null });
    data.questions[0].answer = 'C';
    data.questions[0].body = 'alterado';
    expect(run.questions[0]).toMatchObject({ id: 'q1', body: 'Enunciado q1', answer: 'B', subjectTitle: 'Matemática', topicTitle: 'Álgebra', difficulty: 'easy' });
    expect(run.deadline).toBeNull();
  });
  it('não grava chaves undefined', () => {
    const snap = snapshotQuestion(question('x'), world());
    expect(Object.values(snap).includes(undefined as never)).toBe(false);
    expect('subjectId' in snap).toBe(false);
  });
});

describe('execução', () => {
  function started(minutes: number | null = 30): Data {
    const data = world();
    const run = createRun({ id: 'r1', title: 'Simulado', questions: data.questions.slice(0, 3), data, now: T0, minutes });
    return startSimulation(data, run);
  }

  it('não substitui um simulado ativo', () => {
    const data = started();
    const other = createRun({ id: 'r2', title: 'Outro', questions: [], data, now: T0, minutes: null });
    expect(startSimulation(data, other)).toBe(data);
  });
  it('salva respostas válidas e ignora opção desconhecida ou run diferente', () => {
    const data = started();
    const answered = recordAnswer(data, { runId: 'r1', questionId: 'q1', answer: 'A', now: T0 + MIN });
    expect(answered.activeSimulation?.answers).toEqual({ q1: 'A' });
    expect(recordAnswer(answered, { runId: 'r1', questionId: 'q1', answer: 'Z', now: T0 })).toBe(answered);
    expect(recordAnswer(answered, { runId: 'other', questionId: 'q1', answer: 'B', now: T0 })).toBe(answered);
    expect(clearAnswer(answered, { runId: 'r1', questionId: 'q1', now: T0 }).activeSimulation?.answers).toEqual({});
  });
  it('bloqueia respostas depois do limite', () => {
    const data = started(30);
    const run = data.activeSimulation!;
    expect(remainingMs(run, T0 + 10 * MIN)).toBe(20 * MIN);
    expect(isExpired(run, T0 + 30 * MIN)).toBe(true);
    expect(recordAnswer(data, { runId: 'r1', questionId: 'q1', answer: 'A', now: T0 + 30 * MIN })).toBe(data);
    expect(remainingMs(started(null).activeSimulation!, T0)).toBeNull();
  });
  it('cancelar descarta só o run indicado', () => {
    const data = started();
    expect(cancelSimulation(data, 'zzz')).toBe(data);
    expect(cancelSimulation(data, 'r1').activeSimulation).toBeNull();
  });
});

describe('finalização', () => {
  function answeredRun(): Data {
    let data = world();
    data = startSimulation(data, createRun({ id: 'r1', title: 'Simulado', questions: data.questions.slice(0, 3), data, now: T0, minutes: 30 }));
    data = recordAnswer(data, { runId: 'r1', questionId: 'q1', answer: 'B', now: T0 + MIN }); // correta
    data = recordAnswer(data, { runId: 'r1', questionId: 'q2', answer: 'A', now: T0 + MIN }); // errada; q3 em branco
    return data;
  }

  it('corrige, guarda snapshots/respostas e cria tentativa só para respondidas', () => {
    const done = finishSimulation(answeredRun(), { runId: 'r1', now: T0 + 12 * MIN });
    expect(done.activeSimulation).toBeNull();
    expect(done.simulations).toHaveLength(1);
    expect(done.simulations[0]).toMatchObject({ id: 'simulation-r1', score: 1, total: 3, duration: 12 * MIN, startedAt: T0, createdAt: T0 + 12 * MIN, responses: { q1: 'B', q2: 'A' } });
    expect(done.simulations[0].snapshots).toHaveLength(3);
    expect(done.attempts.map(item => [item.questionId, item.score, item.assessment])).toEqual([['q1', 1, 'objective'], ['q2', 0, 'objective']]);
    expect(done.attempts[0]).toMatchObject({ subjectId: 's1', topicId: 't1', total: 1 });
  });
  it('é idempotente (chamar duas vezes não duplica)', () => {
    const once = finishSimulation(answeredRun(), { runId: 'r1', now: T0 + 12 * MIN });
    const twice = finishSimulation(once, { runId: 'r1', now: T0 + 13 * MIN });
    expect(twice).toBe(once);
  });
  it('no limite de tempo registra o fim no deadline, mesmo se a página só notou depois', () => {
    const done = finishSimulation(answeredRun(), { runId: 'r1', now: T0 + 5 * 60 * MIN });
    expect(done.simulations[0]).toMatchObject({ createdAt: T0 + 30 * MIN, duration: 30 * MIN });
  });
  it('referências removidas durante a prova não quebram o salvamento', () => {
    const data = answeredRun();
    data.questions = data.questions.filter(item => item.id !== 'q1');
    data.topics = data.topics.filter(item => item.id !== 't1' && item.id !== 't2');
    const done = finishSimulation(data, { runId: 'r1', now: T0 + MIN });
    const attempt = done.attempts.find(item => item.id === 'attempt-r1-q1')!;
    expect(attempt.questionId).toBeUndefined();
    expect('topicId' in attempt).toBe(false);
    expect(attempt.subjectId).toBe('s1');
    expect(done.simulations[0].snapshots![0].topicTitle).toBe('Álgebra'); // snapshot keeps the history
  });
  it('run diferente ou ausente não altera nada', () => {
    const data = answeredRun();
    expect(finishSimulation(data, { runId: 'nope', now: T0 })).toBe(data);
    const idle = world();
    expect(finishSimulation(idle, { runId: 'r1', now: T0 })).toBe(idle);
  });
});

describe('revisão', () => {
  it('classifica correta, errada e em branco', () => {
    const snapshots = world().questions.slice(0, 3).map(item => snapshotQuestion(item, world()));
    const grade = gradeAnswers(snapshots, { q1: 'B', q2: 'C' });
    expect(grade.rows.map(row => row.status)).toEqual(['correct', 'wrong', 'blank']);
    expect(grade).toMatchObject({ score: 1, total: 3, answered: 2 });
  });
  it('registro sem snapshots não é revisável', () => {
    expect(reviewSimulation({ id: 's', title: 'Antigo', createdAt: 0, score: 1, total: 2 })).toBeNull();
  });
});

describe('assunto movido de disciplina depois de iniciar o run', () => {
  /** Valid fixture: objective questions only. */
  function started(): Data {
    const base = world();
    const data: Data = { ...base, questions: base.questions.slice(0, 3) };
    validate(data); // the fixture itself must be valid
    let next = startSimulation(data, createRun({ id: 'r1', title: 'Simulado', questions: data.questions, data, now: T0, minutes: 30 }));
    next = recordAnswer(next, { runId: 'r1', questionId: 'q1', answer: 'B', now: T0 + MIN });
    return recordAnswer(next, { runId: 'r1', questionId: 'q2', answer: 'A', now: T0 + MIN });
  }

  it('desassocia o assunto movido, mantém o histórico do snapshot e continua válido (roundtrip)', () => {
    const data = started();
    // Topics t1/t2 move to subject s2 and the materials are detached from them beforehand.
    const moved: Data = {
      ...data,
      topics: data.topics.map(topic => (topic.id === 't1' || topic.id === 't2' ? { ...topic, subjectId: 's2' } : topic)),
      questions: data.questions.map(item => (item.id === 'q1' || item.id === 'q2' ? { ...item, topicId: undefined } : item)),
    };
    moved.questions = moved.questions.map(item => { const { topicId, ...rest } = item; return topicId === undefined && (item.id === 'q1' || item.id === 'q2') ? rest : item; });
    validate(moved);

    const done = finishSimulation(moved, { runId: 'r1', now: T0 + 5 * MIN });
    expect(() => validate(done)).not.toThrow();
    expect(parseBackup(exportBackup(done))).toEqual(done);

    const attempt = done.attempts.find(item => item.id === 'attempt-r1-q1')!;
    expect(attempt.subjectId).toBe('s1'); // still exists
    expect('topicId' in attempt).toBe(false); // t1 now belongs to s2: not attached
    // Original history is preserved in the simulation snapshot.
    const snapshot = done.simulations[0].snapshots!.find(item => item.id === 'q1')!;
    expect(snapshot).toMatchObject({ subjectId: 's1', subjectTitle: 'Matemática', topicId: 't1', topicTitle: 'Álgebra' });
  });

  it('mantém o assunto quando a associação atual ainda combina com a disciplina', () => {
    const done = finishSimulation(started(), { runId: 'r1', now: T0 + MIN });
    expect(() => validate(done)).not.toThrow();
    expect(done.attempts.find(item => item.id === 'attempt-r1-q1')).toMatchObject({ subjectId: 's1', topicId: 't1' });
  });

  it('disciplina excluída: não deixa assunto com disciplina diferente da tentativa', () => {
    const data = started();
    const gone: Data = {
      ...data,
      subjects: data.subjects.filter(subject => subject.id !== 's1'),
      topics: data.topics.filter(topic => topic.subjectId !== 's1'),
      questions: data.questions.filter(item => item.subjectId !== 's1'),
    };
    validate(gone);
    const done = finishSimulation(gone, { runId: 'r1', now: T0 + MIN });
    expect(() => validate(done)).not.toThrow();
    expect(done.attempts.every(item => !item.subjectId && !item.topicId)).toBe(true);
  });
});
