# Documentação do StudyLab

O código-fonte completo, testes, configuração de build, lockfile, workflow, recursos próprios e licenças ficam neste repositório, junto com a documentação abaixo.

## Entrega e funcionamento

- **[Relatório completo](../RELATORIO-STUDYLAB.md):** entregas, desenvolvimento, participantes, funcionalidades verificadas, limitações e propostas de evolução.
- [Guia do projeto](../README.md): execução local, testes, build, publicação e regras de aprendizagem.
- [Arquitetura](ARCHITECTURE.md): persistência, domínio, interface e decisões técnicas.
- [Qualidade](QUALITY.md): testes e limites das verificações.
- [Validação e publicação](VALIDACAO-E-PUBLICACAO.md): versão verificada, auditoria, Actions e QA online.
- [Roadmap](ROADMAP.md): pendências, prioridades e critérios de aceite propostos.
- [Licença do projeto](../LICENSE) e [licenças das dependências](../public/licenses.txt).

## Histórico do desenvolvimento

Os documentos históricos descrevem etapas intermediárias. As instruções e achados registrados neles não devem ser confundidos com o estado atual da aplicação.

- [Contrato de integração](processo/CONTRATO-DE-INTEGRACAO.md): divisão de responsabilidades, modelos e requisitos da etapa de completude.
- [Revisão inicial e tratamento dos achados](processo/REVISAO-INICIAL.md).

## Artefatos locais e reprodução

Dependências instaladas, caches, logs, PIDs, backups e bancos do navegador não são necessários no versionamento. As dependências são reproduzidas por `npm ci`; `dist/` é gerado pelo build e publicado como artefato do Actions. Os dados de estudo permanecem no navegador e são exportados pelo próprio estudante.

Os 84 testes automatizados e seus dados sintéticos de teste estão no código-fonte. Backups sintéticos usados na conferência manual do navegador não são conteúdo inicial da aplicação nem dados de um estudante.
