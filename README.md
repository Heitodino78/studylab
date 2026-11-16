# StudyLab

Aplicação local de estudos em React, TypeScript e Vite, compatível com Node 18. Dados são armazenados em IndexedDB neste navegador; exporte backups regularmente. Não há conta ou sincronização. A navegação usa hash e a base de publicação é `/studylab/`.

Instalação: `npm install`; desenvolvimento: `npm run dev`; testes: `npm test`; produção: `npm run build`.

Disciplinas, tópicos, biblioteca, questões, flashcards e planejamento são editáveis. Questões discursivas são registradas para revisão manual e não entram na taxa de acerto. Pontos fracos exigem ao menos três respostas objetivas e taxa inferior a 70%. O foco mede tempo por timestamps; registre a sessão para incluí-la nas estatísticas. O relógio do simulado é informativo e a finalização é manual.

O SM-2 usa notas inteiras de 0 a 5. Notas inferiores a 3 reiniciam a sequência e agendam em um dia; sucessos usam intervalos de 1, 6 e depois o intervalo anterior multiplicado pelo fator de facilidade anterior. O fator segue a fórmula SM-2 com mínimo de 1,3. O backup JSON versionado substitui todos os dados após confirmação; arquivos maiores que 10 MB e referências inválidas são rejeitados.
