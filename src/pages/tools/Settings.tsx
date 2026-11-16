import { useEffect, useState, type FormEvent } from 'react';
import { useStore } from '../../context/Store';
import { validatePreferences, type PreferenceErrors } from '../../domain/focus';
import { emptyData, kinds, type Data, type Kind, type Preferences } from '../../models';
import { exportBackup, exportRaw, parseBackup } from '../../storage';
import { confirmAction } from '../../components/Confirm';
import { downloadText, formatDateTime, todayStamp } from './util';

const MAX_BACKUP_BYTES = 10_000_000;

const KIND_LABEL: Record<Kind, string> = {
  subjects: 'Disciplinas', topics: 'Tópicos', notes: 'Notas', questions: 'Questões', cards: 'Flashcards', tasks: 'Tarefas',
  goals: 'Metas', exams: 'Provas', sessions: 'Sessões de foco', attempts: 'Tentativas', simulations: 'Simulados', reviews: 'Revisões',
};

/** The form keeps text so the user can clear a field while typing; numbers are parsed on save. */
interface Form {
  displayName: string; theme: Preferences['theme'];
  dailyMinutes: string; weeklyMinutes: string;
  focusMinutes: string; shortBreakMinutes: string; longBreakMinutes: string; cyclesBeforeLongBreak: string;
}

const toForm = (p: Preferences): Form => ({
  displayName: p.displayName, theme: p.theme, dailyMinutes: String(p.dailyMinutes), weeklyMinutes: String(p.weeklyMinutes),
  focusMinutes: String(p.pomodoro.focusMinutes), shortBreakMinutes: String(p.pomodoro.shortBreakMinutes),
  longBreakMinutes: String(p.pomodoro.longBreakMinutes), cyclesBeforeLongBreak: String(p.pomodoro.cyclesBeforeLongBreak),
});

const toPreferences = (f: Form): Preferences => ({
  displayName: f.displayName.trim(), theme: f.theme, dailyMinutes: Number(f.dailyMinutes), weeklyMinutes: Number(f.weeklyMinutes),
  pomodoro: {
    focusMinutes: Number(f.focusMinutes), shortBreakMinutes: Number(f.shortBreakMinutes),
    longBreakMinutes: Number(f.longBreakMinutes), cyclesBeforeLongBreak: Number(f.cyclesBeforeLongBreak),
  },
});

function NumberField({ id, label, value, error, onChange }: { id: keyof Form; label: string; value: string; error?: string; onChange: (value: string) => void }) {
  return (
    <label>{label}
      <input type="number" inputMode="numeric" value={value} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} onChange={event => onChange(event.target.value)} />
      {error && <small id={`${id}-error`} className="error" role="alert">{error}</small>}
    </label>
  );
}

function summarize(data: Data): { kind: Kind; count: number }[] {
  return kinds.map(kind => ({ kind, count: data[kind].length })).filter(row => row.count > 0);
}

export function Settings() {
  const { data, update, error } = useStore();
  const settingsKey = JSON.stringify(data.settings);
  const [form, setForm] = useState<Form>(() => toForm(data.settings));
  const [errors, setErrors] = useState<PreferenceErrors>({});
  const [saved, setSaved] = useState('');
  const [message, setMessage] = useState('');
  const [incoming, setIncoming] = useState<{ data: Data; name: string } | null>(null);
  const [storage, setStorage] = useState<{ persisted: boolean | null; usage: number | null; quota: number | null }>({ persisted: null, usage: null, quota: null });
  const loadFailed = error.startsWith('Não foi possível abrir os dados');

  useEffect(() => { setForm(toForm(data.settings)); setErrors({}); }, [settingsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let active = true;
    const manager = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!manager) return undefined;
    void Promise.all([manager.persisted?.().catch(() => null), manager.estimate?.().catch(() => null)]).then(([persisted, estimate]) => {
      if (active) setStorage({ persisted: persisted ?? null, usage: estimate?.usage ?? null, quota: estimate?.quota ?? null });
    });
    return () => { active = false; };
  }, []);

  function setField<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(current => ({ ...current, [key]: value }));
    setSaved('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const preferences = toPreferences(form);
    const found = validatePreferences(preferences);
    setErrors(found);
    if (Object.keys(found).length) { setSaved(''); return; }
    const ok = await update(old => ({ ...old, settings: preferences }));
    setSaved(ok ? 'Preferências salvas.' : 'Não foi possível salvar as preferências.');
  }

  function exportCurrent() {
    try {
      downloadText(`studylab-backup-${todayStamp()}.json`, exportBackup(data));
      setMessage('Backup exportado (versão 2, com preferências, foco e simulado em andamento).');
    } catch (reason) {
      setMessage(`Não foi possível exportar: ${String(reason)}`);
    }
  }

  async function exportRecovery() {
    try {
      downloadText(`studylab-dados-brutos-${todayStamp()}.json`, await exportRaw());
      setMessage('Dados brutos exportados para diagnóstico/recuperação.');
    } catch (reason) {
      setMessage(`Não foi possível ler os dados brutos: ${String(reason)}`);
    }
  }

  async function chooseFile(file?: File) {
    setIncoming(null);
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw Error('Arquivo excede 10 MB.');
      // Validation happens here, before any confirmation or replacement.
      setIncoming({ data: parseBackup(await file.text()), name: file.name });
      setMessage('');
    } catch (reason) {
      setMessage(`Backup rejeitado, nada foi alterado: ${String(reason)}`);
    }
  }

  async function replaceAll() {
    if (!incoming) return;
    if (!await confirmAction('Substituir TODOS os dados atuais pelo conteúdo deste backup? Isso não pode ser desfeito.')) return;
    const next = incoming.data;
    const ok = await update(() => next);
    setMessage(ok ? 'Backup restaurado.' : 'Não foi possível restaurar o backup.');
    if (ok) setIncoming(null);
  }

  async function clearAll() {
    if (!await confirmAction('Excluir TODOS os dados deste navegador? Exporte um backup antes se quiser guardá-los. Esta ação não pode ser desfeita.')) return;
    const ok = await update(() => emptyData());
    setMessage(ok ? 'Todos os dados foram excluídos.' : 'Não foi possível excluir os dados.');
  }

  async function requestPersistence() {
    try {
      const granted = await navigator.storage.persist();
      setStorage(current => ({ ...current, persisted: granted }));
      setMessage(granted ? 'Armazenamento persistente concedido.' : 'O navegador não concedeu armazenamento persistente.');
    } catch {
      setMessage('Este navegador não permite solicitar armazenamento persistente.');
    }
  }

  const megabytes = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`;

  return (
    <section>
      <h1>Ajustes</h1>

      {loadFailed && (
        <div className="panel error" role="alert">
          <h2>Não foi possível ler seus dados</h2>
          <p>Nenhuma alteração será gravada para não sobrescrever o que existe. Exporte os dados brutos antes de qualquer outra ação.</p>
          <button type="button" onClick={exportRecovery}>Exportar dados brutos</button>
        </div>
      )}

      <form className="panel form" onSubmit={save} noValidate>
        <h2>Perfil e metas</h2>
        <label>Seu nome (opcional)
          <input maxLength={60} value={form.displayName} aria-invalid={errors.displayName ? true : undefined} onChange={event => setField('displayName', event.target.value)} />
          {errors.displayName && <small className="error" role="alert">{errors.displayName}</small>}
        </label>
        <label>Aparência
          <select value={form.theme} onChange={event => setField('theme', event.target.value as Preferences['theme'])}>
            <option value="system">Seguir o sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </label>
        <NumberField id="dailyMinutes" label="Meta diária de foco (min)" value={form.dailyMinutes} error={errors.dailyMinutes} onChange={value => setField('dailyMinutes', value)} />
        <NumberField id="weeklyMinutes" label="Meta semanal de foco (min)" value={form.weeklyMinutes} error={errors.weeklyMinutes} onChange={value => setField('weeklyMinutes', value)} />

        <h2>Pomodoro</h2>
        <NumberField id="focusMinutes" label="Foco (min)" value={form.focusMinutes} error={errors.focusMinutes} onChange={value => setField('focusMinutes', value)} />
        <NumberField id="shortBreakMinutes" label="Pausa curta (min)" value={form.shortBreakMinutes} error={errors.shortBreakMinutes} onChange={value => setField('shortBreakMinutes', value)} />
        <NumberField id="longBreakMinutes" label="Pausa longa (min)" value={form.longBreakMinutes} error={errors.longBreakMinutes} onChange={value => setField('longBreakMinutes', value)} />
        <NumberField id="cyclesBeforeLongBreak" label="Ciclos de foco até a pausa longa" value={form.cyclesBeforeLongBreak} error={errors.cyclesBeforeLongBreak} onChange={value => setField('cyclesBeforeLongBreak', value)} />
        <p className="muted"><small>Novas durações valem a partir da próxima fase; a fase em andamento não muda.</small></p>
        <div className="actions"><button type="submit">Salvar preferências</button></div>
        <p role="status">{saved}</p>
      </form>

      <div className="panel">
        <h2>Seus dados</h2>
        <p className="notice">
          Os dados ficam apenas neste navegador e neste perfil. Não há conta nem sincronização: limpar os dados do site,
          usar janela privada/anônima ou trocar de navegador/dispositivo faz tudo desaparecer. Exporte backups com frequência.
        </p>
        <p className="muted">
          Armazenamento persistente: {storage.persisted === null ? 'indisponível neste navegador' : storage.persisted ? 'ativo' : 'não ativo (o navegador pode apagar dados em situações de pouco espaço)'}
          {storage.usage !== null && storage.quota !== null && <> · uso estimado {megabytes(storage.usage)} de {megabytes(storage.quota)}</>}
        </p>
        <div className="actions">
          <button type="button" onClick={exportCurrent} disabled={loadFailed}>Exportar backup (JSON)</button>
          {storage.persisted === false && <button type="button" className="secondary" onClick={requestPersistence}>Pedir armazenamento persistente</button>}
          <label className="button secondary">Importar backup…
            <input className="visually-hidden" type="file" accept="application/json,.json" onChange={event => { void chooseFile(event.target.files?.[0]); event.target.value = ''; }} />
          </label>
          <button type="button" className="danger" onClick={clearAll} disabled={loadFailed}>Limpar todos os dados</button>
        </div>
        <p role="status">{message}</p>
      </div>

      {incoming && (
        <div className="panel" role="region" aria-labelledby="import-title">
          <h2 id="import-title">Backup válido: {incoming.name}</h2>
          <p>O arquivo foi validado, mas nada foi alterado ainda. Ao substituir, todos os dados atuais serão trocados por:</p>
          {summarize(incoming.data).length === 0 ? <p className="empty">Backup sem registros (somente preferências).</p> : (
            <ul className="list">{summarize(incoming.data).map(row => <li key={row.kind}>{KIND_LABEL[row.kind]}: <strong>{row.count}</strong></li>)}</ul>
          )}
          <p className="muted"><small>
            Preferências: {incoming.data.settings.displayName || 'sem nome'} · meta diária {incoming.data.settings.dailyMinutes} min.
            {incoming.data.activeSimulation && ' Inclui um simulado em andamento.'}
          </small></p>
          <p className="muted"><small>Dados atuais: {summarize(data).reduce((sum, row) => sum + row.count, 0)} registros (última checagem {formatDateTime(Date.now())}). Exporte uma cópia antes se ainda precisar deles.</small></p>
          <div className="actions">
            <button type="button" className="secondary" onClick={exportCurrent}>Baixar cópia dos dados atuais</button>
            <button type="button" className="danger" onClick={replaceAll}>Substituir todos os dados</button>
            <button type="button" className="secondary" onClick={() => setIncoming(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <details className="panel">
        <summary>Recuperação avançada</summary>
        <p>Se o aplicativo não abrir seus dados, exporte o conteúdo bruto do navegador para diagnóstico. O arquivo não é um backup importável.</p>
        <button type="button" className="secondary" onClick={exportRecovery}>Exportar dados brutos</button>
      </details>

      <p className="muted"><small>Dados reais ficam só no seu navegador; nada é enviado ao GitHub ou a terceiros.</small></p>
    </section>
  );
}
