import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/Store';
import { focusMs, todayRange } from '../../domain/analytics';
import {
  completePhase, countedMs, cycleNumber, elapsedMs, isIdle, isPhaseFinished, isRunning, pause,
  remainingMs, resetPhase, setSubject, startOrResume, switchMode, targetMs,
} from '../../domain/focus';
import type { FocusState } from '../../models';
import { Meter } from './charts';
import { formatClock, formatDateTime, formatDuration, newId, useNow } from './util';
import { useAutoCompletion, useTimerTitle } from './watchers';
import { confirmAction } from '../../components/Confirm';

const PHASE_LABEL: Record<FocusState['phase'], string> = { focus: 'Foco', shortBreak: 'Pausa curta', longBreak: 'Pausa longa' };
const HISTORY_LIMIT = 20;

export function Focus() {
  const { data, update } = useStore();
  const { focus, settings } = data;
  const running = isRunning(focus);
  const now = useNow(250, true);
  const [message, setMessage] = useState('');
  useAutoCompletion();
  useTimerTitle();

  const elapsed = elapsedMs(focus, now);
  const credited = countedMs(focus, now);
  const remaining = remainingMs(focus, now);
  const target = targetMs(focus);
  const isFocusPhase = focus.phase === 'focus';
  const finished = isPhaseFinished(focus, now);
  const subjectLocked = isFocusPhase && elapsed > 0;
  const todayMs = focusMs(data, todayRange(now));
  const sessions = [...data.sessions].sort((a, b) => b.createdAt - a.createdAt);
  const subjectTitle = (id?: string) => data.subjects.find(subject => subject.id === id)?.title ?? 'Sem disciplina';

  async function change(next: (old: typeof data) => typeof data, success = ''): Promise<void> {
    const ok = await update(next);
    setMessage(ok ? success : 'Não foi possível salvar a alteração. Tente novamente.');
  }

  const toggle = () => change(old => ({ ...old, focus: running ? pause(old.focus, Date.now()) : startOrResume(old.focus, old.settings, Date.now()) }));
  const registerNow = () => {
    const phaseId = focus.id;
    const id = newId();
    return change(old => completePhase(old, { expectedPhaseId: phaseId, now: Date.now(), newId: id, force: true }),
      isFocusPhase ? 'Sessão registrada.' : 'Pausa encerrada; foco pronto.');
  };
  const restart = async () => {
    if (elapsed > 0 && !await confirmAction('Descartar o tempo desta fase sem registrar?')) return;
    const id = newId();
    return change(old => ({ ...old, focus: resetPhase(old.focus, old.settings, id) }), 'Fase reiniciada.');
  };
  const chooseMode = async (mode: FocusState['mode']) => {
    if (mode === focus.mode) return;
    if (!isIdle(focus) && !await confirmAction('Trocar de modo descarta o tempo da fase atual. Continuar?')) return;
    const id = newId();
    return change(old => ({ ...old, focus: switchMode(old.focus, mode, old.settings, id) }));
  };

  const phaseText = focus.mode === 'stopwatch'
    ? 'Cronômetro livre'
    : `${PHASE_LABEL[focus.phase]}${isFocusPhase ? ` · ciclo ${cycleNumber(focus, settings)} de ${settings.pomodoro.cyclesBeforeLongBreak}` : ''}`;

  return (
    <section>
      <h1>Foco</h1>
      <p>O tempo é calculado por horários e continua correto em segundo plano ou após recarregar a página. Pausas não contam.</p>

      <div className="timer-tabs" role="group" aria-label="Modo do cronômetro">
        <button type="button" className={focus.mode === 'pomodoro' ? '' : 'secondary'} aria-pressed={focus.mode === 'pomodoro'} onClick={() => chooseMode('pomodoro')}>Pomodoro</button>
        <button type="button" className={focus.mode === 'stopwatch' ? '' : 'secondary'} aria-pressed={focus.mode === 'stopwatch'} onClick={() => chooseMode('stopwatch')}>Cronômetro livre</button>
      </div>

      <div className="panel focus">
        <p><strong>{phaseText}</strong></p>

        <label>Disciplina
          <select value={focus.subjectId} disabled={subjectLocked} onChange={event => { const value = event.target.value; void change(old => ({ ...old, focus: setSubject(old.focus, value) })); }}>
            <option value="">Sem disciplina</option>
            {data.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.title}</option>)}
          </select>
        </label>
        {subjectLocked && <p className="muted"><small>A disciplina fica travada enquanto há tempo contado nesta fase.</small></p>}

        <div className="clock" role="timer" aria-live="off" aria-label={remaining === null ? 'Tempo decorrido' : 'Tempo restante'}>
          {formatClock(remaining ?? elapsed)}
        </div>
        {target !== null && <Meter value={credited} max={target} label="Progresso da fase" text={`${formatDuration(credited)} de ${formatDuration(target)}`} />}

        {finished && (
          <p className="notice" role="status">
            {isFocusPhase ? 'Foco concluído. Registrando a sessão…' : 'Pausa concluída. Preparando o próximo foco…'}
          </p>
        )}
        {!finished && !isFocusPhase && isIdle(focus) && (
          <p className="notice" role="status">Foco registrado. A pausa está pronta e parada: inicie quando quiser.</p>
        )}

        <div className="actions">
          <button type="button" onClick={toggle}>{running ? 'Pausar' : elapsed > 0 ? 'Continuar' : 'Iniciar'}</button>
          {isFocusPhase
            ? <button type="button" className="secondary" disabled={credited < 1000} onClick={registerNow}>Registrar sessão</button>
            : <button type="button" className="secondary" onClick={registerNow}>Pular pausa</button>}
          <button type="button" className="secondary" disabled={elapsed === 0} onClick={restart}>Reiniciar fase</button>
        </div>
        <p role="status" className="muted">{message}</p>
        {focus.mode === 'pomodoro' && (
          <p className="muted"><small>
            Ao fim de cada foco registra-se no máximo a duração-alvo ({settings.pomodoro.focusMinutes} min); o tempo em que você ficou longe não é contado.
            Ajuste durações e metas em <Link to="/settings">Ajustes</Link>.
          </small></p>
        )}
        {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
          <button type="button" className="secondary" onClick={() => { void Notification.requestPermission().then(() => setMessage('Preferência de avisos atualizada.')); }}>Ativar avisos do navegador</button>
        )}
      </div>

      <p>Hoje: <strong>{formatDuration(todayMs)}</strong> de foco · meta diária {formatDuration(settings.dailyMinutes * 60_000)}.</p>

      <h2>Histórico</h2>
      {sessions.length === 0 ? <p className="empty">Nenhuma sessão registrada ainda.</p> : (
        <div className="history table-wrap">
          <table>
            <thead><tr><th scope="col">Término</th><th scope="col">Disciplina</th><th scope="col">Tipo</th><th scope="col">Duração</th></tr></thead>
            <tbody>
              {sessions.slice(0, HISTORY_LIMIT).map(session => (
                <tr key={session.id}>
                  <td>{formatDateTime(session.createdAt)}</td>
                  <td>{subjectTitle(session.subjectId)}</td>
                  <td>{session.title}</td>
                  <td>{formatDuration(session.duration ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length > HISTORY_LIMIT && <p className="muted"><small>Mostrando as {HISTORY_LIMIT} mais recentes de {sessions.length}.</small></p>}
        </div>
      )}
    </section>
  );
}
