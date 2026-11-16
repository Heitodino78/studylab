import { useEffect, useRef } from 'react';
import { useStore } from '../../context/Store';
import { completePhase, countedMs, isPhaseFinished, remainingMs } from '../../domain/focus';
import { finishSimulation, isExpired } from '../../domain/simulation';
import { formatClock, newId } from './util';

const RETRY_AFTER_MS = 5000;

function notify(body: string): void {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('StudyLab', { body });
  } catch { /* notifications are optional */ }
}

/**
 * Completes Pomodoro phases and expired simulations as soon as they are due, even when the tab
 * is in the background. Both operations are idempotent inside the atomic update, so mounting
 * this hook in several places (or in several tabs) cannot register anything twice.
 */
export function useAutoCompletion(): void {
  const { data, update } = useStore();
  const { focus, activeSimulation: run } = data;
  const busy = useRef<{ key: string; since: number } | null>(null);

  function runOnce(key: string, task: () => Promise<boolean>): void {
    const current = busy.current;
    if (current && current.key === key && Date.now() - current.since < RETRY_AFTER_MS) return;
    busy.current = { key, since: Date.now() };
    void task().then(ok => { if (ok) busy.current = null; });
  }

  useEffect(() => {
    if (focus.mode !== 'pomodoro') return undefined;
    const check = () => {
      if (!isPhaseFinished(focus, Date.now())) return;
      const phaseId = focus.id;
      const wasFocus = focus.phase === 'focus';
      runOnce(`focus:${phaseId}`, async () => {
        let applied = false;
        const ok = await update(old => {
          const next = completePhase(old, { expectedPhaseId: phaseId, now: Date.now(), newId: newId() });
          applied = next !== old;
          return next;
        });
        if (ok && applied) notify(wasFocus ? 'Foco concluído. A pausa está pronta para começar.' : 'Pausa encerrada. Pronto para o próximo foco.');
        return ok;
      });
    };
    check();
    const timer = window.setInterval(check, 1000);
    document.addEventListener('visibilitychange', check);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', check); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  useEffect(() => {
    if (!run || run.deadline === null) return undefined;
    const runId = run.id;
    const check = () => {
      if (!run || !isExpired(run, Date.now())) return;
      runOnce(`simulation:${runId}`, async () => {
        let applied = false;
        const ok = await update(old => {
          const next = finishSimulation(old, { runId, now: Date.now() });
          applied = next !== old;
          return next;
        });
        if (ok && applied) notify('O tempo do simulado acabou e o resultado foi registrado.');
        return ok;
      });
    };
    check();
    const timer = window.setInterval(check, 1000);
    document.addEventListener('visibilitychange', check);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', check); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
}

/** Shows the running timer in the browser tab title so it is visible from other tabs. */
export function useTimerTitle(): void {
  const { data } = useStore();
  const { focus } = data;
  useEffect(() => {
    const base = 'StudyLab';
    if (focus.startedAt === null) { document.title = base; return undefined; }
    const label = focus.phase === 'focus' ? 'Foco' : 'Pausa';
    const render = () => {
      const now = Date.now();
      const remaining = remainingMs(focus, now);
      document.title = `${label} ${formatClock(remaining ?? countedMs(focus, now))} · ${base}`;
    };
    render();
    const timer = window.setInterval(render, 1000);
    return () => { window.clearInterval(timer); document.title = base; };
  }, [focus]);
}

/**
 * Optional app-wide mount point (render once inside `<Store>`): keeps phases and simulations
 * finishing on time while the user is on any page. Pages also call the hook themselves.
 */
export function StudyWatchers(): null {
  useAutoCompletion();
  useTimerTitle();
  return null;
}
