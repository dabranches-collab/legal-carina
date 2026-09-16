# Legal Carina

Aplicação de gestão de horas, clientes, facturação e recebimentos para um escritório de advogados.

## Stack

React 19, TypeScript, Vite 8, Tailwind CSS 4, Vitest/Testing Library e Playwright. O Supabase é o backend central (dados, autenticação, RLS, Storage e Edge Functions), o Worker Cloudflare `legal-carina` serve a aplicação e o Azure Translator trata a tradução de documentos através do Worker.

## Estado canónico

- Versão publicada: `0.10.20`. O pré-filtro «Pagos s/ factura ou data» exclui movimentos pagos com data ou número de factura comprovados; os cartões têm molduras mais visíveis e os filtros de coluna desactivam opções sem resultados.
- Fonte canónica no GitHub: `main`; o commit funcional publicado é `82a0b35b13734c00701dbd5eac62d352aa80f5e7`.
- A branch `codex/legalteam-distribution` fica preservada apenas como histórico da linha anteriormente publicada.
- Produção: `https://legal-carina.dabranches.workers.dev`.
- As alterações e os identificadores do deployment activo estão registados em [HANDOVER.md](HANDOVER.md) e [docs/deployment.md](docs/deployment.md).

Consulte [a auditoria de continuidade](docs/continuity-audit-2026-09-14.md) antes de alterar autenticação, permissões, migrations, Storage ou publicação.

## Desenvolvimento local

Requer Node.js compatível com Vite 8 e pnpm.

```bash
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm dev
```

Preencher `.env.local` apenas com a URL e a chave pública/publishable do projecto Supabase. Nunca usar a `service_role` no frontend.

## Verificação

```bash
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Consulte [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md) e [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md).

## Importação histórica

O analisador aceita `.xlsx` e `.csv`, calcula SHA-256, rejeita conteúdo activo e apresenta um relatório antes de qualquer gravação. A plataforma online é agora a fonte corrente; o importador permanece para reconciliação histórica controlada e nunca autoriza limpeza automática. Consulte [IMPORT_SPECIFICATION.md](IMPORT_SPECIFICATION.md).
