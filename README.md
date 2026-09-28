# Legal Carina

Aplicação de gestão de horas, clientes, facturação e recebimentos para um escritório de advogados.

## Stack

React 19, TypeScript, Vite 8, Tailwind CSS 4, Vitest/Testing Library e Playwright. O Supabase é o backend central (dados, autenticação, RLS, Storage e Edge Functions), o Worker Cloudflare `legal-carina` serve a aplicação e o Azure Translator trata a tradução de documentos através do Worker.

## Estado canónico

- Em preparação local: `0.12.11` na branch `codex/overview-navigation-0.12.11`, com os submenus de dashboards e listas, alertas sem preço e rótulos dos movimentos recentes. Ainda não publicada.
- Versão publicada: `0.12.10`, confirmada directamente em `HANDOVER.md`.
- Fonte canónica no GitHub: `main`; a versão publicada foi integrada pelo PR #73 e o registo de publicação consta de `HANDOVER.md`.
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
