# Legal Carina

Aplicação de gestão de horas, clientes, facturação e recebimentos para um escritório de advogados.

## Stack

React 19, TypeScript, Vite 8, Tailwind CSS 4, Vitest/Testing Library e Playwright. Supabase é o backend e o serviço Cloudflare `legal-carina` é o destino de alojamento. A versão candidata actual permanece apenas local até aprovação expressa.

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

## Importação

O analisador local aceita `.xlsx` e `.csv`, calcula SHA-256, rejeita conteúdo activo e apresenta um relatório antes de qualquer gravação. A comparação com os dados existentes e a confirmação transaccional no Supabase estão preparadas localmente, mas as migrations candidatas ainda não foram aplicadas remotamente. Consulte [IMPORT_SPECIFICATION.md](IMPORT_SPECIFICATION.md).
