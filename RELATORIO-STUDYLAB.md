# StudyLab — relatório de desenvolvimento e evolução

**Data:** 16/11/2026.  
**Versão analisada:** `a9baf8f1b2b6bedf8407d8d2abba60a48d71df66`.  
**Versão ampliada deste relatório:** commit `76dc0a7a014e720434f7ddf1cf5aeadc57fd0b6b` (documentação; sem alteração no código da aplicação).
**Finalidade:** registrar o que foi entregue, como foi desenvolvido, o que foi verificado, as limitações e as próximas melhorias.

Este relatório reúne as evidências da implementação e da validação realizadas nesta sessão. Não representa uma auditoria exaustiva de todos os navegadores, combinações de dados ou situações de uso. Os resultados de testes e da auditoria de dependências correspondem à versão e à data indicadas.

## Resumo executivo

- **Estado:** versão 0.1.0 publicada, funcional para uso pessoal e local, com 84 testes automatizados aprovados (reexecutados em 16/11/2026 em Node 22).
- **Forças:** núcleo de domínio testado (foco, simulados, análises, SM-2), gravações atômicas, resultados de simulados preservados por cópias das questões, instalação vazia sem dados fictícios, publicação reproduzível por Actions.
- **Principais riscos:** perda de dados por limpeza do navegador (sem nuvem), recuperação após falha de leitura incompleta, movimentação de assuntos entre disciplinas sem operação segura e ausência de testes de navegador automatizados.
- **Decisão recomendada:** usar em sessões reais, manter backups periódicos e fechar os três pontos de confiabilidade (§5.2) antes de acrescentar recursos novos (§9).

## 1. Resultado da entrega

O StudyLab foi implementado, testado, versionado no GitHub e publicado no GitHub Pages. A aplicação pública foi aberta e testada no navegador.

- **Aplicação:** https://heitodino78.github.io/studylab/
- **Repositório:** https://github.com/Heitodino78/studylab
- **Publicação validada:** https://github.com/Heitodino78/studylab/actions/runs/43976452919
- **GitHub Actions:** jobs `build` e `deploy` concluídos com sucesso.
- **Testes locais:** 84 testes passaram em 11 arquivos.
- **Build:** verificação de tipos TypeScript e build Vite aprovados.
- **Dependências:** auditoria npm registrou zero vulnerabilidades após as atualizações.
- **Interface:** 13 rotas verificadas em largura de 390 px, sem erro de renderização ou rolagem horizontal; conferência adicional em desktop de 1440 px.

### Métricas verificadas (16/11/2026)

| Item | Valor |
| --- | --- |
| Commits no repositório local | 11 (HEAD `03cd5df`) |
| Código-fonte em `src/` | cerca de 3.000 linhas de TypeScript/TSX nos arquivos de páginas, domínio e armazenamento, mais `style.css` |
| Dependências de produção | 3: `react`, `react-dom`, `react-router-dom` |
| Testes | 84 aprovados, 0 falhas, 11 arquivos |

| Arquivo de teste | Testes | Cobre |
| --- | --- | --- |
| `domain/focus.test.ts` | 21 | Timer por timestamps, Pomodoro, idempotência, validação de preferências |
| `domain/simulation.test.ts` | 20 | Seleção, snapshots, prazo, finalização idempotente, assunto movido de disciplina |
| `domain/analytics.test.ts` | 17 | Séries, acertos, sequência, metas, recomendações com regra explícita |
| `storage/index.test.ts` | 7 | Validação, backup v1/v2, limites |
| `storage/integration.test.ts` | 4 | Integração armazenamento e domínio |
| `storage/persistence.test.ts` | 3 | Transações e concorrência com IndexedDB simulado |
| `domain/sm2.test.ts`, `domain/stats.test.ts` | 3 + 3 | Intervalos SM-2; assuntos fracos |
| `components/Markdown.test.tsx`, `pages/Collection.test.tsx`, `domain/questions.test.ts` | 2 + 2 + 2 | Renderização segura, formulários, correção objetiva |

Os testes cobrem domínio e armazenamento. As páginas de ferramentas (Dashboard, Estatísticas, Foco, Simulados, Configurações) não têm teste de renderização automatizado; foram conferidas no navegador.

A instalação começa vazia. Os números apresentados são calculados a partir do que o estudante registra. Os dados sintéticos utilizados nos testes online foram removidos pela interface ao final da validação. Nenhum dado real de estudos, credencial ou arquivo do cofre foi publicado.

## 2. Como foi o desenvolvimento

### Fundação e primeira implementação

O projeto foi criado separado do cofre, com React, TypeScript, Vite, navegação por hash, modelos de dados e persistência em IndexedDB. Foram implementados os primeiros formulários, a organização de estudos, os exercícios, os flashcards e o cálculo de revisão espaçada.

A primeira implementação cobria os fluxos básicos, mas ainda não atendia a todo o escopo. Havia lacunas em preferências, associações por assunto, avaliação manual, estatísticas, Pomodoro e controle dos simulados. Ela passou a ser a base de uma etapa de completude e correção.

### Resolução dos bloqueios de ambiente

Os ambientes iniciais não conseguiam acessar o registro npm por restrições de rede e não tinham as dependências instaladas. A instalação foi realizada pelo agente de infraestrutura com acesso autorizado no seu ambiente.

As versões iniciais das dependências apresentavam sete alertas de segurança. A ferramenta de desenvolvimento foi migrada para Node 22, com instalação local isolada das ferramentas e atualização de Vite, Vitest e React Router. A auditoria posterior registrou zero vulnerabilidades. O Node do sistema não foi substituído por essa instalação isolada.

### Revisão e correções

A revisão identificou riscos de perda de alterações entre abas, falha de leitura sem tratamento suficiente, exclusão que afetava histórico e resultados de simulados dependentes das questões atuais.

As correções principais foram:

- Gravar alterações dentro de transações atômicas do IndexedDB, lendo o estado mais recente antes de aplicar a mudança.
- Serializar atualizações no contexto React e informar outras abas por BroadcastChannel.
- Bloquear gravações após falha de leitura e disponibilizar exportação bruta para recuperação.
- Preservar histórico ao remover vínculos de materiais.
- Guardar cópias das questões no início do simulado, mantendo o resultado original após alterações posteriores.
- Persistir simulados e foco em andamento e concluir operações com identificadores que evitam duplicação.
- Acrescentar avaliação manual de discursivas, associações por assunto, registro de revisões e metas mensuráveis.
- Corrigir a finalização de simulados quando um assunto muda de disciplina durante a execução.

### Integração e experiência de uso

Os arquivos foram divididos entre os responsáveis para reduzir conflitos. Foram integrados layout desktop, navegação mobile, temas, gráficos, formulários e estados vazios. Os fluxos de confirmação foram substituídos por diálogos acessíveis dentro da aplicação após uma confirmação nativa bloquear a interação no portal de testes.

### Publicação e conferência online

O repositório público foi criado e o Pages configurado para usar GitHub Actions. O conector GitHub permitia leitura, mas recusou escrita com HTTP 403. O envio foi então feito pelo GitHub CLI autenticado, respeitando a aprovação exigida pelo ambiente do agente.

O workflow instalou as dependências pelo lockfile, executou testes, gerou o build e publicou `dist/`. Depois foram conferidos os arquivos JavaScript e CSS, a navegação, a persistência, a importação de backup, a correção de exercício e a interface mobile no endereço público.

## 3. Agentes que participaram

| Participante | Responsabilidade | Motivo da participação |
| --- | --- | --- |
| Coordenador / Codex | Planejamento, contratos de integração, interface, navegação, documentação, QA e verificação final | Manter o escopo integrado e verificar a entrega |
| Codex #2 | Modelos, persistência, núcleo de organização, exercícios, flashcards e testes | Concentrar a implementação principal e as regras de integridade |
| Claude Code | Revisão inicial, dashboard, estatísticas, foco, simulados e testes desses módulos | Avaliação independente e implementação de um conjunto separado de páginas |
| Antigravity #3 | Instalação autorizada, Node/npm, dependências, auditoria, preview e publicação | Resolver os bloqueios de infraestrutura e executar a publicação com acesso disponível |

Não foi acionado um Pesquisador separado. A documentação técnica necessária foi consultada de forma pontual. Este relatório foi consolidado pelo Coordenador, sem convocar novamente a equipe para repetir a revisão.

## 4. O que está implementado e funcionando

As verificações abaixo combinam testes automatizados, inspeção da implementação e testes de navegador. A coluna de evidência delimita o que foi efetivamente observado.

| Módulo | Entrega | Evidência principal |
| --- | --- | --- |
| Dashboard | Nome configurável, foco do dia/semana, metas, revisões, exercícios, prazos, sequência e sugestões por regras | Dados sintéticos registrados refletidos na interface; estado inicial vazio conferido |
| Disciplinas e assuntos | Cadastro, edição, exclusão, cor, ícone, tópicos/subtópicos, prioridade, status e progresso | Criação e associação por formulário; persistência após reload; testes de regras de exclusão |
| Biblioteca | Notas, busca, organização por assunto, Markdown básico e notas relacionadas | Nota renderizada com títulos, listas, ênfase e código; conteúdo malicioso permaneceu inerte |
| Exercícios | Alternativas, gabarito, dificuldade, explicação, filtros e histórico | Correção objetiva realizada; discursiva registrada e avaliada manualmente |
| Flashcards | Cadastro, revelação, avaliação da lembrança, pendentes e próxima revisão | Revisão registrada e agendada; intervalos SM-2 testados |
| Planejamento | Tarefas, prioridade, datas, provas, metas em minutos e cronograma | Tarefa vencida identificada; meta diária e prova cadastradas |
| Foco | Pomodoro, pausas curtas/longas, ciclos, cronômetro livre, pausa, retomada e sessões | Pausa preservada após reload; fase de 1 minuto registrada em 60.000 ms e seguida de pausa parada |
| Estatísticas | Tempo, frequência, séries, exercícios, revisões, assuntos com erros e recomendações | Agregações testadas; gráficos e valores alimentados por registros de QA |
| Simulados | Filtros, quantidade, prazo opcional, retomada, correção, revisão e histórico | Resposta preservada após reload; resultado 1/1; prazo real de 1 minuto encerrado fora da rota do simulado |
| Configurações | Nome, aparência, metas, durações do Pomodoro e armazenamento | Preferências salvas e refletidas na interface |
| Backup | Exportação v2 completa, migração v1, validação, prévia e confirmação de substituição | Arquivo inválido rejeitado; backup válido restaurado no preview e no site público |
| Interface | Sidebar, navegação inferior mobile, menu modal, temas e foco visível | Navegação nas 13 rotas a 390 px e conferência em desktop |
| Publicação | Repositório público, Actions e Pages | Push confirmado no mesmo SHA e jobs build/deploy com sucesso; site aberto no navegador |

### Regras que merecem destaque

- Questões discursivas dependem da avaliação manual do estudante; não há correção automática por IA.
- A taxa de acerto inclui respostas objetivas e discursivas já avaliadas. Respostas pendentes ficam fora do denominador.
- Uma questão em branco reduz a nota do simulado, mas não cria uma tentativa de exercício como se tivesse sido respondida.
- O Pomodoro registra no máximo a duração-alvo e prepara uma pausa parada. O tempo de ausência após o fim do foco não é acrescentado como estudo.
- As sugestões são produzidas por regras estatísticas identificadas na interface.
- Simulados: ao finalizar, o `topicId` de uma tentativa só é mantido quando o assunto ainda pertence à disciplina guardada; caso contrário a tentativa é desassociada do assunto, e o histórico original permanece no snapshot do simulado.
- Finalização é idempotente: concluir o mesmo simulado ou a mesma fase de foco duas vezes (duas abas, recarga) não duplica sessões nem tentativas, pois os identificadores são determinísticos.
- Uma sessão de foco com menos de 1 segundo é descartada; a sessão guarda a disciplina somente se ela ainda existir.
- As recomendações exigem ao menos 3 respostas avaliadas e acerto inferior a 70% para marcar um assunto como fraco.
- Metas e semanas seguem segunda a domingo; todos os cálculos usam o relógio e o fuso do dispositivo.
- Os dados do estudante ficam no navegador; a publicação no GitHub contém o código e os recursos da aplicação.

## 5. O que não está disponível e o que exige atenção

### 5.1 Funcionalidades ausentes

Estas capacidades ainda não foram implementadas; não devem ser apresentadas como recursos funcionando:

- Login real, contas e sincronização entre dispositivos.
- Backend, API remota e banco de dados em nuvem.
- Aplicação PWA instalável e funcionamento offline garantido por service worker.
- Renderização de LaTeX e fórmulas matemáticas; atualmente permanecem como texto.
- Markdown completo, incluindo tabelas, imagens e todos os recursos de um editor avançado.
- Upload, leitura, anotação ou indexação de PDFs e anexos.
- Importação automática de materiais do Obsidian.
- Integração funcional com o Maestri dentro do StudyLab.
- Tutor de IA, geração automática de exercícios e trilhas adaptativas.
- Importação de questões em lote, compartilhamento de materiais e colaboração entre estudantes.

### 5.2 Limitações técnicas e fluxos que podem ser recusados

Os três primeiros pontos abaixo foram identificados por leitura do código nesta etapa de documentação, sem novos testes de reprodução. São observações técnicas para investigação e correção, não relatos de perda de dados ocorrida nos testes.

| Ponto | Comportamento ou limite atual | Melhoria indicada |
| --- | --- | --- |
| Mover assunto entre disciplinas | A edição de um tópico não migra automaticamente os filhos e materiais vinculados. A validação pode recusar a gravação quando os vínculos deixam de combinar | Criar uma operação explícita de movimentação da árvore e atualização dos vínculos, com prévia do impacto |
| Recuperação após falha de leitura | A escrita fica bloqueada para preservar os dados. Há exportação bruta, mas a importação normal usa o mesmo mecanismo bloqueado e a limpeza pela interface fica desabilitada nesse estado | Implementar modo de recuperação que permita exportar, confirmar e restaurar/reinicializar com segurança |
| Tamanho do backup | A importação aceita até 10 MB; a exportação não aplica o mesmo teto ao documento completo. Uma base grande pode gerar um arquivo que o importador normal recuse | Alinhar os limites, informar o tamanho antes da exportação e considerar restauração em partes |
| Armazenamento local | Limpeza do navegador, perda do perfil ou remoção de dados pelo navegador pode apagar os registros | Manter backups e acrescentar lembretes e verificação de restauração |
| Troca de dispositivo ou perfil | Os dados não aparecem automaticamente em outro navegador, computador ou perfil | Acrescentar sincronização real em uma fase posterior |
| Relógio e avisos | Os cálculos usam o relógio do dispositivo. Avisos dependem das permissões e da execução do navegador; não há serviço de notificações com o app fechado | Documentar o comportamento e ampliar testes de suspensão e mudanças de horário |
| Grande volume | O armazenamento valida até 50 mil registros, mas as coleções são carregadas como um documento único e não há paginação geral | Medir uso de memória e desempenho, depois paginar listas e revisar a organização do banco |

Referências de implementação na versão analisada: [persistência e validação](https://github.com/Heitodino78/studylab/blob/a9baf8f/src/storage/index.ts), [contexto de gravação](https://github.com/Heitodino78/studylab/blob/a9baf8f/src/context/Store.tsx), [formulários e associações](https://github.com/Heitodino78/studylab/blob/a9baf8f/src/pages/Collection.tsx) e [configurações e recuperação](https://github.com/Heitodino78/studylab/blob/a9baf8f/src/pages/tools/Settings.tsx).

### 5.3 O que ainda não foi suficientemente testado

- Safari, Firefox e navegadores de celulares físicos em uma matriz sistemática.
- Uso completo com leitor de tela e auditoria formal de acessibilidade.
- Uso contínuo por várias semanas, bibliotecas grandes e pressão sobre a quota de armazenamento.
- Todos os cenários de suspensão do sistema, mudanças de relógio e navegador encerrado.
- Comportamento visual de várias abas reais editando ao mesmo tempo. A concorrência das transações foi testada automaticamente com IndexedDB simulado.
- Todas as combinações possíveis de alteração e exclusão de entidades vinculadas.

Nos fluxos de aceitação executados, não ficou registrado um bloqueador que impedisse o uso básico ou o acesso ao site publicado. Isso não equivale a afirmar que a aplicação esteja livre de bugs.

### 5.4 Inventário de escopo: completo, parcial e ausente

“Completo” aqui significa que o fluxo descrito foi implementado e que há evidência indicada neste relatório; não significa cobertura de todas as combinações, dispositivos ou navegadores. “Parcial” indica uma versão utilizável com limites conhecidos. “Ausente” significa que o recurso não existe nesta versão.

| Recurso | Estado | O que o estudante consegue fazer hoje | Limite ou próximo passo |
| --- | --- | --- | --- |
| Primeira utilização e dados vazios | Implementado | Abrir o app sem conteúdo e começar pelo cadastro de disciplinas, metas, notas ou cartões | Não há dados de demonstração, onboarding guiado ou conta |
| Dashboard | Implementado | Ver resumo derivado dos próprios registros, metas, revisões, atividade recente e atalhos | Sem registros, os indicadores ficam vazios/zerados; não há previsão ou estatística fictícia |
| Disciplinas e assuntos | Implementado com ressalva | Criar e editar disciplinas, cores, ícones, tópicos e subtópicos; marcar prioridade/status e acompanhar progresso | Mover tópico entre disciplinas com descendentes e itens vinculados precisa de operação segura; consultar §5.2 |
| Notas | Implementado em Markdown básico | Criar, editar, buscar, vincular a disciplina/assunto e relacionar notas; usar títulos, listas, ênfase, links HTTP(S) e blocos de código | Sem editor visual completo, imagens, tabelas, anexos, histórico de versões ou renderização de fórmulas |
| Questões objetivas | Implementado | Cadastrar alternativas, resposta, explicação, assunto e dificuldade; filtrar, responder e consultar tentativas | O banco é pessoal e manual; não há importação em lote ou catálogo compartilhado |
| Questões discursivas | Implementado com avaliação manual | Registrar resposta e nota manual; rever histórico e incluir a avaliação nas estatísticas quando concluída | Não há correção automática; respostas pendentes não contam como avaliadas |
| Flashcards e revisão espaçada | Implementado | Criar cartões, revelar resposta, avaliar lembrança e rever cartões vencidos; ver próxima data calculada | Variante simples documentada de SM-2; sem fila de sessão avançada, notificações garantidas ou sincronização |
| Tarefas, metas e provas | Implementado em nível essencial | Definir tarefas com prioridade/data, metas por minutos e provas/datas; identificar atraso e visualizar cronograma | Não há calendário externo, recorrências, arrastar-e-soltar ou alertas quando o app está fechado |
| Modo Foco | Implementado | Usar cronômetro livre ou Pomodoro configurável, pausar, retomar, reiniciar, associar disciplina e consultar sessões | Avisos dependem do navegador aberto; testar sistematicamente suspensão prolongada e dispositivos adicionais continua pendente |
| Estatísticas e dificuldades | Implementado com regras transparentes | Ver séries temporais, tempo, frequência, exercícios, revisões, taxa de acerto e assuntos com erros | Recomendações são regras determinísticas, não IA; comparação de períodos e exportação CSV ainda não existem |
| Simulados | Implementado | Selecionar questões por disciplina/assunto/dificuldade, responder, finalizar, rever snapshots e consultar resultados | Temporizador informa e encerra pelo prazo; não há experiência de prova com fullscreen, pausa configurável ou catálogo externo |
| Tema e preferências | Implementado | Definir nome, tema e parâmetros de metas/Pomodoro | Preferências são locais ao navegador e não sincronizam entre dispositivos |
| Exportar e importar backup | Implementado com ressalva de tamanho/recuperação | Exportar JSON versionado, importar versão suportada, validar e confirmar substituição; exportar dados brutos para recuperação | A restauração pela interface após erro de abertura e o limite desigual de exportação/importação precisam de melhoria (§5.2) |
| Armazenamento | Implementado localmente | Manter dados no IndexedDB do navegador; atualizações usam transação e fila e avisam outras abas | Limpeza do perfil pode apagar tudo; não há cópia em nuvem. Concorrência de domínio foi testada com fake-indexeddb, não em matriz real de browsers |
| Acessibilidade e responsividade | Verificado parcialmente | Navegar pelas rotas em tela pequena, usar diálogos próprios e encontrar alternativas textuais para gráficos | Verificação visual em Chromium não substitui auditoria completa com teclado, leitor de tela, Firefox/Safari e aparelhos físicos |
| Publicação | Implementado e verificado | Abrir o site público em GitHub Pages; atualizar a página preserva o roteamento por hash | Depende da disponibilidade do GitHub Pages/Actions; esta versão não possui backend nem SLA próprio |
| Conta, nuvem e colaboração | Ausente | — | Exigem backend, autenticação real, autorização, sincronização e resolução de conflitos |
| PWA/offline garantido | Ausente | — | Exige service worker, política de atualização/cache e testes de instalação/offline |
| Fórmulas renderizadas, PDF e IA | Ausentes | — | São possibilidades futuras; não devem ser interpretadas como recursos atuais |

### 5.5 Caminhos principais para usar os módulos

1. **Começar:** abra “Disciplinas”, crie uma matéria e seus assuntos; ajuste seu nome, aparência e metas em “Configurações”.
2. **Guardar conhecimento:** crie uma nota na “Biblioteca”, associe-a à matéria/assunto e use a busca para recuperá-la. O editor aceita Markdown básico; conteúdo HTML não é tratado como HTML ativo.
3. **Praticar:** cadastre questões em “Exercícios”. Questões objetivas são corrigidas pelo gabarito cadastrado. Para uma discursiva, o próprio estudante atribui a avaliação manualmente.
4. **Revisar:** cadastre frente/verso em “Flashcards”; durante a revisão, revele a resposta e escolha uma avaliação de lembrança. Essa avaliação agenda a próxima revisão segundo a regra SM-2 implementada.
5. **Planejar e estudar:** registre tarefas, metas e provas em “Planejamento”; inicie o foco livre ou Pomodoro e associe a sessão a uma matéria quando desejar.
6. **Medir e simular:** consulte “Estatísticas” para dados registrados e regras de dificuldade; em “Simulados”, escolha filtros e quantidade, responda e finalize para ver o resultado e revisar as questões.
7. **Proteger os dados:** em “Configurações”, exporte backups periodicamente. Antes de importar, confira a prévia e confirme a substituição. Guarde uma cópia fora do navegador.

Os nomes e caminhos são os da navegação atual. Como não há onboarding, este roteiro também explicita a ordem sugerida para a primeira sessão.

### 5.6 Registro de riscos

| Risco | Impacto | Probabilidade estimada | Mitigação atual | Ação recomendada |
| --- | --- | --- | --- | --- |
| Limpeza do navegador apaga o IndexedDB | Alto: perda total dos dados | Média, depende do uso | Exportação de backup manual | Lembrete periódico e verificação de backup (§7) |
| Backup exportado maior que 10 MB não é aceito pelo importador | Alto: backup inutilizável | Baixa para uso individual | Nenhuma além do aviso do limite na importação | Alinhar limites e informar o tamanho ao exportar |
| Falha de leitura bloqueia gravações | Médio: o app fica somente leitura, com exportação bruta | Baixa | Bloqueio protege os dados e há exportação bruta | Modo de recuperação com restauração confirmada |
| Mover assunto com filhos ou materiais é recusado pela validação | Médio: fluxo frustrante, sem corrupção | Média | A validação impede gravar vínculos inconsistentes | Operação de movimentação com prévia de impacto |
| Duas abas editando ao mesmo tempo | Médio | Baixa | Transações atômicas, fila e BroadcastChannel testados com IndexedDB simulado | Teste em navegadores reais |
| Relógio do dispositivo alterado ou suspensão prolongada | Baixo a médio: tempos de foco e prazos imprecisos | Baixa | Cálculo por timestamps; relógio retrocedendo conta zero | Ampliar testes de suspensão |
| Regressão em páginas sem teste automatizado | Médio | Média a cada mudança | Verificação manual e testes de domínio | Testes de ponta a ponta no navegador |
| Dependências desatualizadas | Médio | Cresce com o tempo | Auditoria npm sem vulnerabilidades nesta versão; lockfile | Repetir `npm audit` a cada alteração relevante |

As probabilidades são estimativas qualitativas do autor, sem base estatística de uso.

## 6. Arquitetura e decisões técnicas

| Área | Decisão |
| --- | --- |
| Interface | React 18 e TypeScript com verificação estrita |
| Desenvolvimento e build | Vite 6; Node 22.12 ou superior |
| Rotas | React Router 7 com HashRouter e base `/studylab/`, compatível com reload no GitHub Pages |
| Persistência | IndexedDB nativo atrás de funções de carregamento, atualização atômica e backup |
| Estado | Contexto React, fila de alterações e BroadcastChannel |
| Domínio | Funções separadas para questões, SM-2, foco, simulados e análises |
| Testes | Vitest 4 e fake-indexeddb para os testes de armazenamento |
| Visual | CSS próprio, ícones SVG próprios e gráficos sem dependência de uma biblioteca de gráficos |
| Publicação | GitHub Actions publica `dist/` somente após testes e build |
| Licenças | MIT para o projeto e atribuições das dependências de produção distribuídas em `licenses.txt` |

### Estrutura do código

| Pasta | Conteúdo |
| --- | --- |
| `src/models` | Tipos de dados e contrato do armazenamento (`Data`, `Item`, `FocusState`, `SimulationRun`) |
| `src/storage` | IndexedDB com um documento único, validação, atualização atômica, backup v1/v2 e exportação bruta |
| `src/context` | `Store`: fila de gravações e sincronização entre abas |
| `src/domain` | Funções puras: `focus`, `simulation`, `analytics`, `sm2`, `questions`, `stats` |
| `src/pages` | Disciplinas, biblioteca, exercícios, cartões, planejamento (`Collection`) e ferramentas (`tools/`) |
| `src/components` | Confirmação acessível, Markdown seguro, ícones e limite de erros |

Cada alteração passa por funções de atualização puras e idempotentes aplicadas por `update()`, o que permite testá-las sem interface e repeti-las com segurança.

O cálculo de acerto por disciplina vive em `analytics.ts`; `stats.ts` (assuntos fracos) o reutiliza, evitando duas regras divergentes.

A separação entre interface, domínio e armazenamento facilita acrescentar uma API no futuro. Essa preparação não significa que a sincronização esteja pronta: autenticação, autorização, conflitos, migrações remotas e regras de acesso ainda precisarão ser desenvolvidos.

## 7. Pontos de melhoria priorizados

### Prioridade alta — confiabilidade e manutenção

1. Reproduzir e corrigir os três fluxos apontados por leitura: recuperação após falha de leitura, movimentação de tópicos com vínculos e limites de backup.
2. Automatizar testes de ponta a ponta no navegador para cadastro, edição, exclusão, importação, foco e simulados.
3. Executar testes com navegadores diferentes, celulares físicos e leitor de tela.
4. Criar lembrete de backup e um procedimento simples para verificar se o arquivo pode ser restaurado.
5. Melhorar mensagens de validação, explicando qual vínculo ou campo precisa ser corrigido.
6. Tornar os modelos de cada entidade mais específicos, reduzindo a quantidade de campos opcionais compartilhados.

### Prioridade média — experiência de estudo

1. Criar fila de revisão mais guiada, com navegação de um cartão por vez e resumo da sessão.
2. Acrescentar caderno de erros com filtros e prática focada nos assuntos de maior dificuldade.
3. Melhorar o editor Markdown com prévia, atalhos e renderização matemática segura.
4. Ampliar o planejamento com visão semanal/calendário e reorganização de sessões.
5. Acrescentar edição em lote, ordenação explícita e paginação para bibliotecas maiores.
6. Permitir comparar períodos e exportar estatísticas para CSV.

### Etapa posterior — novas integrações

Estabilizar e medir o uso local antes de acrescentar infraestrutura remota. Login, nuvem e IA aumentam os requisitos de privacidade, disponibilidade, operação e controle de acesso.

## 8. Funcionalidades que podem ser adicionadas

| Proposta | Benefício esperado | Condição para desenvolver |
| --- | --- | --- |
| PWA e recursos offline | Instalar o app e abrir os materiais sem conexão | Definir atualização de cache e preservação do banco local |
| Fórmulas matemáticas | Melhorar materiais de matemática e física | Escolher renderizador seguro, acessível e com licença compatível |
| Importação CSV/JSON de questões e flashcards | Reduzir cadastro manual | Validar formato, duplicação, gabarito e associações |
| Caderno de erros e sessões direcionadas | Transformar erros em prática planejada | Usar histórico real e explicar a seleção das questões |
| Editor de notas com prévia e histórico de versões | Facilitar escrita e recuperação de alterações | Definir política de versões e impacto no armazenamento |
| PDFs e materiais anexos | Reunir leitura e anotações | Planejar tamanho, indexação, permissões e backup dos arquivos |
| Trilhas e pré-requisitos | Organizar estudos em sequências de aprendizagem | Permitir configuração pelo estudante e evitar recomendações opacas |
| Exercícios de programação | Praticar código e verificar casos cadastrados | Projetar execução isolada e limites antes de executar código fornecido pelo usuário |
| Módulo de xadrez com FEN/PGN | Estudar posições, variantes e exercícios | Integrar tabuleiro e materiais com licenças adequadas |
| Obsidian | Importar notas e vínculos selecionados | Exigir seleção explícita, tratar conteúdo como dados e preservar a privacidade do cofre |
| Sincronização e conta real | Continuar os estudos em vários dispositivos | Desenvolver backend, autenticação, autorização e resolução de conflitos |
| Tutor opcional por pistas | Apoiar raciocínio sem entregar imediatamente a resposta | Definir infraestrutura, privacidade, limites e transparência antes da integração |
| Integração com Maestri | Conectar planejamento e automações pessoais | Definir ações permitidas e acesso mínimo aos dados |

Essas propostas são possibilidades de evolução; não foram implementadas nesta entrega nem estão incluídas nas funcionalidades atuais.

## 9. Sequência recomendada para a próxima versão

1. Usar a versão atual em sessões reais e registrar problemas com passos para reproduzir.
2. Fechar os pontos de confiabilidade de recuperação, backup e movimentação de assuntos.
3. Acrescentar testes automatizados de navegador e validação em mais dispositivos.
4. Melhorar revisão de flashcards, caderno de erros e planejamento a partir do uso observado.
5. Adicionar fórmulas e PWA, preservando compatibilidade dos dados existentes.
6. Só depois avaliar sincronização, materiais externos e tutor opcional.

Não foram atribuídas estimativas de prazo, créditos ou custo sem medição e definição adicional de escopo.

## 10. Como reproduzir a verificação

```bash
npm ci
npm test          # vitest run: 84 testes
npm run build     # tsc --noEmit && vite build
npm audit         # dependências
npm run dev       # preview local
```

Requer Node 22.12 ou superior. Ao verificar o relatório, compare o resultado com a tabela de métricas; divergências indicam que o código mudou depois da versão analisada.

## 11. Glossário

| Termo | Significado |
| --- | --- |
| Snapshot | Cópia da questão (enunciado, alternativas, gabarito) feita ao iniciar um simulado |
| SM-2 | Algoritmo de revisão espaçada; avaliações de 0 a 5 definem o próximo intervalo |
| Idempotente | Repetir a operação não muda o resultado nem duplica registros |
| Backup v2 | Formato JSON versionado exportado pelo app; o v1 é aceito e migrado |
| Exportação bruta | Cópia dos dados armazenados sem validação, usada para recuperação |
| HashRouter | Rotas após `#`, que funcionam no GitHub Pages sem configuração do servidor |

## 12. Evidências e documentação

- [README da versão publicada](https://github.com/Heitodino78/studylab/blob/a9baf8f/README.md).
- [Decisões de arquitetura](https://github.com/Heitodino78/studylab/blob/a9baf8f/docs/ARCHITECTURE.md).
- [Verificação de qualidade](https://github.com/Heitodino78/studylab/blob/a9baf8f/docs/QUALITY.md).
- [Workflow de publicação](https://github.com/Heitodino78/studylab/blob/a9baf8f/.github/workflows/deploy.yml).
- [Execução de publicação concluída](https://github.com/Heitodino78/studylab/actions/runs/43976452919).
- [Licenças distribuídas](https://heitodino78.github.io/studylab/licenses.txt).

O preview de desenvolvimento foi encerrado após a validação. O acesso público é feito pelo GitHub Pages. Este relatório integra a documentação do repositório. As evidências descrevem a versão analisada; atualizações posteriores podem ser consultadas no histórico do GitHub.
