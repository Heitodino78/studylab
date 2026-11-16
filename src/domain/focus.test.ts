import { describe, expect, it } from 'vitest';
import { emptyData, type Data, type FocusState } from '../models';
import { completePhase, countedMs, cycleNumber, elapsedMs, isPhaseFinished, pause, remainingMs, resetPhase, startOrResume, switchMode, validatePreferences } from './focus';

const MIN = 60_000;
const T0 = new Date(2026, 10, 16, 9, 0, 0).getTime();

function dataWith(focus: Partial<FocusState>, patch: Partial<Data> = {}): Data {
  const base = emptyData();
  return { ...base, ...patch, focus: { ...base.focus, id: 'phase-1', ...focus } };
}

describe('cronômetro por timestamps', () => {
  it('conta só o tempo em execução e ignora pausas', () => {
    const settings = emptyData().settings;
    let state = startOrResume(dataWith({}).focus, settings, T0);
    state = pause(state, T0 + 10 * MIN);
    expect(elapsedMs(state, T0 + 3 * 60 * MIN)).toBe(10 * MIN); // horas de pausa não contam
    state = startOrResume(state, settings, T0 + 60 * MIN);
    expect(elapsedMs(state, T0 + 65 * MIN)).toBe(15 * MIN);
  });

  it('sobrevive a recarga (estado persistido) e a relógio retrocedendo', () => {
    const reloaded: FocusState = JSON.parse(JSON.stringify({ ...dataWith({}).focus, startedAt: T0, accumulatedMs: 2 * MIN }));
    expect(elapsedMs(reloaded, T0 + 5 * MIN)).toBe(7 * MIN);
    expect(elapsedMs(reloaded, T0 - 10 * MIN)).toBe(2 * MIN);
  });

  it('pausa limita o tempo ao alvo do Pomodoro', () => {
    const running = dataWith({ startedAt: T0, durationMinutes: 25 }).focus;
    expect(pause(running, T0 + 5 * 60 * MIN).accumulatedMs).toBe(25 * MIN);
  });

  it('fase ociosa adota a configuração atual ao iniciar', () => {
    const data = dataWith({ durationMinutes: 25 });
    data.settings.pomodoro.focusMinutes = 50;
    expect(startOrResume(data.focus, data.settings, T0).durationMinutes).toBe(50);
  });

  it('calcula restante e fim de fase', () => {
    const state = dataWith({ startedAt: T0, durationMinutes: 25 }).focus;
    expect(remainingMs(state, T0 + 10 * MIN)).toBe(15 * MIN);
    expect(isPhaseFinished(state, T0 + 24 * MIN)).toBe(false);
    expect(isPhaseFinished(state, T0 + 25 * MIN)).toBe(true);
    expect(remainingMs(dataWith({ mode: 'stopwatch', startedAt: T0 }).focus, T0 + MIN)).toBeNull();
  });
});

describe('conclusão de fase', () => {
  it('não conclui antes do alvo sem force', () => {
    const data = dataWith({ startedAt: T0 });
    expect(completePhase(data, { expectedPhaseId: 'phase-1', now: T0 + 10 * MIN, newId: 'phase-2' })).toBe(data);
  });

  it('registra no máximo o alvo mesmo após horas longe da tela e prepara pausa PARADA', () => {
    const data = dataWith({ startedAt: T0, subjectId: '' });
    const next = completePhase(data, { expectedPhaseId: 'phase-1', now: T0 + 5 * 60 * MIN, newId: 'phase-2' });
    expect(next.sessions).toHaveLength(1);
    expect(next.sessions[0]).toMatchObject({ id: 'session-phase-1', duration: 25 * MIN, createdAt: T0 + 25 * MIN });
    expect(next.focus).toMatchObject({ id: 'phase-2', phase: 'shortBreak', cycle: 1, startedAt: null, accumulatedMs: 0, durationMinutes: 5 });
  });

  it('usa pausa longa após o número configurado de ciclos', () => {
    const data = dataWith({ startedAt: T0, cycle: 3 });
    const next = completePhase(data, { expectedPhaseId: 'phase-1', now: T0 + 25 * MIN, newId: 'phase-2' });
    expect(next.focus).toMatchObject({ phase: 'longBreak', cycle: 4, durationMinutes: 15 });
  });

  it('é idempotente: repetir com o id antigo não duplica nem avança', () => {
    const data = dataWith({ startedAt: T0 });
    const once = completePhase(data, { expectedPhaseId: 'phase-1', now: T0 + 30 * MIN, newId: 'phase-2' });
    const twice = completePhase(once, { expectedPhaseId: 'phase-1', now: T0 + 31 * MIN, newId: 'phase-3' });
    expect(twice).toBe(once);
    expect(twice.sessions).toHaveLength(1);
  });

  it('recuperação após falha não duplica a sessão (mesma fase, sessão já gravada)', () => {
    const data = dataWith({ startedAt: T0 });
    const withSession = completePhase(data, { expectedPhaseId: 'phase-1', now: T0 + 25 * MIN, newId: 'x' });
    const replay = completePhase({ ...data, sessions: withSession.sessions }, { expectedPhaseId: 'phase-1', now: T0 + 26 * MIN, newId: 'y' });
    expect(replay.sessions).toHaveLength(1);
  });

  it('pausa não gera sessão e volta ao foco parado; ciclo preservado', () => {
    const data = dataWith({ phase: 'shortBreak', cycle: 1, startedAt: T0, durationMinutes: 5 });
    const next = completePhase(data, { expectedPhaseId: 'phase-1', now: T0 + 5 * MIN, newId: 'phase-2' });
    expect(next.sessions).toHaveLength(0);
    expect(next.focus).toMatchObject({ phase: 'focus', cycle: 1, startedAt: null, accumulatedMs: 0, durationMinutes: 25 });
  });

  it('término antecipado guarda o tempo, mantém o ciclo e não força pausa', () => {
    const data = dataWith({ startedAt: T0 });
    const next = completePhase(data, { expectedPhaseId: 'phase-1', now: T0 + 10 * MIN, newId: 'phase-2', force: true });
    expect(next.sessions[0].duration).toBe(10 * MIN);
    expect(next.focus).toMatchObject({ phase: 'focus', cycle: 0 });
  });

  it('cronômetro livre registra todo o tempo e descarta menos de 1 s', () => {
    const data = dataWith({ mode: 'stopwatch', startedAt: T0, accumulatedMs: 2 * MIN });
    const next = completePhase(data, { expectedPhaseId: 'phase-1', now: T0 + 90 * MIN, newId: 'phase-2', force: true });
    expect(next.sessions[0]).toMatchObject({ duration: 92 * MIN, title: 'Cronômetro livre' });
    const tiny = completePhase(dataWith({ mode: 'stopwatch', startedAt: T0 }), { expectedPhaseId: 'phase-1', now: T0 + 500, newId: 'n', force: true });
    expect(tiny.sessions).toHaveLength(0);
  });

  it('só grava a disciplina se ela ainda existir', () => {
    const base = emptyData();
    const kept = dataWith({ startedAt: T0, subjectId: 's1' }, { subjects: [{ id: 's1', title: 'Matemática', createdAt: 0 }] });
    expect(completePhase(kept, { expectedPhaseId: 'phase-1', now: T0 + 25 * MIN, newId: 'n' }).sessions[0].subjectId).toBe('s1');
    const gone = dataWith({ startedAt: T0, subjectId: 'deleted' }, { subjects: base.subjects });
    expect(completePhase(gone, { expectedPhaseId: 'phase-1', now: T0 + 25 * MIN, newId: 'n' }).sessions[0].subjectId).toBeUndefined();
  });

  it('countedMs nunca passa do alvo', () => {
    expect(countedMs(dataWith({ startedAt: T0 }).focus, T0 + 999 * MIN)).toBe(25 * MIN);
  });
});

describe('reinício, modo e ciclo', () => {
  it('reiniciar descarta o tempo e troca o id da fase', () => {
    const state = resetPhase(dataWith({ startedAt: T0, accumulatedMs: 4 * MIN }).focus, emptyData().settings, 'fresh');
    expect(state).toMatchObject({ id: 'fresh', startedAt: null, accumulatedMs: 0 });
  });

  it('trocar de modo volta ao foco ocioso', () => {
    const state = switchMode(dataWith({ phase: 'longBreak', cycle: 4 }).focus, 'stopwatch', emptyData().settings, 'm');
    expect(state).toMatchObject({ mode: 'stopwatch', phase: 'focus', cycle: 0, accumulatedMs: 0 });
  });

  it('numera o ciclo exibido', () => {
    const settings = emptyData().settings;
    expect(cycleNumber(dataWith({ cycle: 0 }).focus, settings)).toBe(1);
    expect(cycleNumber(dataWith({ phase: 'shortBreak', cycle: 1 }).focus, settings)).toBe(1);
    expect(cycleNumber(dataWith({ cycle: 4 }).focus, settings)).toBe(1);
    expect(cycleNumber(dataWith({ phase: 'longBreak', cycle: 4 }).focus, settings)).toBe(4);
  });
});

describe('validação de preferências', () => {
  it('aceita os padrões', () => expect(validatePreferences(emptyData().settings)).toEqual({}));
  it('rejeita valores fora da faixa ou fracionários', () => {
    const settings = emptyData().settings;
    settings.pomodoro.focusMinutes = 0;
    settings.pomodoro.shortBreakMinutes = 2.5;
    settings.dailyMinutes = 2000;
    const errors = validatePreferences(settings);
    expect(Object.keys(errors).sort()).toEqual(['dailyMinutes', 'focusMinutes', 'shortBreakMinutes']);
  });
  it('meta semanal não pode ser menor que a diária e nome tem limite', () => {
    const settings = emptyData().settings;
    settings.dailyMinutes = 120;
    settings.weeklyMinutes = 60;
    settings.displayName = 'x'.repeat(61);
    expect(Object.keys(validatePreferences(settings)).sort()).toEqual(['displayName', 'weeklyMinutes']);
  });
});
