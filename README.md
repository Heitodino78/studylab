# StudyLab

Um espaço pessoal para estudar, praticar e acompanhar o aprendizado. Todas as disciplinas e materiais são cadastrados por você; a instalação começa vazia. Não há respostas de IA, cadastro fictício ou estatísticas demonstrativas.

**Aplicação:** https://heitodino78.github.io/studylab/  
**Código:** https://github.com/Heitodino78/studylab

## Funcionalidades

- **Visão geral:** saudação personalizável, foco do dia/semana, metas mensuráveis, revisões, exercícios, prazos, sequência de estudo e gráficos de dados registrados.
- **Disciplinas e assuntos:** cores, ícones, hierarquia de tópicos/subtópicos, prioridades, estados e progresso derivado.
- **Biblioteca:** notas Markdown, blocos de código, listas, ênfase, links seguros, notas relacionadas, busca e organização por disciplina/assunto.
- **Exercícios:** múltipla escolha corrigida pela resposta cadastrada, discursivas com avaliação manual explícita, dificuldade, filtros e histórico de tentativas.
- **Flashcards:** revelar/avaliar, fila de pendentes, histórico de revisões e agendamento SM-2 determinístico.
- **Planejamento:** tarefas, metas diárias/semanais em minutos, provas, prioridade, prazos e cronograma de atrasos.
- **Foco:** Pomodoro com pausas curtas/longas e ciclos, cronômetro livre, pausar/continuar/reiniciar, disciplina e histórico. Usa horários reais e retoma após recarregar.
- **Estatísticas:** tempo por disciplina, frequência, evolução, revisões, taxa de acertos e assuntos com erros. Recomendações descrevem a regra utilizada.
- **Simulados:** filtros por disciplinas/assuntos/dificuldade, quantidade, prazo opcional com encerramento automático, retomada, resultado e revisão. As questões são copiadas no início para preservar resultados após edições/exclusões.
- **Ajustes:** tema claro/escuro/sistema, preferências, exportação e importação JSON completa com validação, confirmação de substituição/limpeza e exportação bruta para recuperação.
- Navegação com sidebar no desktop, atalhos e menu modal no celular, teclado, foco visível e gráficos com alternativa em tabela.

## Executar localmente

Requer **Node.js 22.12 ou superior** e npm. O arquivo `.nvmrc` seleciona Node 22 em instalações com nvm.

```sh
git clone https://github.com/Heitodino78/studylab.git
cd studylab
npm ci
npm run dev
```

Abra o endereço informado pelo Vite, normalmente `http://localhost:5173/studylab/`.

```sh
npm test          # Vitest: regras e IndexedDB
npm run build    # TypeScript estrito + build para dist/
npm audit        # Auditoria das dependências
```

Para conferir a distribuição localmente: `npx vite preview --host 127.0.0.1`, usando o caminho `/studylab/`.

## Tecnologias e estrutura

React 18, TypeScript, Vite 6, React Router 7 (`HashRouter`), IndexedDB nativo, Vitest 4 e `fake-indexeddb` somente em testes. A interface, os ícones SVG e os gráficos são próprios; não há biblioteca de gráficos, backend nem API paga.

```text
src/
  components/       Markdown seguro, ícones e tratamento de erro de renderização
  context/          Estado React e coordenação das gravações
  domain/           SM-2, questões, foco, simulados e análises: funções testáveis
  models/           Tipos e valores iniciais
  pages/            CRUD integrado e páginas de aprendizagem
  storage/          Contrato de persistência, transações, migração e backups
  main.tsx          Rotas, navegação e aparência
  style.css         Sistema visual e responsividade
public/             Recursos próprios
.github/workflows/  Testes, build e publicação Pages
```

Veja [as decisões de arquitetura](docs/ARCHITECTURE.md) e [a validação da entrega](docs/QUALITY.md).

## Dados, privacidade e recuperação

O conteúdo é salvo no **IndexedDB do navegador e perfil usados**, separado por origem do site. Não é enviado ao GitHub ou a um servidor do StudyLab. O GitHub Pages recebe as solicitações normais dos arquivos estáticos da aplicação.

Não existe sincronização entre computadores, navegadores, perfis ou entre o preview local e o site publicado. Limpar dados do site, usar navegação anônima, perder o perfil ou a remoção de dados pelo navegador pode apagar seus registros. Exporte backups regularmente em **Ajustes**. A solicitação de armazenamento persistente depende da decisão do navegador e não substitui backup.

O backup JSON v2 inclui todas as coleções, preferências, estado de foco e simulado em andamento. A importação valida estrutura, limites, referências, enums e dados aninhados antes de mostrar o resumo e pedir confirmação para substituir. O formato inicial v1 é migrado. Arquivos acima de 10 MB são rejeitados. Em falha de leitura, a escrita é bloqueada e é possível exportar dados brutos para recuperação; esse arquivo bruto não é um backup importável.

Markdown é interpretado como texto seguro, sem HTML bruto ou links `javascript:`. Implementa um subconjunto: títulos, listas, ênfase, código e links HTTP(S). Fórmulas matemáticas permanecem como texto; tabelas Markdown, LaTeX renderizado, anexos e PDFs ainda não são suportados.

## Atualizações e GitHub Pages

1. Faça alterações em uma branch e execute `npm test` e `npm run build` com Node 22.
2. Revise as mudanças e integre em `main`. Não inclua backups, credenciais ou dados pessoais.
3. O workflow [deploy.yml](.github/workflows/deploy.yml) executa `npm ci`, testes e build; só publica `dist/` se todos passarem. Pull requests executam validação sem deploy.
4. Confira o resultado em **Actions** e a URL em **Settings → Pages**. A origem de publicação deve ser **GitHub Actions**.

A base do Vite é `/studylab/`. As rotas usam `#/`, permitindo atualizar uma página interna sem depender de rewrites do servidor. Uma futura mudança de nome do repositório exige ajustar essa base.

## Regras de aprendizagem

SM-2 usa avaliações inteiras de 0 a 5. Uma nota abaixo de 3 reinicia a sequência e agenda revisão em 1 dia; sucessos usam 1 dia, 6 dias e depois o intervalo anterior multiplicado pelo fator de facilidade anterior, arredondado. O fator é ajustado pela fórmula SM-2 e limitado a 1,3. Nesta variante também é ajustado após uma falha. Os intervalos representam períodos de 24 horas.

A taxa de acertos considera tentativas objetivas e discursivas avaliadas manualmente; pendentes ficam fora do denominador. Questões em branco de um simulado reduzem a nota do simulado, mas não criam uma tentativa de exercício. As recomendações são regras estatísticas transparentes, sem IA.

O Pomodoro registra no máximo a duração-alvo da fase e prepara uma pausa **parada**, evitando atribuir horas de ausência ao estudo. O cronômetro livre conta até pausar ou registrar; depende do relógio do dispositivo. Sessões menores que 1 segundo são descartadas. Avisos e atualizações visuais dependem das permissões e do agendamento do navegador; os cálculos se recuperam pelos horários ao retornar.

## Evolução

Prioridades futuras: PWA/offline, importação de materiais e renderização matemática; depois repositório remoto e sincronização com migrações, autenticação real e API. Tutor de IA, geração de exercícios, Obsidian e Maestri são integrações futuras, ainda não implementadas. A camada de armazenamento e o domínio independente permitem evoluir sem reconstruir a interface.

## Licença

Código e recursos próprios sob [MIT](LICENSE). Dependências mantêm suas respectivas licenças, disponíveis nas distribuições dos pacotes.
