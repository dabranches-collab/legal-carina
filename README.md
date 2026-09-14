# Legal Carina

Aplicação de gestão de horas, clientes, facturação e recebimentos para um escritório de advogados.

## Stack

React 19, TypeScript, Vite 8, Tailwind CSS 4, Vitest/Testing Library e Playwright. O Supabase é o backend central (dados, autenticação, RLS, Storage e Edge Functions), o Worker Cloudflare `legal-carina` serve a aplicação e o Azure Translator trata a tradução de documentos através do Worker.

## Estado canónico

- Versão publicada: `0.10.13`; release `0.10.14` em preparação para corrigir a mudança de vertente para Empresa e o diagnóstico do arquivo documental.
- Fonte canónica do código no GitHub: `main`, no commit `db0dbd758d8ed0d97f2e5d1533a30beacba74e74`.
- A branch `codex/legalteam-distribution` fica preservada apenas como histórico da linha anteriormente publicada.
- Produção: `https://legal-carina.dabranches.workers.dev`.
- A release 0.10.13 apresenta progressivamente a tabela de registos e concede à P. Chaves a leitura detalhada dos movimentos sem sociedade. A 0.10.14 corrige os códigos de novas vertentes em clientes existentes e revela a resposta funcional real do serviço documental.

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
