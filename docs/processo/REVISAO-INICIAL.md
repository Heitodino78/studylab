> Parecer histórico sobre uma implementação intermediária, anterior às correções e à publicação. As linhas citadas pertencem ao snapshot original e não aos arquivos atuais. A lista não deve ser interpretada como uma relação de falhas ainda presentes.

# StudyLab — revisão independente (snapshot 2026-11-16 19:14)

Linhas referem-se ao snapshot (arquivos são one-liners densos; cite também a função).
Evidência: **[EXEC]** = rodado em Node sobre lógica pura/stub de IndexedDB (não é navegador); **[LEITURA]** = só leitura de código. Nada foi testado em navegador.

## P0 — perda de dados / travamento
1. **`load()` pendura com dado inválido** — `storage/index.ts:4`. `validate` lança dentro de `req.onsuccess`; a exceção escapa do handler, a Promise nunca resolve e `db.close()` nunca roda → "Carregando dados…" infinito, sem erro e sem recuperação (nem exportar). Agravado pelas regras novas de `validate` (linhas 18–23): dado salvo por build anterior que viole regra nova trava o app. [EXEC com stub: `PENDING`, exceção escapou]. Correção: try/catch → `reject`, `tx.onabort`, e modo de recuperação (exportar bruto / limpar) quando `loadFailed`.
2. **Sobrescrita silenciosa (abas e corrida)** — `context/Store.tsx:7` + `storage/index.ts:5`. `fn(data)` usa o `data` do closure e `save` regrava o blob único da chave `'data'`. Aba B (aberta antes) salva uma tarefa e apaga o que a aba A gravou; dentro da mesma aba, dois `update()` antes do `setData` partem do estado antigo. [LEITURA]. Correção: fila serial + get→apply→put na mesma transação readwrite; `onversionchange`/BroadcastChannel.
3. **Excluir disciplina apaga histórico sem aviso** — `Collection.tsx:13`. A cascata remove `sessions` e `attempts` além de notas/cards/questões; o confirm só diz `Excluir “X”?`. [LEITURA]. Mostrar contagem afetada e/ou desassociar histórico.

## P1 — requisitos ausentes/quebrados
4. **Sem associação a assunto (tópico/subtópico)** — `models:3`, `storage:26`. `parentId` só vale para tópicos; nota com `parentId` → "Tópico pai inválido", com `topicId` → "Registro inválido" [EXEC]. Bloqueia filtro por assunto no simulado, estatística por assunto e planejamento. Hierarquia também invisível na lista (`Collection.tsx:24`).
5. **Tentativas sem vínculo nem histórico** — `Collection.tsx:14`: attempt sem `questionId`, nenhuma tela lista tentativas, discursiva nunca recebe nota (sem autoavaliação). Impede caderno de erros e taxa por questão.
6. **Simulado** — `Tools.tsx:12`: (a) não respondidas viram tentativa errada e entram em "Questões respondidas"/pontos fracos [EXEC]; (b) revisão usa a questão *atual* (editar/excluir muda a revisão) e excluir questão mantém `score/total` com menos `questionIds` (3/3 com 1 questão é aceito) [EXEC]; (c) F5 perde a prova em andamento; (d) tempo não encerra a prova nem é salvo; (e) só filtro por disciplina; shuffle enviesado (`sort(()=>Math.random()-.5)`).
7. **Foco** — `Tools.tsx:11`: sem Pomodoro/intervalos, sem aviso ao fim da meta, sessão só tem fim (`createdAt`). Timer em `localStorage` pode apontar para disciplina excluída/importada → "Registrar sessão" falha para sempre com "Disciplina inexistente" [EXEC]; resta só descartar o tempo.
8. **Planejamento/metas = TODO genérico** — sem meta mensurável nem progresso derivado, sem visão hoje/semana/atrasados, sem ordenação por prazo/prioridade (`Collection.tsx:10`); Dashboard (`Tools.tsx:8`) só tem 4 contadores.
9. **Flashcards sem fila de vencidos nem log de revisão** (`Collection.tsx:25`); `grade` ignora o retorno de `update` e exibe "Revisão registrada." mesmo se o save falhou (`:15`). SM-2: nota <3 também reduz EF (`sm2.ts:6`; q=0: 2,5→1,7 [EXEC]); a variante de atualização do fator de facilidade precisava ser decidida e documentada; isso foi registrado no README final.

## P2
10. Mover tópico pai de disciplina falha porque filhos mantêm `subjectId` [EXEC] (`Collection.tsx:17`, `storage:26`); select de pai não exclui descendentes (`:18`).
11. Erros crus ao usuário ("Não foi possível salvar: Error: Alternativas inválidas"); alternativas duplicadas só falham no `save` [EXEC] (`Collection.tsx:12`).
12. Markdown seguro (sem HTML, só http/https) mas mínimo: sem listas/negrito/tabelas; títulos em `<strong>`; cada linha de código vira um `<pre>`; sem preview; sem teste (`Markdown.tsx:3`).
13. Busca sem normalizar acentos: "calculo" não acha "Cálculo" [EXEC] (`Collection.tsx:10`).
14. `localStorage` sem try/catch (`main.tsx:10`, `Tools.tsx:11`) e sem ErrorBoundary → tela branca se bloqueado; sem `navigator.storage.persist()`/lembrete de backup (despejo pelo navegador: não verificado); `crypto.randomUUID` exige contexto seguro.
15. Importar/limpar substitui tudo após um confirm, sem exportar antes (`Tools.tsx:13`); `revokeObjectURL` imediato após `click()` [não verificado]; backup v1 sem caminho de migração.
16. Lógica dentro de JSX one-liner (`Collection.tsx:12–15`, `Tools.tsx:11–12`) impede teste unitário; faltam testes de corrida do Store, `load` inválido, cascatas, simulado, Markdown.

## P3 — a11y/CI (não verificado em navegador a 390 px)
17. Link ativo `#786af0` sobre fundo tintado ≈4:1 (<4,5; cálculo aproximado, medir); input de importar oculto sem foco visível; notas 0–5 sem legenda; foco não vai ao formulário/rota; `color` da disciplina nunca exibida.
18. CI: `cancel-in-progress: true` pode cancelar deploy de Pages em curso; Node 22 no CI vs README "Node 18"; sem LICENSE; 7 vulns npm do coordenador → separar `npm audit --omit=dev`.

## Divisão sugerida (arquivos disjuntos)
- **Codex #2 (models/storage/context/Collection/Markdown/domínio existente):** 1–5, 9–13, 15 (parte de validate/backup).
- **Revisor (Tools + pages/tools + domain focus/simulation/analytics):** 6, 7, 8 (Dashboard/Estatísticas), Settings (aviso e export antes de importar/limpar).
- **Coordenador:** 14 (`main.tsx` try/catch + ErrorBoundary), 17 (CSS), 18 (Antigravity).

## Tratamento posterior dos achados

- Leitura inválida sem rejeição, sobrescrita entre atualizações e perda de histórico: tratados por rejeição de erros, transações atômicas e preservação/desassociação de registros; ver testes de armazenamento e de coleções.
- Assuntos vinculados, avaliação manual, histórico de tentativas, revisão de flashcards, Pomodoro e simulados persistidos: implementados na etapa de completude.
- Resultados de simulados: passaram a usar snapshots, finalização idempotente e prazo; houve teste adicional de assunto movido entre disciplinas.
- Markdown, busca com acentos, formulários, temas, navegação, confirmações e documentação: ampliados durante a integração.
- Dependências: atualizadas com Node 22; a auditoria final registrou zero vulnerabilidades.
- Movimentação de árvores de tópicos, recuperação após falha de leitura, limites de backup e validações de navegadores: permanecem como pontos de melhoria descritos no relatório e no roadmap.
- Esta síntese registra o trabalho executado; não substitui uma auditoria exaustiva da versão atual.
