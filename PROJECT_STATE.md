# Estado do projeto

Atualizado em: 2026-08-04

## Concluído nesta fase

- Repositório vazio clonado e remoto `origin` validado.
- Fundação React/TypeScript/Vite/Tailwind criada.
- Estrutura de frontend, Supabase e documentação criada.
- Testes unitário e E2E mínimos adicionados.
- Lint, teste unitário e build validados; smoke test E2E aprovado em Chromium.
- Regras de exclusão para segredos, dados e documentos reais reforçadas.
- Nenhuma credencial, dado real, migration remota ou deploy criado.
- Ficheiro-base Excel analisado localmente e sem alteração; hash e estrutura documentados.
- Importador local `.xlsx`/`.csv` com drag-and-drop, mapeamento, validação, pré-visualização e confirmação implementado.
- Duração Excel convertida para minutos inteiros; valor bruto, texto e fórmula preservados para auditoria.
- Fixture e testes de importação usam exclusivamente dados sintéticos anonimizados.
- Dependências de produção auditadas após atualização do SheetJS 0.20.3: nenhuma vulnerabilidade conhecida.

## Integrações conhecidas

- GitHub: `dabranches-collab/legal-carina`.
- Supabase: referência `vtvvqyebigflgqccbqsw` (não ligado localmente nesta fase).
- Cloudflare: serviço `legal-carina` existente (não publicado nesta fase).

## Próxima etapa

Validar requisitos funcionais, papéis/permissões e modelo de tenancy; depois desenhar o schema/lote de importação, bucket privado e políticas RLS com testes locais. Só então ativar o botão Importar.

## Riscos abertos

- Autenticação, tenancy, retenção e políticas RLS ainda não foram definidos.
- As integrações Supabase e Cloudflare ainda não foram autenticadas ou verificadas remotamente.
- A contagem de clientes existentes exige consulta futura ao Supabase; nesta fase, a folha `CLIENTES` é apenas referência local.
- O parser XLSX deve permanecer carregado sob demanda e sujeito a revisão contínua de dependências para ficheiros não confiáveis.
- As asserções E2E passam, mas o invólucro Playwright/preview não encerra automaticamente nesta sessão Windows; validar novamente no futuro CI.
