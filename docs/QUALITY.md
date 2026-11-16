# Verificação da versão inicial

Verificações realizadas em 2026-11-16. Este documento registra a validação local; o resultado de cada publicação está disponível em [GitHub Actions](https://github.com/Heitodino78/studylab/actions).

## Testes automatizados

Vitest com Node 22: **84 testes passaram em 11 arquivos** na validação final local. Cobertura funcional dos seguintes casos:

- SM-2: progressão dos intervalos, falhas, fator mínimo e notas inválidas.
- Questões: avaliação objetiva e separação da avaliação manual.
- IndexedDB com `fake-indexeddb`: salvar/carregar, concorrência de transações, aborto sem perda, dados inválidos e referências.
- Backups: v1/v2, campos desconhecidos, duplicados, ciclos, limites, migração e roundtrip.
- Foco: timestamps, pausas, recarga, teto da fase, pausa parada, ciclos e idempotência.
- Simulados: Fisher–Yates, seleção/filtros, contagem impossível, snapshots, prazo, respostas bloqueadas após expiração, encerramento idempotente e assunto movido para outra disciplina.
- Análises: dia/semana no calendário local, séries, frequência, acertos, metas e recomendações.
- Integração: validar e exportar os registros produzidos pelo encerramento de foco/simulado.

`npm run build` inclui a verificação estrita de TypeScript e a distribuição Vite. O workflow repete testes e build antes de cada deploy.

## Navegador real no Maestri

Os dados usados foram criados exclusivamente para QA no armazenamento do preview; não são incluídos no código publicado.

| Fluxo | Resultado observado |
| --- | --- |
| Disciplina e assunto | Criação por formulário; disciplina preservada após reload; associação da nota/questão ao assunto |
| Biblioteca | Títulos, ênfase, listas, whitespace de bloco de código; `<script>` e link `javascript:` ficaram inertes |
| Exercícios | Múltipla escolha correta; discursiva registrada e depois marcada manualmente; histórico persistido |
| Flashcards | Revelar, avaliar, registrar revisão e agendar para o dia seguinte |
| Simulado | Resposta preservada após reload; resultado 1/1 e revisão; execução de 1 minuto encerrada automaticamente, inclusive fora da rota de simulado |
| Foco | Pausa preservada após reload; sessão manual registrada; fase de 1 minuto creditada em exatamente 60.000 ms, seguida de pausa longa parada |
| Planejamento | Prazo vencido identificado; meta diária em minutos e prova com data cadastradas |
| Backup | Arquivo inválido rejeitado sem substituição; backup válido com prévia e restauração das coleções, preferências e histórico |
| Confirmação | Diálogo da aplicação com foco em Cancelar, cancelamento e aceitação explícita; substitui confirmações nativas que bloquearam o portal de QA |
| Responsividade | 13 rotas a 390 px, sem erro de renderização ou overflow horizontal; menu modal e navegação inferior; também conferido em desktop de 1440 px |
| Aparência | Alternância claro/escuro preservada; estatísticas alimentadas pelos registros de QA |

## Revisão e correções

A revisão independente identificou risco de sobrescrita entre abas, leitura inválida sem rejeição, histórico dependente das questões atuais e módulos incompletos. A implementação foi ampliada e corrigida com transações atômicas, recuperação, snapshots e testes de integração. Uma regressão adicional verificou que mover um assunto durante um simulado não impede a gravação do resultado.

As dependências iniciais foram atualizadas para versões compatíveis com Node 22. A auditoria atualizada registrou **0 vulnerabilidades**; o lockfile acompanha o código. Execute `npm audit` para verificar novos alertas do registro ao atualizar a aplicação.

## Limites da evidência

QA de navegador foi realizado no Chromium embutido do Maestri, sem uma matriz completa de Safari/Firefox ou leitor de tela. Testes de armazenamento automatizados usam IndexedDB simulado; a criação, gravação, recuperação por reload e importação foram conferidas também no navegador real. O sistema depende do relógio do dispositivo e dos limites de armazenamento do navegador. Não há sincronização, PWA ou renderização LaTeX nesta versão.
