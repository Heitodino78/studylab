import { emptyData, kinds, type Data, type Item, type QuestionSnapshot } from '../models';

const DB = 'studylab';
const STORE = 'state';
const KEY = 'data';
const MAX_TEXT = 100_000;
const itemKeys = ['id','title','subjectId','parentId','topicId','difficulty','questionId','assessment','cardId','quality','period','targetMinutes','linkedNoteIds','snapshots','responses','startedAt','body','status','priority','color','icon','due','options','answer','explanation','schedule','createdAt','duration','score','total','questionIds'];
const snapshotKeys = ['id','title','body','options','answer','explanation','subjectId','topicId','subjectTitle','topicTitle','difficulty'];
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function keys(value: unknown, required: string[], optional: string[] = []): asserts value is Record<string, unknown> {
  if (!isObject(value) || required.some(k => !(k in value)) || Object.keys(value).some(k => !required.includes(k) && !optional.includes(k))) throw Error('Campos inválidos');
}
function string(value: unknown, max = MAX_TEXT, allowEmpty = true): asserts value is string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) throw Error('Texto inválido');
}
function number(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER, integer = false): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw Error('Número inválido');
}
function choice(value: unknown, options: string[]) { if (typeof value !== 'string' || !options.includes(value)) throw Error('Opção inválida'); }
function strings(value: unknown, max = 1000): asserts value is string[] {
  if (!Array.isArray(value) || value.length > max) throw Error('Lista inválida');
  value.forEach(v => string(v, 10000));
}
function responses(value: unknown) {
  if (!isObject(value) || Object.keys(value).length > 1000) throw Error('Respostas inválidas');
  Object.entries(value).forEach(([k,v]) => { string(k, 500, false); string(v, 10000); });
}
function snapshot(value: unknown): asserts value is QuestionSnapshot {
  keys(value, ['id','title','body','options','answer','explanation'], snapshotKeys.slice(6));
  string(value.id, 500, false); string(value.title, 500, false); string(value.body); strings(value.options, 100);
  string(value.answer, 10000); string(value.explanation);
  if (!value.options.length || !value.options.includes(value.answer) || new Set(value.options).size !== value.options.length) throw Error('Questão de simulado inválida');
  for (const k of ['subjectId','topicId','subjectTitle','topicTitle']) if (value[k] !== undefined) string(value[k], 500);
  if (value.difficulty !== undefined) choice(value.difficulty, ['easy','medium','hard']);
}
function validateSettings(value: unknown) {
  keys(value, ['displayName','theme','dailyMinutes','weeklyMinutes','pomodoro']);
  string(value.displayName, 100); choice(value.theme, ['light','dark','system']);
  number(value.dailyMinutes, 1, 1440, true); number(value.weeklyMinutes, 1, 10080, true);
  keys(value.pomodoro, ['focusMinutes','shortBreakMinutes','longBreakMinutes','cyclesBeforeLongBreak']);
  for (const k of ['focusMinutes','shortBreakMinutes','longBreakMinutes']) number(value.pomodoro[k], 1, 240, true);
  number(value.pomodoro.cyclesBeforeLongBreak, 1, 20, true);
}
function validateFocus(value: unknown) {
  keys(value, ['id','mode','phase','startedAt','accumulatedMs','subjectId','cycle','durationMinutes']);
  string(value.id, 500, false); choice(value.mode, ['pomodoro','stopwatch']); choice(value.phase, ['focus','shortBreak','longBreak']);
  if (value.startedAt !== null) number(value.startedAt); number(value.accumulatedMs); string(value.subjectId, 500);
  number(value.cycle, 0, 100000, true); number(value.durationMinutes, 1, 240, true);
}
function validateRun(value: unknown) {
  if (value === null) return;
  keys(value, ['id','title','questions','answers','startedAt','deadline']);
  string(value.id, 500, false); string(value.title, 500, false);
  if (!Array.isArray(value.questions) || value.questions.length < 1 || value.questions.length > 1000) throw Error('Simulado inválido');
  value.questions.forEach(snapshot); responses(value.answers); number(value.startedAt);
  if (value.deadline !== null) { number(value.deadline); if (value.deadline < value.startedAt) throw Error('Prazo inválido'); }
  const ids = new Set(value.questions.map(q => q.id));
  if (ids.size !== value.questions.length || Object.keys(value.answers as object).some(id => !ids.has(id))) throw Error('Respostas de simulado inválidas');
  for (const question of value.questions) {
    const answer = (value.answers as Record<string, string>)[question.id];
    if (answer !== undefined && answer !== '' && !question.options.includes(answer)) throw Error('Alternativa de simulado inválida');
  }
}
function validateItem(value: unknown) {
  keys(value, ['id','title','createdAt'], itemKeys.filter(k => !['id','title','createdAt'].includes(k)));
  string(value.id, 500, false); string(value.title, 500, false); number(value.createdAt);
  for (const k of ['subjectId','parentId','topicId','questionId','cardId','body','color','icon','due','answer','explanation']) if (value[k] !== undefined) string(value[k]);
  for (const k of ['startedAt','duration','score','total','targetMinutes']) if (value[k] !== undefined) number(value[k]);
  if (value.targetMinutes !== undefined) number(value.targetMinutes, 1, 10080, true);
  if (value.quality !== undefined) number(value.quality, 0, 5, true);
  if (value.status !== undefined) choice(value.status, ['pendente','em andamento','concluído']);
  if (value.priority !== undefined) choice(value.priority, ['baixa','média','alta']);
  if (value.difficulty !== undefined) choice(value.difficulty, ['easy','medium','hard']);
  if (value.assessment !== undefined) choice(value.assessment, ['objective','manual','pending']);
  if (value.period !== undefined) choice(value.period, ['daily','weekly']);
  if (value.due !== undefined && value.due !== '') {
    const date = value.due as string;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw Error('Data inválida');
  }
  for (const k of ['options','questionIds','linkedNoteIds']) if (value[k] !== undefined) strings(value[k]);
  if (value.responses !== undefined) responses(value.responses);
  if (value.snapshots !== undefined) { if (!Array.isArray(value.snapshots) || value.snapshots.length > 1000) throw Error('Snapshots inválidos'); value.snapshots.forEach(snapshot); }
  if (value.schedule !== undefined) {
    keys(value.schedule, ['repetitions','intervalDays','easeFactor','dueAt']);
    number(value.schedule.repetitions, 0, 100000, true); number(value.schedule.intervalDays, 0, 100000, true);
    number(value.schedule.easeFactor, 1.3, 100); number(value.schedule.dueAt);
  }
  if (typeof value.score === 'number' && typeof value.total === 'number' && value.score > value.total) throw Error('Pontuação inválida');
}
export function validate(input: unknown): Data {
  keys(input, [...kinds, 'settings','focus','activeSimulation']);
  validateSettings(input.settings); validateFocus(input.focus); validateRun(input.activeSimulation);
  const ids = new Set<string>(); let count = 0;
  for (const kind of kinds) {
    const items = input[kind]; if (!Array.isArray(items)) throw Error('Coleção inválida');
    for (const item of items) { validateItem(item); const id = item.id as string; if (ids.has(id)) throw Error('ID duplicado'); ids.add(id); if (++count > 50000) throw Error('Limite de registros excedido'); }
  }
  const data = input as unknown as Data;
  const subjects = new Set(data.subjects.map(x => x.id));
  const topics = new Map(data.topics.map(x => [x.id,x]));
  const notes = new Set(data.notes.map(x => x.id));
  const questions = new Set(data.questions.map(x => x.id));
  const cards = new Set(data.cards.map(x => x.id));
  if (data.focus.subjectId && !subjects.has(data.focus.subjectId)) throw Error('Disciplina do foco inexistente');
  for (const kind of kinds) for (const item of data[kind]) {
    if (item.subjectId && !subjects.has(item.subjectId)) throw Error('Disciplina inexistente');
    if (item.topicId && (!topics.has(item.topicId) || topics.get(item.topicId)?.subjectId !== item.subjectId)) throw Error('Assunto inválido');
    if (item.parentId && (kind !== 'topics' || !topics.has(item.parentId) || item.parentId === item.id || topics.get(item.parentId)?.subjectId !== item.subjectId)) throw Error('Tópico pai inválido');
    if (item.linkedNoteIds?.some(id => !notes.has(id) || id === item.id)) throw Error('Nota vinculada inválida');
    if (item.questionId && !questions.has(item.questionId)) throw Error('Questão inexistente');
    if (item.cardId && !cards.has(item.cardId)) throw Error('Flashcard inexistente');
    if (item.questionIds?.some(id => !questions.has(id))) throw Error('Questão inexistente');
    const scoped: Array<[keyof Item, string[]]> = [
      ['parentId', ['topics']], ['schedule', ['cards']], ['cardId', ['reviews']],
      ['questionId', ['attempts']], ['quality', ['reviews']], ['assessment', ['attempts']],
      ['period', ['goals']], ['targetMinutes', ['goals']], ['linkedNoteIds', ['notes']],
      ['snapshots', ['simulations']], ['responses', ['simulations']], ['questionIds', ['simulations']],
      ['options', ['questions']], ['difficulty', ['questions', 'attempts']],
    ];
    if (item.snapshots) {
      const snapshotIds = new Set(item.snapshots.map(question => question.id));
      if (snapshotIds.size !== item.snapshots.length || (item.responses && Object.keys(item.responses).some(id => !snapshotIds.has(id)))) throw Error('Revisão de simulado inválida');
      for (const question of item.snapshots) {
        const answer = item.responses?.[question.id];
        if (answer !== undefined && answer !== '' && !question.options.includes(answer)) throw Error('Resposta de revisão inválida');
      }
    }
    for (const [field, allowed] of scoped) if (item[field] !== undefined && !allowed.includes(kind)) throw Error('Campo incompatível com a coleção');
    if (kind === 'questions' && item.options?.length && (!item.answer || !item.options.includes(item.answer) || new Set(item.options).size !== item.options.length)) throw Error('Alternativas inválidas');
  }
  for (const topic of data.topics) { const seen = new Set<string>(); let node: Item | undefined = topic; while (node?.parentId) { if (seen.has(node.id)) throw Error('Ciclo de tópicos'); seen.add(node.id); node = topics.get(node.parentId); } }
  return data;
}
export function migrate(input: unknown): Data {
  if (!isObject(input)) throw Error('Dados inválidos');
  if ('settings' in input) return validate(input);
  const oldKinds = kinds.filter(k => k !== 'reviews');
  keys(input, oldKinds);
  return validate({ ...emptyData(), ...input });
}
export function parseBackup(text: string): Data {
  if (text.length > 10_000_000) throw Error('Arquivo excede 10 MB');
  const value: unknown = JSON.parse(text); keys(value, ['version','data']);
  if (value.version === 1) return migrate(value.data);
  if (value.version === 2) return validate(value.data);
  throw Error('Versão de backup inválida');
}
export function exportBackup(data: Data): string { return JSON.stringify({ version: 2, data: validate(data) }, null, 2); }
function open(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => { const request = indexedDB.open(DB, 1); request.onupgradeneeded = () => request.result.createObjectStore(STORE); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); request.onblocked = () => reject(Error('Banco bloqueado por outra aba')); });
}
export async function load(): Promise<Data> {
  const db = await open();
  try { return await new Promise((resolve,reject) => { const tx = db.transaction(STORE, 'readonly'); const request = tx.objectStore(STORE).get(KEY); request.onsuccess = () => { try { resolve(request.result === undefined ? emptyData() : migrate(request.result)); } catch (error) { reject(error); } }; request.onerror = () => reject(request.error); tx.onabort = () => reject(tx.error); }); } finally { db.close(); }
}
export async function updateAtomic(fn: (old: Data) => Data): Promise<Data> {
  const db = await open();
  try { return await new Promise((resolve,reject) => {
    const tx = db.transaction(STORE, 'readwrite'); const store = tx.objectStore(STORE); const request = store.get(KEY); let next: Data; let failure: unknown;
    request.onsuccess = () => { try { next = validate(fn(request.result === undefined ? emptyData() : migrate(request.result))); store.put(next, KEY); } catch (error) { failure = error; tx.abort(); } };
    request.onerror = () => { failure = request.error; };
    tx.oncomplete = () => resolve(next); tx.onerror = () => reject(failure || tx.error); tx.onabort = () => reject(failure || tx.error || Error('Transação cancelada'));
  }); } finally { db.close(); }
}
export async function save(data: Data): Promise<void> { await updateAtomic(() => data); }
/** Retrieve an unvalidated record for recovery when the normal load fails. */
export async function exportRaw(): Promise<string> {
  const db = await open();
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.onabort = () => reject(tx.error);
    });
    return JSON.stringify({ exportedAt: new Date().toISOString(), data: value }, null, 2);
  } finally { db.close(); }
}
