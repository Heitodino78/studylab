> Registro histórico da etapa de completude de 16/11/2026. As tarefas abaixo orientaram a implementação e não representam pendências automaticamente abertas nem instruções para novas execuções. Consulte o relatório geral e o roadmap para o estado atual.

# StudyLab — contrato de integração da etapa de completude

O build inicial passou, mas faltam requisitos essenciais. Completar antes de publicar. Código legível, nomes claros e arquivos separados por responsabilidade; evitar componentes inteiros em uma linha.

## Ownership exclusivo

- Codex #2: `src/models/`, `src/storage/`, `src/context/`, `src/pages/Collection.tsx`, `src/components/Markdown.tsx`, `src/domain/` existentes e testes desses módulos. Não alterar Tools.tsx/main.tsx/style.css/package.json/lockfile.
- Claude Code: substituir `src/pages/Tools.tsx` por exports de páginas próprias `Dashboard`, `Focus`, `Settings`, `Simulation`, `Statistics`; pode criar arquivos novos em `src/pages/tools/` e domínio/testes novos `src/domain/focus.ts`, `src/domain/simulation.ts`, `src/domain/analytics.ts` e testes correspondentes. Não editar models/storage/context/Collection/main/style/package.
- Coordenador: `src/main.tsx`, `src/style.css`, `.github/`, `.gitignore`, documentação final e integração.
- Antigravity #3: Node local de ferramentas, package.json/lockfile, dependências e preview. Sem editar fonte.

## Models a implementar por Codex #2 imediatamente

Manter `Item`, `Kind`, `Data`, `emptyData`, `kinds`, `FlashcardSchedule` compatíveis com usos atuais. Expandir `Kind` com `reviews`. Exportar:

```ts
type Difficulty = 'easy' | 'medium' | 'hard';
interface Preferences {
  displayName: string;
  theme: 'light' | 'dark' | 'system';
  dailyMinutes: number;
  weeklyMinutes: number;
  pomodoro: { focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; cyclesBeforeLongBreak: number };
}
interface FocusState {
  id: string;
  mode: 'pomodoro' | 'stopwatch';
  phase: 'focus' | 'shortBreak' | 'longBreak';
  startedAt: number | null;
  accumulatedMs: number;
  subjectId: string;
  cycle: number;
  durationMinutes: number;
}
interface QuestionSnapshot {
  id: string;
  title: string;
  body: string;
  options: string[];
  answer: string;
  explanation: string;
  subjectId?: string;
  topicId?: string;
  subjectTitle?: string;
  topicTitle?: string;
  difficulty?: Difficulty;
}
interface SimulationRun {
  id: string;
  title: string;
  questions: QuestionSnapshot[];
  answers: Record<string, string>;
  startedAt: number;
  deadline: number | null;
}
```

Data continua coleções `Record<Kind, Item[]>`, acrescido de `settings: Preferences`, `focus: FocusState`, `activeSimulation: SimulationRun | null`. `emptyData()` fornece nome vazio, tema system, metas 60/300 minutos, Pomodoro 25/5/15/4, foco idle inicial `id: 'initial-focus'`, accumulatedMs 0, startedAt null, subjectId vazio, cycle 0, durationMinutes25.

Item mantém campos existentes e recebe opcionais:
`topicId: string`, `difficulty: Difficulty`, `questionId: string`, `assessment: 'objective'|'manual'|'pending'`, `cardId: string`, `quality: number`, `period: 'daily'|'weekly'`, `targetMinutes: number`, `linkedNoteIds: string[]`, `snapshots: QuestionSnapshot[]`, `responses: Record<string,string>`, `startedAt: number`.

Usar backup version2 completo (settings, foco e simulado em andamento incluídos). Aceitar migração do antigo version1 sem campos novos com defaults seguros. Qualquer arquivo inválido deve ser rejeitado integralmente. Validar coleções, enums, números finitos/limites, chaves desconhecidas, campos por entidade quando aplicável, respostas e snapshots aninhados, ciclos e referências. Nenhum dado real existente do usuário neste projeto, porém preservar v1 escrito nesta sessão evita perda na integração.

## Contrato de Store

`useStore(): { data: Data; update(fn: (old: Data) => Data): Promise<boolean>; error: string; ready: boolean }` permanece. `update` recebe o estado mais recente dentro de transação IndexedDB atômica; gravações rápidas e de duas abas não podem perder a anterior. Context fila/ref e aviso de atualização entre abas. Erro de load não deve permitir sobrescrever dados; oferecer recuperação/exportação bruta quando viável.

## Codex #2 — completude do núcleo

- Associação real de notas, questões, flashcards, tarefas/metas/provas a assunto, além de disciplina; filtros assunto e dificuldade nas questões, cards pendentes, histórico de tentativas por questão e autocorreção MANUAL das discursivas (ação correta/incorreta com `assessment=manual`, jamais fingir IA). Não só registrar texto sem poder corrigir.
- Progresso de disciplinas baseado nos tópicos, cores realmente exibidas, hierarquia visível e estados. Não gerar métricas fictícias.
- Markdown seguro: títulos semânticos, listas, ênfase, bloco de código inteiro com whitespace, links seguros e associação explícita entre notas. Pode manter fórmulas como texto e documentar ausência de renderização. Não usar HTML bruto.
- Flashcards: labels de lembrança compreensíveis, revelar antes de avaliar, pendentes/contagem e registrar cada revisão em `reviews` (`cardId`, `quality`, `createdAt`, `subjectId`, `topicId`). Erros de save não devem anunciar sucesso.
- Tarefas/metas/provas: prioridade, prazo/atraso em data local correta, metas daily/weekly com targetMinutes; formulários validados, estados vazios úteis, feedback. Cronograma pode ser agrupamento por data com links.
- Exclusão de questões não altera resultados passados. Desassociar referências históricas com cuidado; não apagar tentativas/sessões sem avisar. Verificar referências do foco ao excluir disciplina. IDs vinculados inválidos não podem quebrar gravações futuras.
- Testes reais IndexedDB com concorrência/aborto e roundtrip backup/import/export. Pode pedir fake-indexeddb ao Antigravity se justificar; não instalar deps em paralelo.

## Claude — páginas de aprendizagem

- Dashboard personalizado: nome settings, dados do dia/semana, metas/progresso, revisões pendentes, matérias recentes, exercícios/acertos, próximo estudo e gráfico real de 7 dias. Links funcionais. Zero/estados vazios para recém-instalado.
- Statistics: tempo por disciplina, exercícios/taxa, série temporal/frequência, revisões, assuntos com erros e recomendações explicando regras. SVG/CSS com texto acessível, sem biblioteca de gráficos.
- Focus: Pomodoro configurado por settings e cronômetro livre; fase foco/pausas curtas/longas, pausar/continuar/reiniciar, disciplina, histórico. Timestamps persistidos em `data.focus`, pausas não contam. Ao fim de um foco Pomodoro, registrar no máximo sua duração-alvo, preparar pausa PARADA (não contar horas longe da tela como estudo). Conclusão idempotente conferindo id de fase atual na transação. Aba em background e recarga mantêm cronômetro correto. Registrar sessões reais; recuperação de falha não duplica.
- Simulation: seleção por disciplinas/assuntos, quantidade, opcional sem limite; não iniciar sem questões válidas ou aceitar contagem impossível silenciosamente. Embaralhamento Fisher-Yates. Snapshots no início para que edições/exclusões não reescrevam resultado passado. Respostas e run persistidos em `activeSimulation`; retorno/reload retoma. Ao deadline, impedir novas respostas e finalizar automaticamente, uma vez (idempotente). Histórico armazena snapshots+responses e tentativas objetivas; revisão mostra respostas, correta e explicação. Cancelamento de run pede confirmação.
- Settings: nome/aparência/metas/Pomodoro com validação, exportar version2 completo, importar validando antes da confirmação/substituição, limpar tudo com confirmação; aviso claro navegador sem sincronização e risco de limpeza/perfil privado. Nada pessoal vai ao GitHub.
- Exports compatíveis em Tools.tsx. Helpers legíveis e testes de timers/idempotência/seleção/cálculo e analytics.

## Coordenação

Usar classes CSS já existentes (`panel`, `grid`, `form`, `actions`, `secondary`, `danger`, `muted`, `empty`, `section-head`, `metric`, `filters`, `option`, `clock`) e, quando útil, `hero`, `eyebrow`, `badge`, `stats-grid`, `two-columns`, `progress`, `chart`, `chart-bars`, `chart-bar`, `row`, `list`, `pill`, `notice`, `timer-tabs`, `history`, `card-list`, `table-wrap`. O coordenador escreverá o CSS e navegação desktop/mobile com ícones.

Não rodar npm install em paralelo. Rodar testes relevantes à própria mudança; build completo só depois de models+Tools integrados. Registrar limitações reais. Ao concluir, reportar ao Codex pelo Maestri sem publicar.
