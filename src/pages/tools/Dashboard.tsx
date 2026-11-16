import { Link } from 'react-router-dom';
import { useStore } from '../../context/Store';
import {
  deadlines, exerciseSummary, focusMs, focusSeries, goalProgress, lastDays, recentSubjects,
  recommendations, reviewSummary, todayRange, weekRange, currentStreak, type Deadline,
} from '../../domain/analytics';
import { isRunning, elapsedMs } from '../../domain/focus';
import { BarChart, Meter } from './charts';
import { formatDate, formatDuration, formatDue, formatLongDate, formatPercent, plural, useNow } from './util';

const KIND_LABEL: Record<Deadline['kind'], string> = { tasks: 'Tarefa', exams: 'Prova', goals: 'Meta' };

function dueText(entry: Deadline): string {
  if (entry.state === 'overdue') return `Atrasada há ${-entry.daysLeft} ${plural(-entry.daysLeft, 'dia', 'dias')}`;
  if (entry.state === 'today') return 'Hoje';
  return `Em ${entry.daysLeft} ${plural(entry.daysLeft, 'dia', 'dias')}`;
}

export function Dashboard() {
  const { data } = useStore();
  const now = useNow(30_000);
  const name = data.settings.displayName.trim();

  const todayMs = focusMs(data, todayRange(now));
  const weekMs = focusMs(data, weekRange(now));
  const dailyGoalMs = data.settings.dailyMinutes * 60_000;
  const weeklyGoalMs = data.settings.weeklyMinutes * 60_000;
  const reviews = reviewSummary(data, now, lastDays(now, 7));
  const exercises = exerciseSummary(data, lastDays(now, 7));
  const goals = goalProgress(data, now);
  const upcoming = deadlines(data, now, 7).slice(0, 6);
  const recent = recentSubjects(data, now, 4);
  const next = recommendations(data, now)[0];
  const streak = currentStreak(data, now);
  const pendingSimulation = data.activeSimulation;
  const timerInUse = isRunning(data.focus) || elapsedMs(data.focus, now) > 0;
  const isNew = data.subjects.length === 0 && data.sessions.length === 0 && data.attempts.length === 0;

  return (
    <section className="dashboard">
      <header className="hero">
        <p className="eyebrow">{formatLongDate(now)}</p>
        <h1>{name ? `Olá, ${name}` : 'Seu espaço de estudo'}</h1>
        <p>
          {isNew ? 'Ainda não há registros. Os números abaixo aparecem conforme você estuda.' : 'Um resumo do que você realmente registrou.'}
          {!name && <> <Link to="/settings">Definir seu nome</Link>.</>}
        </p>
      </header>

      {(timerInUse || pendingSimulation) && (
        <div className="notice" role="status">
          {timerInUse && <p>Há um {data.focus.mode === 'pomodoro' ? 'Pomodoro' : 'cronômetro'} em andamento. <Link to="/focus">Voltar ao foco</Link></p>}
          {pendingSimulation && <p>Simulado “{pendingSimulation.title}” em andamento. <Link to="/simulations">Retomar</Link></p>}
        </div>
      )}

      {isNew && (
        <div className="panel">
          <h2>Primeiros passos</h2>
          <ol>
            <li><Link to="/subjects">Cadastre uma disciplina</Link> e seus tópicos.</li>
            <li>Guarde conteúdo na <Link to="/notes">Biblioteca</Link>, em <Link to="/questions">exercícios</Link> e <Link to="/cards">flashcards</Link>.</li>
            <li>Use o <Link to="/focus">Foco</Link> para registrar tempo de estudo.</li>
          </ol>
        </div>
      )}

      <div className="stats-grid grid">
        <article className="panel">
          <p>Foco hoje</p>
          <strong className="metric">{formatDuration(todayMs)}</strong>
          <Meter value={todayMs} max={dailyGoalMs} label="Meta diária de foco" text={`Meta diária: ${formatDuration(dailyGoalMs)}`} />
        </article>
        <article className="panel">
          <p>Foco na semana</p>
          <strong className="metric">{formatDuration(weekMs)}</strong>
          <Meter value={weekMs} max={weeklyGoalMs} label="Meta semanal de foco" text={`Meta semanal: ${formatDuration(weeklyGoalMs)}`} />
        </article>
        <article className="panel">
          <p>Revisões pendentes</p>
          <strong className="metric">{reviews.pendingCards}</strong>
          <small className="muted">
            {reviews.pendingCards ? <><Link to="/cards">Abrir flashcards</Link> · {reviews.newCards} novos, {reviews.dueCards} vencidos</> : 'Nenhum card para revisar agora.'}
          </small>
        </article>
        <article className="panel">
          <p>Exercícios (7 dias)</p>
          <strong className="metric">{formatPercent(exercises.rate)}</strong>
          <small className="muted">
            {exercises.attempts === 0 ? 'Nenhuma tentativa no período.' : `${exercises.correct} de ${exercises.evaluated} corretas · ${exercises.attempts} ${plural(exercises.attempts, 'tentativa', 'tentativas')}`}
            {exercises.pending > 0 && <> · <Link to="/questions">{exercises.pending} a corrigir</Link></>}
          </small>
        </article>
      </div>

      <div className="two-columns">
        <section className="panel" aria-labelledby="next-title">
          <h2 id="next-title">Próximo estudo</h2>
          {next ? (
            <>
              <p><Link to={next.to}>{next.text}</Link></p>
              <p className="muted"><small>Regra: {next.rule}</small></p>
            </>
          ) : (
            <p className="empty">Sem sugestões: ainda não há dados suficientes ou nada está pendente.</p>
          )}
          <p className="muted"><small>{streak > 0 ? `Sequência: ${streak} ${plural(streak, 'dia', 'dias')} seguidos com atividade.` : 'Sem sequência ativa.'} <Link to="/statistics">Ver estatísticas</Link></small></p>
        </section>

        <section className="panel" aria-labelledby="goals-title">
          <div className="section-head"><h2 id="goals-title">Metas</h2><Link to="/goals">Gerenciar</Link></div>
          {goals.length === 0 ? (
            <p className="empty">Nenhuma meta com período e minutos-alvo. Crie em <Link to="/goals">Metas</Link>.</p>
          ) : (
            <ul className="list">
              {goals.map(entry => (
                <li key={entry.goal.id}>
                  <strong>{entry.goal.title}</strong> <span className="pill">{entry.goal.period === 'daily' ? 'Diária' : 'Semanal'}</span>
                  <Meter value={entry.doneMs} max={entry.targetMs} label={`Progresso de ${entry.goal.title}`} text={`${formatDuration(entry.doneMs)} de ${formatDuration(entry.targetMs)} (${Math.round(entry.ratio * 100)}%)`} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel" aria-labelledby="chart-title">
        <h2 id="chart-title">Foco nos últimos 7 dias</h2>
        <BarChart points={focusSeries(data, now, 7)} title="Minutos de foco por dia nos últimos 7 dias" empty="Nenhum foco registrado nos últimos 7 dias." />
      </section>

      <div className="two-columns">
        <section className="panel" aria-labelledby="deadlines-title">
          <h2 id="deadlines-title">Prazos próximos</h2>
          {upcoming.length === 0 ? (
            <p className="empty">Nenhum prazo atrasado ou nos próximos 7 dias.</p>
          ) : (
            <ul className="list">
              {upcoming.map(entry => (
                <li key={`${entry.kind}-${entry.item.id}`} className="row">
                  <Link to={`/${entry.kind}`}>{entry.item.title}</Link>{' '}
                  <span className="pill">{KIND_LABEL[entry.kind]}</span>{' '}
                  <small className={entry.state === 'overdue' ? 'danger-text' : 'muted'}>{dueText(entry)} · {formatDue(entry.item.due ?? '')}</small>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel" aria-labelledby="recent-title">
          <div className="section-head"><h2 id="recent-title">Matérias recentes</h2><Link to="/subjects">Ver todas</Link></div>
          {recent.length === 0 ? (
            <p className="empty">Nenhuma disciplina cadastrada.</p>
          ) : (
            <ul className="list">
              {recent.map(({ subject, lastAt, weekMs: subjectWeek }) => (
                <li key={subject.id} className="row">
                  <strong>{subject.icon} {subject.title}</strong>{' '}
                  <small className="muted">{lastAt ? `Última atividade: ${formatDate(lastAt)}` : 'Sem atividade ainda'} · {formatDuration(subjectWeek)} na semana</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
