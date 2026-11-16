import { describe, expect, it } from 'vitest';
import { emptyData } from '../models';
import { completePhase } from '../domain/focus';
import { createRun, finishSimulation, recordAnswer, startSimulation } from '../domain/simulation';
import { removeItem } from '../pages/Collection';
import { exportBackup, parseBackup, validate } from './index';
import { weakSubjects } from '../domain/stats';

const roundtrip = (value: ReturnType<typeof emptyData>) => parseBackup(exportBackup(validate(value)));

describe('compatibilidade entre domínio e armazenamento', () => {
  it('valida e preserva sessão determinística de fase concluída', () => {
    const data = emptyData();
    data.subjects.push({ id: 's', title: 'Disciplina', createdAt: 1 });
    data.focus = { ...data.focus, id: 'fase', subjectId: 's', startedAt: 1000 };
    const result = completePhase(data, { expectedPhaseId: 'fase', newId: 'proxima', now: 1_501_000 });
    expect(result.sessions[0].id).toBe('session-fase');
    expect(roundtrip(result)).toEqual(result);
    expect(result.focus.phase).toBe('shortBreak');
  });
  it('preserva snapshots e respostas após excluir questão e disciplina durante o simulado', () => {
    const data = emptyData();
    const subject = { id: 's', title: 'Disciplina', createdAt: 1 };
    const topic = { id: 't', title: 'Assunto', subjectId: 's', createdAt: 1 };
    const question = { id: 'q', title: 'Questão', subjectId: 's', topicId: 't', options: ['A','B'], answer: 'B', createdAt: 1 };
    data.subjects.push(subject); data.topics.push(topic); data.questions.push(question);
    const run = createRun({ id: 'run', title: 'Simulado', questions: [question], data, now: 1000, minutes: 10 });
    let current = startSimulation(data, run);
    current = recordAnswer(current, { runId: 'run', questionId: 'q', answer: 'B', now: 2000 });
    current = removeItem(current, 'questions', question);
    current = removeItem(current, 'subjects', subject);
    const finished = finishSimulation(current, { runId: 'run', now: 3000 });
    expect(finished.simulations[0].questionIds).toBeUndefined();
    expect(finished.simulations[0].snapshots?.[0].subjectId).toBe('s');
    expect(finished.attempts[0].questionId).toBeUndefined();
    expect(roundtrip(finished)).toEqual(finished);
  });
  it('limpa disciplina do foco ao excluir, mantendo sessões', () => {
    const data = emptyData();
    const subject = { id: 's', title: 'Disciplina', createdAt: 1 };
    data.subjects.push(subject); data.focus.subjectId = 's';
    data.sessions.push({ id: 'session-old', title: 'Foco', subjectId: 's', createdAt: 1, duration: 1000 });
    const result = removeItem(data, 'subjects', subject);
    expect(result.focus.subjectId).toBe('');
    expect(result.sessions[0].subjectId).toBeUndefined();
    expect(roundtrip(result)).toEqual(result);
  });
  it('conta questões objetivas e discursivas corrigidas, excluindo pendentes', () => {
    const data = emptyData(); data.subjects.push({ id: 's', title: 'Disciplina', createdAt: 1 });
    data.attempts.push(
      { id: 'a', title: 'A', createdAt: 1, subjectId: 's', assessment: 'objective', score: 0, total: 1 },
      { id: 'b', title: 'B', createdAt: 1, subjectId: 's', assessment: 'manual', score: 1, total: 1 },
      { id: 'c', title: 'C', createdAt: 1, subjectId: 's', assessment: 'manual', score: 0, total: 1 },
      { id: 'd', title: 'D', createdAt: 1, subjectId: 's', assessment: 'pending' },
    );
    expect(roundtrip(data)).toEqual(data);
    expect(weakSubjects(data)[0]).toMatchObject({ total: 3, score: 1, rate: 1/3 });
  });
});
