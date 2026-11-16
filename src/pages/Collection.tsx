import { useState, type FormEvent } from 'react';
import { useStore } from '../context/Store';
import { type Data, type Item, type Kind } from '../models';
import { Markdown } from '../components/Markdown';
import { reviewCard } from '../domain/sm2';
import { evaluateQuestion } from '../domain/questions';
import { confirmAction } from '../components/Confirm';

const labels: Record<string, string> = {
  subjects: 'Disciplinas', topics: 'Tópicos e subtópicos', notes: 'Biblioteca', questions: 'Exercícios',
  cards: 'Flashcards', tasks: 'Tarefas', goals: 'Metas', exams: 'Provas',
};
const newItem = (): Item => ({ id: crypto.randomUUID(), title: '', createdAt: Date.now() });
const searchText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
function subjectTopics(data: Data, subjectId?: string) { return data.topics.filter(t => t.subjectId === subjectId); }
function topicPath(data: Data, id?: string): string {
  const result: string[] = []; const seen = new Set<string>();
  let topic = data.topics.find(t => t.id === id);
  while (topic && !seen.has(topic.id)) { seen.add(topic.id); result.unshift(topic.title); topic = data.topics.find(t => t.id === topic?.parentId); }
  return result.join(' › ');
}
export function removeItem(data: Data, kind: Kind, item: Item): Data {
  const next: Data = { ...data, [kind]: data[kind].filter(x => x.id !== item.id) };
  const deletedTopics = new Set<string>();
  if (kind === 'subjects') data.topics.filter(t => t.subjectId === item.id).forEach(t => deletedTopics.add(t.id));
  if (kind === 'topics') deletedTopics.add(item.id);
  let oldSize = -1;
  while (oldSize !== deletedTopics.size) {
    oldSize = deletedTopics.size;
    data.topics.forEach(t => { if (t.parentId && deletedTopics.has(t.parentId)) deletedTopics.add(t.id); });
  }
  if (deletedTopics.size) next.topics = next.topics.filter(t => !deletedTopics.has(t.id));
  // Historical attempts, sessions and reviews are preserved, with broken associations removed.
  for (const key of ['notes','questions','cards','tasks','goals','exams','sessions','attempts','simulations','reviews'] as Kind[]) {
    next[key] = next[key].map(record => {
      const copy = { ...record };
      if (kind === 'subjects' && copy.subjectId === item.id) { delete copy.subjectId; delete copy.topicId; }
      if (copy.topicId && deletedTopics.has(copy.topicId)) delete copy.topicId;
      if (kind === 'questions' && copy.questionId === item.id) delete copy.questionId;
      if (kind === 'cards' && copy.cardId === item.id) delete copy.cardId;
      if (kind === 'questions' && copy.questionIds?.includes(item.id)) {
        // Legacy simulations referenced live questions; preserve their content before detaching.
        if (!copy.snapshots && kind === 'questions' && key === 'simulations') {
          copy.snapshots = copy.questionIds.map(id => data.questions.find(q => q.id === id)).filter((q): q is Item => !!q && !!q.options?.length && !!q.answer && q.options.includes(q.answer)).map(q => ({
            id: q.id, title: q.title, body: q.body || '', options: q.options!, answer: q.answer!, explanation: q.explanation || '',
            subjectId: q.subjectId, topicId: q.topicId,
            subjectTitle: data.subjects.find(s => s.id === q.subjectId)?.title,
            topicTitle: topicPath(data, q.topicId), difficulty: q.difficulty,
          }));
        }
        copy.questionIds = copy.questionIds.filter(id => id !== item.id);
      }
      if (kind === 'notes' && copy.linkedNoteIds) copy.linkedNoteIds = copy.linkedNoteIds.filter(id => id !== item.id);
      return copy;
    });
  }
  if (kind === 'subjects' && next.focus.subjectId === item.id) next.focus = { ...next.focus, subjectId: '' };
  return next;
}

export function Collection({ kind }: { kind: Kind }) {
  const { data, update } = useStore();
  const [draft, setDraft] = useState<Item | null>(null);
  const [optionsText, setOptionsText] = useState('');
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [dueOnly, setDueOnly] = useState(false);
  const [response, setResponse] = useState<Record<string, string>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState('');
  const entries = data[kind].filter(item =>
    (!subject || item.subjectId === subject) && (!topic || item.topicId === topic) &&
    (!difficulty || item.difficulty === difficulty) && (!status || (item.status || 'pendente') === status) &&
    (!priority || (item.priority || 'média') === priority) &&
    (!dueOnly || !item.schedule || item.schedule.dueAt <= Date.now()) &&
    searchText(`${item.title} ${item.body || ''}`).includes(searchText(query)));
  const pending = data.cards.filter(card => !card.schedule || card.schedule.dueAt <= Date.now()).length;
  const field = (key: keyof Item, value: string) => setDraft(current => current ? { ...current, [key]: key === 'title' ? value : (value || undefined) } : current);
  function edit(item: Item) { setDraft(item); setOptionsText(item.options?.join('\n') || ''); setFeedback(''); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft || !draft.title.trim()) return;
    const item: Item = { ...draft, title: draft.title.trim() };
    if (kind === 'subjects' && !item.color) item.color = '#16745c';
    if (kind === 'cards' && !item.body?.trim()) {
      setFeedback('Preencha o verso do flashcard para poder revisá-lo.'); return;
    }
    if (kind === 'questions') {
      item.options = optionsText.split('\n').map(line => line.trim()).filter(Boolean);
      if (item.options.length && (item.options.length < 2 || !item.answer || !item.options.includes(item.answer) || new Set(item.options).size !== item.options.length)) {
        setFeedback('Informe pelo menos duas alternativas diferentes e uma resposta correta igual a uma delas.'); return;
      }
    }
    if (kind === 'goals' && (!item.period || !item.targetMinutes || item.targetMinutes < 1)) {
      setFeedback('Selecione o período e uma meta positiva em minutos.'); return;
    }
    if (await update(current => ({ ...current, [kind]: current[kind].some(x => x.id === item.id)
      ? current[kind].map(x => x.id === item.id ? item : x) : [...current[kind], item] }))) {
      setDraft(null); setFeedback('Salvo.');
    }
  }
  async function remove(item: Item) {
    const warning = kind === 'subjects' || kind === 'topics'
      ? 'Os vínculos serão removidos; tentativas e sessões serão preservadas. Subtópicos serão excluídos.'
      : 'O histórico será preservado quando aplicável.';
    if (!await confirmAction(`Excluir “${item.title}”? ${warning}`)) return;
    if (await update(current => removeItem(current, kind, item))) setFeedback('Registro excluído.');
  }
  async function answer(item: Item) {
    const value = response[item.id]?.trim();
    if (!value) { setFeedback('Informe uma resposta.'); return; }
    const result = evaluateQuestion(item, value);
    const attempt: Item = { ...newItem(), title: item.title, questionId: item.id, subjectId: item.subjectId,
      topicId: item.topicId, body: value, assessment: result ? 'objective' : 'pending', ...(result || {}) };
    if (await update(current => ({ ...current, attempts: [...current.attempts, attempt] }))) {
      setShown(current => ({ ...current, [item.id]: true }));
      setFeedback(result ? (result.score ? 'Resposta correta.' : 'Resposta incorreta.') : 'Resposta registrada; avalie-a manualmente no histórico.');
    }
  }
  async function assess(attempt: Item, correct: boolean) {
    if (await update(current => ({ ...current, attempts: current.attempts.map(a => a.id === attempt.id
      ? { ...a, assessment: 'manual', score: correct ? 1 : 0, total: 1 } : a) }))) setFeedback('Avaliação manual salva.');
  }
  async function grade(item: Item, quality: number) {
    const now = Date.now();
    if (await update(current => {
      const card = current.cards.find(x => x.id === item.id);
      if (!card) throw Error('Flashcard não existe mais');
      const schedule = reviewCard(card.schedule || { repetitions: 0, intervalDays: 0, easeFactor: 2.5, dueAt: 0 }, quality, now);
      const review: Item = { ...newItem(), title: card.title, createdAt: now, cardId: card.id, quality, subjectId: card.subjectId, topicId: card.topicId };
      return { ...current, cards: current.cards.map(x => x.id === card.id ? { ...x, schedule } : x), reviews: [...current.reviews, review] };
    })) {
      setShown(current => ({ ...current, [item.id]: false })); setFeedback('Revisão registrada.');
    }
  }
  const hasTopic = ['notes','questions','cards','tasks','goals','exams'].includes(kind);
  return <section>
    <div className="section-head"><div><h1>{labels[kind]}</h1><p>Organize seus estudos neste dispositivo.</p></div>
      <button onClick={() => edit(newItem())}>Adicionar</button></div>
    {kind === 'cards' && <p>{pending} cartão(ões) pendente(s) de revisão.</p>}
    {kind === 'tasks' && <details className="panel"><summary>Cronograma de prazos</summary>
      {[...data.tasks.map(item => ({ item, path: 'tasks', label: 'Tarefa' })), ...data.goals.map(item => ({ item, path: 'goals', label: 'Meta' })), ...data.exams.map(item => ({ item, path: 'exams', label: 'Prova' }))]
        .filter(entry => entry.item.due).sort((a, b) => a.item.due!.localeCompare(b.item.due!)).map(({ item, path, label }) =>
          <p key={item.id}>{item.due} · {label}: <a href={`#/${path}`}>{item.title}</a>{item.status !== 'concluído' && item.due! < localDay() ? ' · atrasado' : ''}</p>)}
      {!data.tasks.some(item => item.due) && !data.goals.some(item => item.due) && !data.exams.some(item => item.due) && <p>Adicione prazos para montar seu cronograma.</p>}
    </details>}
    <div className="filters">
      <label>Buscar<input value={query} onChange={e => setQuery(e.target.value)} /></label>
      {kind !== 'subjects' && <label>Disciplina<select value={subject} onChange={e => { setSubject(e.target.value); setTopic(''); }}>
        <option value="">Todas</option>{data.subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
      </select></label>}
      {hasTopic && <label>Assunto<select value={topic} onChange={e => setTopic(e.target.value)}><option value="">Todos</option>
        {data.topics.filter(t => !subject || t.subjectId === subject).map(t => <option key={t.id} value={t.id}>{topicPath(data, t.id)}</option>)}
      </select></label>}
      {kind === 'questions' && <label>Dificuldade<select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
        <option value="">Todas</option><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option>
      </select></label>}
      {['topics','tasks','goals','exams'].includes(kind) && <>
        <label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos</option><option>pendente</option><option>em andamento</option><option>concluído</option></select></label>
        <label>Prioridade<select value={priority} onChange={e => setPriority(e.target.value)}><option value="">Todas</option><option>baixa</option><option>média</option><option>alta</option></select></label>
      </>}
      {kind === 'cards' && <label className="option"><input type="checkbox" checked={dueOnly} onChange={e => setDueOnly(e.target.checked)} />Somente pendentes</label>}
    </div>
    {feedback && <p role="status">{feedback}</p>}
    {draft && <form className="panel form" onSubmit={submit}>
      <h2>{data[kind].some(x => x.id === draft.id) ? 'Editar' : 'Novo registro'}</h2>
      <label>Título<input autoFocus required maxLength={500} value={draft.title} onChange={e => field('title', e.target.value)} /></label>
      {kind !== 'subjects' && <label>Disciplina<select value={draft.subjectId || ''} onChange={e => setDraft({ ...draft, subjectId: e.target.value || undefined, topicId: undefined, parentId: undefined })}>
        <option value="">Sem disciplina</option>{data.subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
      </select></label>}
      {kind === 'topics' && <label>Tópico pai<select value={draft.parentId || ''} onChange={e => field('parentId', e.target.value)}>
        <option value="">Nenhum</option>{subjectTopics(data, draft.subjectId).filter(t => t.id !== draft.id).map(t => <option key={t.id} value={t.id}>{topicPath(data, t.id)}</option>)}
      </select></label>}
      {hasTopic && <label>Assunto<select value={draft.topicId || ''} onChange={e => field('topicId', e.target.value)}>
        <option value="">Sem assunto</option>{subjectTopics(data, draft.subjectId).map(t => <option key={t.id} value={t.id}>{topicPath(data, t.id)}</option>)}
      </select></label>}
      {['notes','questions','cards','tasks','goals','exams'].includes(kind) && <label>{kind === 'cards' ? 'Verso' : kind === 'questions' ? 'Enunciado' : 'Conteúdo'}
        <textarea value={draft.body || ''} onChange={e => field('body', e.target.value)} /></label>}
      {kind === 'notes' && <fieldset><legend>Notas relacionadas</legend>{data.notes.filter(n => n.id !== draft.id).map(note => <label className="option" key={note.id}>
        <input type="checkbox" checked={draft.linkedNoteIds?.includes(note.id) || false} onChange={e => setDraft({ ...draft,
          linkedNoteIds: e.target.checked ? [...(draft.linkedNoteIds || []), note.id] : (draft.linkedNoteIds || []).filter(id => id !== note.id) })} />{note.title}</label>)}</fieldset>}
      {kind === 'questions' && <>
        <label>Dificuldade<select value={draft.difficulty || ''} onChange={e => field('difficulty', e.target.value)}><option value="">Não definida</option><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option></select></label>
        <label>Alternativas (uma por linha; deixe vazio para discursiva)<textarea value={optionsText} onChange={e => setOptionsText(e.target.value)} /></label>
        <label>Resposta correta ou orientação<input value={draft.answer || ''} onChange={e => field('answer', e.target.value)} /></label>
        <label>Explicação<textarea value={draft.explanation || ''} onChange={e => field('explanation', e.target.value)} /></label>
      </>}
      {['topics','tasks','goals','exams'].includes(kind) && <>
        <label>Status<select value={draft.status || 'pendente'} onChange={e => field('status', e.target.value)}><option>pendente</option><option>em andamento</option><option>concluído</option></select></label>
        <label>Prioridade<select value={draft.priority || 'média'} onChange={e => field('priority', e.target.value)}><option>baixa</option><option>média</option><option>alta</option></select></label>
      </>}
      {['tasks','goals','exams'].includes(kind) && <label>Prazo<input type="date" value={draft.due || ''} onChange={e => field('due', e.target.value)} /></label>}
      {kind === 'goals' && <><label>Período<select required value={draft.period || ''} onChange={e => field('period', e.target.value)}><option value="">Selecione</option><option value="daily">Diário</option><option value="weekly">Semanal</option></select></label>
        <label>Meta em minutos<input required type="number" min="1" max="10080" value={draft.targetMinutes || ''} onChange={e => setDraft({ ...draft, targetMinutes: Number(e.target.value) })} /></label></>}
      {kind === 'subjects' && <><label>Cor<input type="color" value={draft.color || '#16745c'} onChange={e => field('color', e.target.value)} /></label>
        <label>Ícone<input maxLength={8} value={draft.icon || ''} onChange={e => field('icon', e.target.value)} /></label></>}
      <div className="actions"><button type="submit">Salvar</button><button type="button" className="secondary" onClick={() => setDraft(null)}>Cancelar</button></div>
    </form>}
    <div className="grid">{entries.map(item => {
      const relatedTopics = data.topics.filter(t => t.subjectId === item.id);
      const completed = relatedTopics.filter(t => t.status === 'concluído').length;
      const attempts = data.attempts.filter(a => a.questionId === item.id);
      return <article className="panel" id={`record-${item.id}`} key={item.id} style={kind === 'subjects' && item.color ? { borderInlineStart: `6px solid ${item.color}` } : undefined}>
        <h2>{item.icon} {item.title}</h2>
        <p className="muted">{data.subjects.find(s => s.id === item.subjectId)?.title} {item.topicId && ` · ${topicPath(data, item.topicId)}`} {kind === 'topics' && item.parentId && ` · ${topicPath(data, item.parentId)}`} {item.status} {item.priority} {item.due && ` · ${item.due}${item.status !== 'concluído' && item.due < localDay() ? ' · atrasado' : ''}`}</p>
        {kind === 'goals' && item.period && <p>Meta {item.period === 'daily' ? 'diária' : 'semanal'}: {item.targetMinutes} minutos</p>}
        {kind === 'subjects' && <div><p>Progresso: {completed}/{relatedTopics.length} tópicos concluídos {relatedTopics.length > 0 && `(${Math.round(100 * completed / relatedTopics.length)}%)`}</p>{relatedTopics.length > 0 && <progress className="progress" aria-label={`Progresso em ${item.title}`} value={completed} max={relatedTopics.length} />}</div>}
        {kind === 'notes' ? <><Markdown text={item.body || ''} />{item.linkedNoteIds?.length ? <div><p>Notas relacionadas:</p><div className="actions">{item.linkedNoteIds.map(id => {
          const note = data.notes.find(n => n.id === id);
          return note ? <button className="secondary" key={id} onClick={() => { setQuery(''); setSubject(''); setTopic(''); requestAnimationFrame(() => document.getElementById(`record-${id}`)?.scrollIntoView({ behavior: 'smooth' })); }}>{note.title}</button> : null;
        })}</div></div> : null}</> : kind !== 'cards' && item.body && <p>{item.body}</p>}
        {kind === 'cards' && <>
          <p>{item.schedule?.dueAt ? `Próxima revisão: ${new Date(item.schedule.dueAt).toLocaleDateString('pt-BR')}` : 'Ainda não revisado'}</p>
          <button className="secondary" onClick={() => setShown(current => ({ ...current, [item.id]: !current[item.id] }))}>Revelar resposta</button>
          {shown[item.id] && <><p>{item.body}</p><p>Como foi sua lembrança?</p><div className="actions">{['Não lembrei','Muito difícil','Difícil','Com esforço','Bem','Perfeitamente'].map((label, quality) => <button key={quality} onClick={() => grade(item, quality)}>{label}</button>)}</div></>}
        </>}
        {kind === 'questions' && <>
          <label>Resposta{item.options?.length ? <select value={response[item.id] || ''} onChange={e => setResponse(current => ({ ...current, [item.id]: e.target.value }))}>
            <option value="">Escolha</option>{item.options.map(option => <option key={option}>{option}</option>)}</select>
            : <textarea value={response[item.id] || ''} onChange={e => setResponse(current => ({ ...current, [item.id]: e.target.value }))} />}</label>
          <button onClick={() => answer(item)}>Registrar tentativa</button>
          {shown[item.id] && <p>Resposta: {item.answer || 'Revisão manual'}<br />{item.explanation}</p>}
          <details><summary>Histórico de tentativas ({attempts.length})</summary>{attempts.map(attempt => <div key={attempt.id}>
            <p>{new Date(attempt.createdAt).toLocaleString('pt-BR')} · {attempt.body} · {attempt.assessment === 'pending' ? 'Aguardando avaliação' : attempt.score ? 'Correta' : 'Incorreta'}</p>
            {attempt.assessment !== 'objective' && <div className="actions"><button onClick={() => assess(attempt, true)}>Marcar correta</button><button onClick={() => assess(attempt, false)}>Marcar incorreta</button></div>}
          </div>)}</details>
        </>}
        <div className="actions"><button className="secondary" onClick={() => edit(item)}>Editar</button><button className="secondary" onClick={() => remove(item)}>Excluir</button></div>
      </article>;
    })}</div>
    {!entries.length && <p className="empty">Nenhum registro encontrado. Adicione um ou ajuste os filtros.</p>}
    {kind === 'questions' && data.attempts.some(a => !a.questionId) && <details className="panel"><summary>Tentativas sem questão vinculada</summary>
      {data.attempts.filter(a => !a.questionId).map(a => <div key={a.id}><p>{a.title} · {new Date(a.createdAt).toLocaleString('pt-BR')} · {a.body} · {a.assessment === 'pending' ? 'Aguardando avaliação' : a.score ? 'Correta' : 'Incorreta'}</p>
        {a.assessment === 'pending' && <div className="actions"><button onClick={() => assess(a, true)}>Marcar correta</button><button onClick={() => assess(a, false)}>Marcar incorreta</button></div>}</div>)}
    </details>}
  </section>;
}
