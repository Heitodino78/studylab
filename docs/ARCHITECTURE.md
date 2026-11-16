# Arquitetura

## Dados e persistência

`models` define as entidades, preferências e os estados de foco/simulado. `storage` é a fronteira de persistência: `load`, `updateAtomic`, `save`, `parseBackup`, `exportBackup` e `exportRaw`. A interface usa o contexto, sem acessar IndexedDB diretamente; uma implementação remota poderá substituir essa fronteira preservando as funções puras do domínio.

Nesta versão pessoal, as coleções são guardadas como um documento versionado no IndexedDB. Cada alteração lê o estado atual, aplica a função síncrona, valida e grava dentro da mesma transação de leitura/escrita. A Promise só confirma depois de `oncomplete`; exceções e abortos não confirmam o estado. O contexto serializa ações e usa BroadcastChannel para atualizar outras abas. Uma falha de leitura bloqueia alterações e disponibiliza exportação bruta.

Backups v2 incluem registros, configurações e atividades em andamento. A validação rejeita chaves inesperadas, IDs duplicados, limites excedidos, datas/valores inválidos, ciclos e referências quebradas. O importador suporta o formato inicial v1. Não realiza merge: substitui o documento somente depois de resumo e confirmação.

## Domínio

- `sm2`: algoritmo de revisão documentado no README, sem dependência de React.
- `questions`: avalia apenas questões objetivas contra o gabarito cadastrado; discursivas usam ações explícitas de avaliação manual.
- `focus`: transições de fases com timestamps, pausas sem crédito, teto do Pomodoro e IDs determinísticos para impedir registros duplicados.
- `simulation`: seleção Fisher–Yates, filtros, snapshots, respostas persistidas, prazo e encerramento idempotente. Histórico preservado mesmo com exclusão de materiais.
- `analytics`: períodos no calendário local, agregações e regras explicáveis; sem dados artificiais ou serviço de IA.

Os watchers completam fases e simulados em qualquer rota. A atualização visual pode ser suspensa pelo navegador; ao retornar, o resultado usa o horário de encerramento correto, sem depender de quantos ticks ocorreram.

## Interface

HashRouter com base Vite `/studylab/`; tema por preferência do usuário ou sistema; sidebar e menu modal mobile; foco do teclado encaminhado ao título ao navegar. Gráficos SVG próprios com tabelas equivalentes. React escapa o conteúdo Markdown; não se usa HTML bruto de notas.

## Publicação

O workflow valida PRs e, em `main`, instala pelo lockfile, testa, verifica os tipos, gera e publica o artefato `dist`. Permissões de `pages` e `id-token` existem somente no job de deploy. As execuções de publicação em curso não são canceladas por novos pushes.

Referências oficiais consultadas em 2026-11-16:

- [GitHub Pages e workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
- [Publicação estática do Vite](https://vite.dev/guide/static-deploy.html#github-pages).

## Limites e próximos desenhos

O documento único simplifica atomicidade e exportação, mas não é ideal para bibliotecas muito grandes. Há limite de 50 mil registros e importação de 10 MB. Uma API futura precisará de autenticação, autorização, paginação, concorrência remota, esquema de migrações e estratégia de conflitos. O contrato atual prepara a separação; não pretende implementar sincronização nesta versão.
