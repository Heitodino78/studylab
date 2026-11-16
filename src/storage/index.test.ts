import { describe, it, expect } from 'vitest';
import { exportBackup, parseBackup, validate } from './index';
import { emptyData } from '../models';

describe('backup', () => {
  it('exporta e importa versão 2 completa, incluindo foco e preferências', () => {
    const data = emptyData(); data.settings.displayName = 'Pessoa'; data.focus.accumulatedMs = 123;
    expect(parseBackup(exportBackup(data))).toEqual(data);
  });
  it('migra versão 1 com defaults seguros', () => {
    const { settings: _settings, focus: _focus, activeSimulation: _run, reviews: _reviews, ...old } = emptyData();
    expect(parseBackup(JSON.stringify({ version: 1, data: old }))).toEqual(emptyData());
  });
  it('rejeita versões, campos e números inválidos', () => {
    expect(() => parseBackup(JSON.stringify({ version: 3, data: emptyData() }))).toThrow();
    expect(() => validate({ ...emptyData(), extra: [] })).toThrow();
    const data = emptyData(); data.settings.pomodoro.focusMinutes = Infinity;
    expect(() => validate(data)).toThrow();
  });
  it('rejeita referências, duplicatas e ciclos', () => {
    const data = emptyData(); data.topics.push({ id: '1', title: 'T', createdAt: 0, subjectId: 'missing' });
    expect(() => validate(data)).toThrow();
    const duplicate = emptyData(); duplicate.subjects.push({ id: 's', title: 'A', createdAt: 0 }, { id: 's', title: 'B', createdAt: 0 });
    expect(() => validate(duplicate)).toThrow();
    const cycle = emptyData(); cycle.topics.push({ id: 'a', title: 'A', createdAt: 0, parentId: 'b' }, { id: 'b', title: 'B', createdAt: 0, parentId: 'a' });
    expect(() => validate(cycle)).toThrow();
  });
  it('rejeita JSON malformado, tamanho excessivo e alternativas inválidas', () => {
    expect(() => parseBackup('{')).toThrow(); expect(() => parseBackup(' '.repeat(10_000_001))).toThrow();
    const data = emptyData(); data.questions.push({ id: 'q', title: 'Q', createdAt: 0, options: ['A', 'B'], answer: 'C' });
    expect(() => validate(data)).toThrow();
  });
  it('rejeita snapshot e respostas inconsistentes', () => {
    const data = emptyData(); data.activeSimulation = { id: 'r', title: 'R', questions: [{ id: 'q', title: 'Q', body: '', options: ['A'], answer: 'A', explanation: '' }], answers: { extra: 'A' }, startedAt: 1, deadline: null };
    expect(() => validate(data)).toThrow();
  });
});
it('aplica os mesmos limites de preferências dos ajustes', () => {
  const valid = emptyData(); valid.settings = { displayName: 'a'.repeat(60), theme: 'system', dailyMinutes: 1440, weeklyMinutes: 10080,
    pomodoro: { focusMinutes: 180, shortBreakMinutes: 60, longBreakMinutes: 120, cyclesBeforeLongBreak: 12 } };
  expect(() => validate(valid)).not.toThrow();
  for (const change of [
    (d: typeof valid) => { d.settings.displayName = 'x'.repeat(61); },
    (d: typeof valid) => { d.settings.weeklyMinutes = d.settings.dailyMinutes - 1; },
    (d: typeof valid) => { d.settings.pomodoro.focusMinutes = 181; },
    (d: typeof valid) => { d.settings.pomodoro.shortBreakMinutes = 61; },
    (d: typeof valid) => { d.settings.pomodoro.longBreakMinutes = 121; },
    (d: typeof valid) => { d.settings.pomodoro.cyclesBeforeLongBreak = 13; },
  ]) { const data = structuredClone(valid); change(data); expect(() => validate(data)).toThrow(); }
});
