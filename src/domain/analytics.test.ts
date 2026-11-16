import { describe, expect, it } from 'vitest';
import { emptyData, type Data, type Item } from '../models';
import { accuracyBySubject, ALL_TIME, activeDays, currentStreak, daysUntil, deadlines, exerciseSummary, focusMs, focusSeries, goalProgress, isCardPending, lastDays, recentSubjects, recommendations, reviewSummary, startOfWeek, timeBySubject, todayRange, topicErrors, weekRange } from './analytics';

const MIN = 60_000;
const at = (day: number, hour = 12) => new Date(2026, 10, day, hour, 0, 0).getTime(); // Nov 2026; 16 is a Monday
const NOW = at(18); // Wednesday

const session = (id: string, createdAt: number, minutes: number, subjectId?: string): Item => ({ id, title: 's', createdAt, duration: minutes * MIN, ...(subjectId ? { subjectId } : {}) });
const attempt = (id: string, extra: Partial<Item>): Item => ({ id, title: 'a', createdAt: NOW, assessment: 'objective', score: 1, total: 1, ...extra });

function data(patch: Partial<Data>): Data { return { ...emptyData(), ...patch }; }

describe('datas e períodos', () => {
  it('semana vai de segunda a domingo', () => {
    expect(startOfWeek(at(22))).toBe(at(16, 0));
    expect(weekRange(NOW)).toEqual({ from: at(16, 0), to: at(23, 0) });
    expect(todayRange(NOW)).toEqual({ from: at(18, 0), to: at(19, 0) });
    expect(lastDays(NOW, 7).from).toBe(at(12, 0));
  });
  it('conta dias até uma data local', () => {
    expect(daysUntil('2026-11-18', NOW)).toBe(0);
    expect(daysUntil('2026-11-20', NOW)).toBe(2);
    expect(daysUntil('2026-11-10', NOW)).toBe(-8);
    expect(daysUntil('invalid', NOW)).toBeNaN();
  });
});

describe('foco', () => {
  const d = data({ sessions: [session('a', at(18, 8), 30, 's1'), session('b', at(18, 20), 15), session('c', at(16, 9), 60, 's1'), session('d', at(9, 9), 45, 's2')] });
  it('soma hoje, semana e por disciplina', () => {
    expect(focusMs(d, todayRange(NOW))).toBe(45 * MIN);
    expect(focusMs(d, weekRange(NOW))).toBe(105 * MIN);
    expect(focusMs(d, ALL_TIME, 's1')).toBe(90 * MIN);
    expect(focusMs(d, ALL_TIME, '')).toBe(15 * MIN);
  });
  it('série de 7 dias tem um ponto por dia, do mais antigo ao mais novo', () => {
    const series = focusSeries(d, NOW, 7);
    expect(series).toHaveLength(7);
    expect(series[6].ms).toBe(45 * MIN);
    expect(series[4].ms).toBe(60 * MIN); // Monday 16
    expect(series[0].ms).toBe(0);
  });
  it('série longa usa semanas', () => {
    const series = focusSeries(d, NOW, 90);
    expect(series).toHaveLength(13);
    expect(series[12].ms).toBe(105 * MIN);
    expect(series[11].ms).toBe(45 * MIN); // week of Nov 9
  });
  it('tempo por disciplina agrupa sem disciplina e disciplina removida', () => {
    const withSubjects = data({ ...d, subjects: [{ id: 's1', title: 'Matemática', createdAt: 0 }] });
    expect(timeBySubject(withSubjects, ALL_TIME)).toEqual([
      { subjectId: 's1', title: 'Matemática', ms: 90 * MIN },
      { subjectId: '', title: 'Sem disciplina', ms: 60 * MIN }, // 15 + 45 from removed subject s2
    ]);
  });
});

describe('exercícios', () => {
  const base = data({
    subjects: [{ id: 's1', title: 'Física', createdAt: 0 }],
    topics: [{ id: 't1', title: 'Cinemática', subjectId: 's1', createdAt: 0 }],
    questions: [{ id: 'q1', title: 'Q', createdAt: 0, subjectId: 's1', topicId: 't1' }],
    attempts: [
      attempt('1', { questionId: 'q1', score: 0 }),
      attempt('2', { questionId: 'q1', score: 0 }),
      attempt('3', { questionId: 'q1', score: 1 }),
      attempt('4', { subjectId: 's1', assessment: 'pending', score: undefined, total: undefined }),
      attempt('5', { subjectId: 's1', assessment: 'manual', score: 1 }),
    ],
  });
  it('pendentes não entram na taxa; correção manual entra', () => {
    expect(exerciseSummary(base, ALL_TIME)).toEqual({ attempts: 5, evaluated: 4, correct: 2, pending: 1, rate: 0.5 });
  });
  it('sem tentativas a taxa é nula (nada inventado)', () => {
    expect(exerciseSummary(emptyData(), ALL_TIME)).toMatchObject({ attempts: 0, rate: null });
  });
  it('assuntos com erros usam o tópico da tentativa ou da questão', () => {
    expect(topicErrors(base)).toEqual([{ id: 't1', title: 'Cinemática', subtitle: 'Física', evaluated: 3, correct: 1, errors: 2, rate: 1 / 3 }]);
    expect(accuracyBySubject(base)[0]).toMatchObject({ id: 's1', evaluated: 4, correct: 2 });
  });
});

describe('revisões e frequência', () => {
  it('conta cards novos e vencidos como pendentes', () => {
    const cards: Item[] = [
      { id: 'n', title: 'novo', createdAt: 0 },
      { id: 'v', title: 'vencido', createdAt: 0, schedule: { repetitions: 1, intervalDays: 1, easeFactor: 2.5, dueAt: NOW - 1 } },
      { id: 'f', title: 'futuro', createdAt: 0, schedule: { repetitions: 1, intervalDays: 1, easeFactor: 2.5, dueAt: NOW + DAY } },
    ];
    expect(isCardPending(cards[2], NOW)).toBe(false);
    const reviews: Item[] = [{ id: 'r1', title: 'r', createdAt: NOW, quality: 2 }, { id: 'r2', title: 'r', createdAt: NOW, quality: 5 }];
    expect(reviewSummary(data({ cards, reviews }), NOW, ALL_TIME)).toEqual({ reviews: 2, lapses: 1, averageQuality: 3.5, newCards: 1, dueCards: 1, pendingCards: 2 });
  });
  const DAY = 86_400_000;

  it('sequência conta dias seguidos e aceita hoje ainda vazio', () => {
    const d = data({ sessions: [session('a', at(18), 10), session('b', at(17), 10), session('c', at(16), 10), session('z', at(13), 10)] });
    expect(currentStreak(d, NOW)).toBe(3);
    expect(currentStreak(d, at(19))).toBe(3); // today empty, yesterday active
    expect(currentStreak(d, at(20))).toBe(0);
    expect(activeDays(d, lastDays(NOW, 7))).toBe(4);
  });

  it('matérias recentes ordenam pela última atividade', () => {
    const d = data({
      subjects: [{ id: 'a', title: 'A', createdAt: 1 }, { id: 'b', title: 'B', createdAt: 2 }, { id: 'c', title: 'C', createdAt: 3 }],
      sessions: [session('1', at(16), 10, 'a'), session('2', at(17), 20, 'b')],
    });
    expect(recentSubjects(d, NOW).map(row => row.subject.id)).toEqual(['b', 'a', 'c']);
    expect(recentSubjects(d, NOW)[0].weekMs).toBe(20 * MIN);
  });
});

describe('metas e prazos', () => {
  it('progresso de metas por período usa o foco real', () => {
    const d = data({
      sessions: [session('a', at(18, 8), 30), session('b', at(16, 8), 60)],
      goals: [
        { id: 'g1', title: 'Hoje', createdAt: 0, period: 'daily', targetMinutes: 60 },
        { id: 'g2', title: 'Semana', createdAt: 0, period: 'weekly', targetMinutes: 180 },
        { id: 'g3', title: 'Sem período', createdAt: 0 },
        { id: 'g4', title: 'Feita', createdAt: 0, period: 'daily', targetMinutes: 10, status: 'concluído' },
      ],
    });
    expect(goalProgress(d, NOW).map(entry => [entry.goal.id, entry.ratio])).toEqual([['g1', 0.5], ['g2', 0.5]]);
  });

  it('prazos: atrasados, hoje e próximos; ignora concluídos e fora do horizonte', () => {
    const d = data({
      tasks: [
        { id: 't1', title: 'atrasada', createdAt: 0, due: '2026-11-10' },
        { id: 't2', title: 'hoje', createdAt: 0, due: '2026-11-18' },
        { id: 't3', title: 'feita', createdAt: 0, due: '2026-11-10', status: 'concluído' },
        { id: 't4', title: 'longe', createdAt: 0, due: '2026-12-30' },
      ],
      exams: [{ id: 'e1', title: 'Prova', createdAt: 0, due: '2026-11-20' }],
    });
    expect(deadlines(d, NOW, 7).map(entry => [entry.item.id, entry.state])).toEqual([['t1', 'overdue'], ['t2', 'today'], ['e1', 'soon']]);
  });
});

describe('recomendações', () => {
  it('sem dados não recomenda nada', () => expect(recommendations(emptyData(), NOW)).toEqual([]));

  it('ordena por prioridade e explica a regra', () => {
    const d = data({
      subjects: [{ id: 's1', title: 'Física', createdAt: at(1) }],
      topics: [{ id: 't1', title: 'Cinemática', subjectId: 's1', createdAt: 0 }],
      cards: [{ id: 'c', title: 'c', createdAt: 0 }],
      tasks: [{ id: 'x', title: 'atrasada', createdAt: 0, due: '2026-11-01' }],
      exams: [{ id: 'e', title: 'Prova 1', createdAt: 0, due: '2026-11-20' }],
      attempts: [0, 0, 1].map((score, index) => attempt(`a${index}`, { score, subjectId: 's1', topicId: 't1' })),
    });
    const found = recommendations(d, NOW);
    expect(found.map(item => item.id)).toEqual(['exam-e', 'tasks-overdue', 'cards-pending', 'topic-t1', 'subject-s1', 'daily-goal']);
    expect(found.every(item => item.rule.length > 10 && item.to.startsWith('/'))).toBe(true);
  });

  it('não marca ponto fraco com menos de 3 respostas avaliadas', () => {
    const d = data({ subjects: [{ id: 's1', title: 'Física', createdAt: NOW }], attempts: [attempt('a', { score: 0, subjectId: 's1' }), attempt('b', { score: 0, subjectId: 's1' })] });
    expect(recommendations(d, NOW).some(item => item.id.startsWith('subject-'))).toBe(false);
  });
});
