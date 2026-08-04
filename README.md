# Legal Carina

Aplicação de gestão de horas, clientes, faturação e recebimentos para um escritório de advogados.

## Stack

React 19, TypeScript, Vite 8, Tailwind CSS 4, Vitest/Testing Library e Playwright. Supabase será o backend e o serviço Cloudflare `legal-carina` será o destino de alojamento, sem deploy nesta fase.

## Desenvolvimento local

Requer Node.js compatível com Vite 8 e pnpm.

```bash
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm dev
```

Preencher `.env.local` apenas com a URL e a chave pública/publishable do projeto Supabase. Nunca usar a `service_role` no frontend.

## Verificação

```bash
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Consulte [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md) e [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md).

## Importação

O analisador local aceita `.xlsx` e `.csv`, calcula SHA-256 e apresenta um relatório antes de qualquer gravação. A importação remota está desativada até existir backend com RLS e bucket privado. Consulte [IMPORT_SPECIFICATION.md](IMPORT_SPECIFICATION.md).
