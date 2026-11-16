# Validação, infraestrutura e publicação

Registro da entrega validada em 16/11/2026. As evidências de funcionamento se referem ao commit `a9baf8f1b2b6bedf8407d8d2abba60a48d71df66`; atualizações de documentação posteriores não alteram esses resultados históricos.

## Fonte e publicação verificadas

| Item | Evidência |
| --- | --- |
| Repositório público | https://github.com/Heitodino78/studylab |
| Branch | `main` |
| SHA local e remoto da entrega | `a9baf8f1b2b6bedf8407d8d2abba60a48d71df66` |
| Workflow | `Test and deploy StudyLab` |
| Execução de entrega | https://github.com/Heitodino78/studylab/actions/runs/43976452919 |
| Jobs | `build` e `deploy`: `completed` / `success` |
| Etapas verificadas | `npm ci`, `npm test`, `npm run build`, upload do artefato e deploy |
| Site oficial | https://heitodino78.github.io/studylab/ |
| Disponibilidade observada | HTML e `licenses.txt` retornaram HTTP 200; aplicação aberta no navegador |

A execução também foi conferida pelo Coordenador via integração GitHub, independentemente do relatório do agente que fez o push. As execuções posteriores ficam disponíveis na aba Actions do repositório.

## Ferramentas e dependências

O ambiente inicial usava Node 18.19.1 e npm 9.2.0. As dependências iniciais tinham sete alertas de segurança, e a instalação encontrou restrições de rede nos primeiros ambientes. A instalação e o envio foram executados com acesso autorizado no ambiente do agente responsável.

Foi utilizado um ambiente local isolado com Node 22.23.5 e npm 11.21.2, preservando o Node do sistema. O projeto declara Node >=22.12.0 e `.nvmrc` com Node 22. O npm 9 inicial apresentou incompatibilidade na instalação da nova árvore de dependências; a instalação foi concluída com o npm atualizado.

Versões resolvidas na entrega:

| Pacote | Versão |
| --- | --- |
| React / React DOM | 18.3.1 |
| React Router DOM | 7.18.5 |
| Vite | 6.4.6 |
| Vitest | 4.1.12 |
| TypeScript | 5.9.3 |
| Plugin React do Vite | 4.7.0 |
| fake-indexeddb | 6.2.8 |

A auditoria `npm audit --json` atualizada registrou **zero vulnerabilidades**. Isso descreve a auditoria daquela entrega, não uma garantia permanente contra alertas futuros. O lockfile contém as versões reproduzíveis.

## Testes e build

- **84 testes passaram em 11 arquivos**, com Node 22.
- `tsc --noEmit` e `vite build` passaram.
- Cobertura funcional: SM-2, avaliação de questões, foco, simulados, análises, validação/migração de backup, transações, concorrência, abortos e integração dos registros produzidos pelo domínio.
- Uma regressão comprovou que a correção de associação de assunto no encerramento do simulado evita a falha observada com a lógica anterior.
- Consulte [QUALITY.md](QUALITY.md) para os casos e limites da evidência.

## Navegador e site publicado

Os testes manuais usaram somente dados sintéticos criados para QA.

- JavaScript e CSS carregaram no endereço público. Os assets verificados foram `assets/index-C1gqMYS5.js` e `assets/index-Om_anZbn.css`, correspondentes ao build local daquela entrega.
- Foi conferido o estado inicial vazio, sem estatísticas inventadas.
- Houve cadastro por formulário, persistência após reload, importação de backup com confirmação, renderização segura de nota e registro de resposta objetiva correta no site público.
- As 13 rotas renderizaram títulos esperados a 390 px, sem alerta de erro ou overflow horizontal. O console capturado ficou sem erros.
- Houve conferência adicional em desktop de 1440 px.
- No QA local, o simulado de um minuto encerrou em 60.000 ms fora da sua rota. O foco registrou exatamente 60.000 ms e preparou a pausa longa parada.
- A confirmação dentro da aplicação foi verificada com cancelamento e aceitação explícita, com foco inicial no botão Cancelar.
- Os dados sintéticos usados no site público foram removidos pela interface; após reload, o dashboard retornou ao estado vazio.

## Encerramento do ambiente de preview

Após a validação online, apenas o servidor Vite iniciado para este projeto foi encerrado. Foi confirmado que seus processos não estavam mais ativos e a porta local do preview fechou. Nenhum arquivo foi apagado, outros projetos não foram encerrados e a publicação Pages continuou independente do preview.

## Limites

O QA de navegador foi realizado no Chromium embutido do Maestri. Não houve uma matriz completa de Safari, Firefox, celulares físicos ou leitor de tela. O armazenamento automatizado usa fake-indexeddb, complementado pelos testes de gravação e reload no navegador real. Os detalhes de melhorias ainda necessárias constam no [relatório](../RELATORIO-STUDYLAB.md) e no [roadmap](ROADMAP.md).
