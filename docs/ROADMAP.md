# Roadmap e pendências

Este documento registra propostas; não anuncia funcionalidades já entregues. A descrição completa da versão analisada está no [relatório](../RELATORIO-STUDYLAB.md). As prioridades abaixo não são estimativas de prazo ou custo.

## 1. Confiabilidade e validação

Os três primeiros pontos foram identificados por leitura do código após a entrega e precisam de reprodução dirigida antes da implementação da correção.

| Prioridade | Trabalho | Critério de aceite proposto |
| --- | --- | --- |
| Alta | Recuperação após falha de leitura | Exportar o registro bruto, oferecer restauração/reinicialização explicitamente confirmada e garantir que cancelamento não altere o banco |
| Alta | Movimentar tópico entre disciplinas com filhos e materiais | Mostrar o impacto, atualizar vínculos atomicamente e preservar histórico; cancelar sem alterações |
| Alta | Alinhar exportação e limite de importação de backup | Informar tamanho e assegurar uma estratégia de restauração para todo backup produzido pela aplicação |
| Alta | Testes automatizados de navegador | Executar cadastro, edição, exclusão, importação, foco e simulados; verificar reload e mensagens de falha |
| Alta | Compatibilidade e acessibilidade | Conferir Safari/Firefox/celulares físicos, leitor de tela, teclado, foco, contraste e formulários |
| Alta | Lembrete e verificação de backup | Mostrar recomendação útil e permitir conferir a validade de um backup sem substituir os dados |
| Média | Tipos e validações por entidade | Reduzir campos opcionais genéricos e manter migração compatível com os dados já salvos |
| Média | Volume de dados | Medir tempo de carregamento, uso de memória e quota; definir paginação e limites com evidência |

## 2. Experiência de aprendizagem

- Fila guiada de flashcards, um cartão por vez, com resumo da sessão.
- Caderno de erros, filtros e prática direcionada por regras explicáveis.
- Editor de notas com prévia, atalhos e histórico de versões.
- Renderização matemática segura e acessível.
- Calendário/planejamento semanal com reorganização de sessões.
- Importação em lote de questões e flashcards com validação de duplicação e associações.
- Estatísticas comparativas por período e exportação CSV.

## 3. Novas capacidades

- PWA e suporte offline com estratégia de atualização de cache e preservação do banco.
- Materiais PDF e anexos, com limites, indexação e backup dos arquivos.
- Trilhas, pré-requisitos e organização de objetivos de aprendizagem.
- Exercícios de programação com execução isolada e limites definidos.
- Xadrez com tabuleiro, FEN/PGN e materiais com licenças adequadas.

## 4. Integrações posteriores

Após estabilizar o uso local, avaliar conta real, API, banco remoto e sincronização com resolução de conflitos. Importação selecionada do Obsidian, integração com Maestri e tutor opcional por pistas exigirão decisões próprias de acesso, privacidade e infraestrutura. Não há essas integrações na versão atual.

## Ordem sugerida

Registrar problemas do uso real → reproduzir e corrigir confiabilidade → ampliar testes de navegador/acessibilidade → melhorar revisão e planejamento → adicionar fórmulas/PWA → avaliar integrações remotas.

As correções de recuperação ou migração devem sempre testar preservação de dados, cancelamento e compatibilidade com backups existentes.
