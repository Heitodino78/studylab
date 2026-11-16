import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../context/Store';
import {
  cancelSimulation, clearAnswer, createRun, eligibleQuestions, finishSimulation, isExpired,
  recordAnswer, remainingMs, reviewSimulation, selectQuestions, startSimulation, type AnswerStatus, type Grade,
} from '../../domain/simulation';
import type { Difficulty, Item, SimulationRun } from '../../models';
import { formatClock, formatDate, formatDateTime, formatDuration, formatPercent, newId, plural, useNow } from './util';
import { useAutoCompletion } from './watchers';
import { confirmAction } from '../../components/Confirm';

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Fácil', medium: 'Média', hard: 'Difícil' };
const STATUS_LABEL: Record<AnswerStatus, string> = { correct: 'Correta', wrong: 'Errada', blank: 'Em branco' };
const HISTORY_PAGE = 10;

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter(entry => entry !== id) : [...list, id]);

export function Simulation() {
  const { data } = useStore();
  const run = data.activeSimulation;
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const previousRun = useRef<string | null>(null);
  useAutoCompletion();

  // When a run disappears and its result exists, show it (covers manual and automatic finish).
  useEffect(() => {
    const previous = previousRun.current;
    previousRun.current = run?.id ?? null;
    if (!previous || run) return;
    const result = data.simulations.find(item => item.id === `simulation-${previous}`);
    if (result) {
      setOpenId(result.id);
      setNotice(`Simulado concluído: ${result.score ?? 0} de ${result.total ?? 0} (${formatPercent((result.total ?? 0) > 0 ? (result.score ?? 0) / (result.total ?? 1) : null)}).`);
    }
  }, [run, data.simulations]);

  return (
    <section>
      <h1>Simulados</h1>
      <p>Monte provas com suas questões objetivas. O andamento é salvo: você pode recarregar a página e continuar de onde parou.</p>
      <p role="status">{notice}</p>
      {run ? <RunView run={run} /> : <Setup onStarted={() => setNotice('')} />}
      <History openId={openId} />
    </section>
  );
}

// ------------------------------------------------------------------------ setup

function Setup({ onStarted }: { onStarted: () => void }) {
  const { data, update } = useStore();
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [count, setCount] = useState('10');
  const [limited, setLimited] = useState(true);
  const [minutes, setMinutes] = useState('30');
  const [error, setError] = useState('');

  const visibleTopics = data.topics.filter(topic => subjectIds.length === 0 || (!!topic.subjectId && subjectIds.includes(topic.subjectId)));
  const depth = (topic: Item): number => {
    let level = 0;
    let node: Item | undefined = topic;
    while (node?.parentId && level < 10) { node = data.topics.find(candidate => candidate.id === node?.parentId); level++; }
    return level;
  };
  const pool = eligibleQuestions(data, { subjectIds, topicIds, difficulty });
  const totalObjective = eligibleQuestions(data, { subjectIds: [], topicIds: [], difficulty: '' }).length;

  function changeSubjects(id: string) {
    const next = toggle(subjectIds, id);
    setSubjectIds(next);
    // Drop topics that are no longer visible for the chosen subjects.
    setTopicIds(current => current.filter(topicId => {
      const topic = data.topics.find(candidate => candidate.id === topicId);
      return !!topic && (next.length === 0 || (!!topic.subjectId && next.includes(topic.subjectId)));
    }));
  }

  async function start() {
    setError('');
    const selection = selectQuestions(pool, Number(count));
    if (!selection.ok) { setError(selection.error); return; }
    let limit: number | null = null;
    if (limited) {
      limit = Number(minutes);
      if (!Number.isInteger(limit) || limit < 1 || limit > 240) { setError('Tempo limite: informe de 1 a 240 minutos ou marque “sem limite”.'); return; }
    }
    const startedAt = Date.now();
    const run = createRun({ id: newId(), title: `Simulado de ${formatDateTime(startedAt)}`, questions: selection.questions, data, now: startedAt, minutes: limit });
    const ok = await update(old => startSimulation(old, run));
    if (ok) onStarted(); else setError('Não foi possível iniciar o simulado. Tente novamente.');
  }

  if (totalObjective === 0) {
    return (
      <div className="panel">
        <p className="empty">Você ainda não tem questões objetivas válidas (com alternativas e resposta correta). Cadastre-as em Exercícios para montar um simulado.</p>
      </div>
    );
  }

  return (
    <form className="panel form" onSubmit={event => { event.preventDefault(); void start(); }}>
      <h2>Novo simulado</h2>

      <fieldset>
        <legend>Disciplinas (vazio = todas)</legend>
        {data.subjects.length === 0 && <p className="muted">Nenhuma disciplina cadastrada.</p>}
        {data.subjects.map(subject => (
          <label className="option" key={subject.id}>
            <input type="checkbox" checked={subjectIds.includes(subject.id)} onChange={() => changeSubjects(subject.id)} /> {subject.title}
          </label>
        ))}
      </fieldset>

      {visibleTopics.length > 0 && (
        <fieldset>
          <legend>Assuntos (vazio = todos; inclui subtópicos)</legend>
          {visibleTopics.map(topic => (
            <label className="option" key={topic.id} style={{ marginLeft: depth(topic) * 18 }}>
              <input type="checkbox" checked={topicIds.includes(topic.id)} onChange={() => setTopicIds(current => toggle(current, topic.id))} /> {topic.title}
            </label>
          ))}
        </fieldset>
      )}

      <label>Dificuldade
        <select value={difficulty} onChange={event => setDifficulty(event.target.value as Difficulty | '')}>
          <option value="">Qualquer</option>
          {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map(level => <option key={level} value={level}>{DIFFICULTY_LABEL[level]}</option>)}
        </select>
      </label>

      <label>Quantidade de questões (disponíveis: {pool.length})
        <input type="number" min="1" max={Math.max(1, pool.length)} value={count} onChange={event => setCount(event.target.value)} />
      </label>

      <label className="option">
        <input type="checkbox" checked={!limited} onChange={event => setLimited(!event.target.checked)} /> Sem limite de tempo
      </label>
      {limited && (
        <label>Tempo limite (min)
          <input type="number" min="1" max="240" value={minutes} onChange={event => setMinutes(event.target.value)} />
        </label>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button type="submit" disabled={pool.length === 0}>Iniciar simulado</button>
      </div>
      {pool.length === 0 && <p className="muted">Nenhuma questão objetiva corresponde a estes filtros.</p>}
    </form>
  );
}

// ---------------------------------------------------------------- running a run

function RunView({ run }: { run: SimulationRun }) {
  const { update } = useStore();
  const now = useNow(1000);
  const [error, setError] = useState('');
  const remaining = remainingMs(run, now);
  const expired = isExpired(run, now);
  const answered = Object.keys(run.answers).length;

  const answer = (questionId: string, value: string) =>
    update(old => recordAnswer(old, { runId: run.id, questionId, answer: value, now: Date.now() }));

  async function finish(skipConfirmation = false) {
    const blank = run.questions.length - answered;
    if (!skipConfirmation && blank > 0 && !await confirmAction(`Há ${blank} ${plural(blank, 'questão sem resposta', 'questões sem resposta')}. Finalizar mesmo assim?`)) return;
    const ok = await update(old => finishSimulation(old, { runId: run.id, now: Date.now() }));
    if (!ok) setError('Não foi possível registrar o resultado. Tente novamente; suas respostas continuam salvas.');
  }

  async function cancel() {
    if (!await confirmAction('Cancelar o simulado em andamento? As respostas serão descartadas e nada será registrado.')) return;
    await update(old => cancelSimulation(old, run.id));
  }

  return (
    <div>
      <div className="panel">
        <h2>{run.title}</h2>
        <p>
          Respondidas: <strong>{answered}/{run.questions.length}</strong>
          {remaining !== null && <> · Tempo restante: <strong role="timer" aria-live="off">{formatClock(remaining)}</strong></>}
          {remaining === null && <> · Sem limite de tempo</>}
        </p>
        {expired && <p className="notice" role="status">Tempo esgotado. O resultado está sendo registrado; novas respostas não são aceitas.</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>

      {run.questions.map((question, index) => (
        <fieldset className="panel" key={question.id} disabled={expired}>
          <legend>Questão {index + 1} de {run.questions.length}{question.subjectTitle ? ` · ${question.subjectTitle}` : ''}{question.topicTitle ? ` › ${question.topicTitle}` : ''}</legend>
          <h3>{question.title}</h3>
          {question.body && <p style={{ whiteSpace: 'pre-wrap' }}>{question.body}</p>}
          {question.options.map(option => (
            <label className="option" key={option}>
              <input type="radio" name={`q-${question.id}`} checked={run.answers[question.id] === option} onChange={() => { void answer(question.id, option); }} /> {option}
            </label>
          ))}
          {run.answers[question.id] !== undefined && !expired && (
            <button type="button" className="secondary" onClick={() => { void update(old => clearAnswer(old, { runId: run.id, questionId: question.id, now: Date.now() })); }}>Limpar resposta</button>
          )}
        </fieldset>
      ))}

      <div className="actions">
        <button type="button" onClick={() => { void finish(expired); }}>{expired ? 'Registrar resultado' : 'Finalizar e ver resultado'}</button>
        <button type="button" className="secondary" onClick={() => { void cancel(); }}>Cancelar simulado</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------- history

function Review({ grade }: { grade: Grade }) {
  return (
    <ol className="list">
      {grade.rows.map(({ snapshot, response, status }) => (
        <li key={snapshot.id} className="panel">
          <h4>{snapshot.title}</h4>
          <p className="muted"><small>
            {[snapshot.subjectTitle, snapshot.topicTitle, snapshot.difficulty ? DIFFICULTY_LABEL[snapshot.difficulty] : ''].filter(Boolean).join(' · ')}
          </small></p>
          {snapshot.body && <p style={{ whiteSpace: 'pre-wrap' }}>{snapshot.body}</p>}
          <p><strong>{STATUS_LABEL[status]}</strong> · Sua resposta: {response || 'não respondida'}</p>
          <ul>
            {snapshot.options.map(option => (
              <li key={option}>
                {option}
                {option === snapshot.answer && <strong> — resposta correta</strong>}
                {option === response && option !== snapshot.answer && <em> — sua resposta</em>}
              </li>
            ))}
          </ul>
          {snapshot.explanation && <p><strong>Explicação:</strong> {snapshot.explanation}</p>}
        </li>
      ))}
    </ol>
  );
}

function History({ openId }: { openId: string | null }) {
  const { data } = useStore();
  const [visible, setVisible] = useState(HISTORY_PAGE);
  const items = [...data.simulations].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="history">
      <h2>Histórico e revisão</h2>
      {items.length === 0 ? <p className="empty">Nenhum simulado concluído ainda.</p> : items.slice(0, visible).map(item => {
        const grade = reviewSimulation(item);
        const total = item.total ?? 0;
        const score = item.score ?? 0;
        return (
          <details className="panel" key={item.id} open={openId === item.id ? true : undefined}>
            <summary>
              {formatDate(item.createdAt)} · <strong>{score}/{total}</strong> ({formatPercent(total > 0 ? score / total : null)}) · {formatDuration(item.duration ?? 0)} · {item.title}
            </summary>
            {grade
              ? <Review grade={grade} />
              : <p className="muted">Registro sem cópia das questões; a revisão detalhada não está disponível.</p>}
          </details>
        );
      })}
      {items.length > visible && <button type="button" className="secondary" onClick={() => setVisible(current => current + HISTORY_PAGE)}>Mostrar mais</button>}
    </div>
  );
}
