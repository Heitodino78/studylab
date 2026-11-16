import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/Store';
import {
  accuracyBySubject, activeDays, currentStreak, exerciseSummary, focusMs, focusSeries, lastDays,
  recommendations, reviewSummary, timeBySubject, topicErrors,
} from '../../domain/analytics';
import { BarChart, Meter } from './charts';
import { formatDuration, formatPercent, plural, useNow } from './util';

const RANGES = [7, 30, 90] as const;

export function Statistics() {
  const { data } = useStore();
  const now = useNow(60_000);
  const [days, setDays] = useState<number>(30);
  const range = lastDays(now, days);

  const totalMs = focusMs(data, range);
  const sessions = data.sessions.filter(session => session.createdAt >= range.from && session.createdAt < range.to).length;
  const bySubject = timeBySubject(data, range);
  const exercises = exerciseSummary(data, range);
  const subjectAccuracy = accuracyBySubject(data, range);
  const topics = topicErrors(data, range);
  const reviews = reviewSummary(data, now, range);
  const advice = recommendations(data, now);
  const active = activeDays(data, range);
  const hasAnything = data.sessions.length + data.attempts.length + data.reviews.length > 0;

  return (
    <section>
      <div className="section-head">
        <div>
          <h1>Estatísticas</h1>
          <p>Calculadas apenas com sessões, tentativas e revisões que você registrou.</p>
        </div>
        <label>Período
          <select value={days} onChange={event => setDays(Number(event.target.value))}>
            {RANGES.map(value => <option key={value} value={value}>Últimos {value} dias</option>)}
          </select>
        </label>
      </div>

      {!hasAnything && (
        <div className="notice" role="status">Ainda não há atividade registrada. Use <Link to="/focus">Foco</Link>, <Link to="/questions">exercícios</Link> ou <Link to="/cards">flashcards</Link> para gerar estatísticas.</div>
      )}

      <div className="stats-grid grid">
        <article className="panel"><p>Tempo de foco</p><strong className="metric">{formatDuration(totalMs)}</strong><small className="muted">{sessions} {plural(sessions, 'sessão', 'sessões')}</small></article>
        <article className="panel"><p>Dias com atividade</p><strong className="metric">{active}/{days}</strong><small className="muted">Sequência atual: {currentStreak(data, now)} {plural(currentStreak(data, now), 'dia', 'dias')}</small></article>
        <article className="panel"><p>Taxa de acerto</p><strong className="metric">{formatPercent(exercises.rate)}</strong><small className="muted">{exercises.evaluated} {plural(exercises.evaluated, 'resposta avaliada', 'respostas avaliadas')}{exercises.pending ? ` · ${exercises.pending} a corrigir` : ''}</small></article>
        <article className="panel"><p>Revisões</p><strong className="metric">{reviews.reviews}</strong><small className="muted">{reviews.lapses} com falha (nota &lt; 3){reviews.averageQuality !== null ? ` · média ${reviews.averageQuality.toFixed(1)}` : ''}</small></article>
      </div>

      <section className="panel" aria-labelledby="series-title">
        <h2 id="series-title">Foco ao longo do tempo</h2>
        <BarChart points={focusSeries(data, now, days)} title={`Minutos de foco, últimos ${days} dias${days > 31 ? ' (por semana)' : ' (por dia)'}`} empty="Nenhum foco registrado neste período." />
      </section>

      <div className="two-columns">
        <section className="panel" aria-labelledby="subject-time-title">
          <h2 id="subject-time-title">Tempo por disciplina</h2>
          {bySubject.length === 0 ? <p className="empty">Nenhuma sessão neste período.</p> : (
            <ul className="list">
              {bySubject.map(row => (
                <li key={row.subjectId || 'none'}>
                  <strong>{row.title}</strong>
                  <Meter value={row.ms} max={bySubject[0].ms} label={`Tempo em ${row.title}`} text={`${formatDuration(row.ms)} (${Math.round((row.ms / totalMs) * 100)}% do total)`} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel" aria-labelledby="accuracy-title">
          <h2 id="accuracy-title">Exercícios por disciplina</h2>
          {subjectAccuracy.length === 0 ? <p className="empty">Nenhuma resposta avaliada neste período. Discursivas só entram após a autocorreção.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th scope="col">Disciplina</th><th scope="col">Acertos</th><th scope="col">Taxa</th></tr></thead>
                <tbody>{subjectAccuracy.map(row => <tr key={row.id}><th scope="row">{row.title}</th><td>{row.correct}/{row.evaluated}</td><td>{formatPercent(row.rate)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="two-columns">
        <section className="panel" aria-labelledby="topics-title">
          <h2 id="topics-title">Assuntos com erros</h2>
          {topics.length === 0 ? <p className="empty">Nenhum erro associado a assuntos neste período.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th scope="col">Assunto</th><th scope="col">Erros</th><th scope="col">Taxa</th></tr></thead>
                <tbody>{topics.slice(0, 10).map(row => <tr key={row.id}><th scope="row">{row.title}{row.subtitle && <small className="muted"> · {row.subtitle}</small>}</th><td>{row.errors}</td><td>{formatPercent(row.rate)} ({row.correct}/{row.evaluated})</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel" aria-labelledby="review-title">
          <h2 id="review-title">Flashcards</h2>
          <ul className="list">
            <li>Revisões no período: <strong>{reviews.reviews}</strong></li>
            <li>Cards novos (nunca revisados): <strong>{reviews.newCards}</strong></li>
            <li>Cards com revisão vencida: <strong>{reviews.dueCards}</strong></li>
          </ul>
          {reviews.pendingCards > 0 && <p><Link to="/cards">Revisar agora</Link></p>}
        </section>
      </div>

      <section className="panel" aria-labelledby="advice-title">
        <h2 id="advice-title">Recomendações</h2>
        <p className="muted">Regras fixas e explicáveis, sem IA. Cada item mostra a regra que o gerou.</p>
        {advice.length === 0 ? <p className="empty">Nenhuma recomendação: não há pendências nem dados suficientes para apontar pontos fracos (mínimo de 3 respostas avaliadas por assunto).</p> : (
          <ol className="list">
            {advice.map(item => (
              <li key={item.id}>
                <Link to={item.to}>{item.text}</Link>
                <br /><small className="muted">Regra: {item.rule}</small>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
