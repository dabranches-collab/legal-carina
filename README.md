## Versão publicada — 0.16.3

Confirmada em 10-10-2026: menu **Registos**, categorias **PARTICULARES/EMPRESAS/MISTOS**, sugestões de clientes nos formulários e pesquisa livre distinta nas listas. [Aplicação](https://legal-carina.dabranches.workers.dev). Build oficial fixa a navegação; dados de negócio preservados. Ver HANDOVER.md para fonte, CI, implantação, incidente concorrente e pedidos pendentes.

# Legal Carina

Aplicação de gestão de horas, clientes, facturação e recebimentos para um escritório de advogados.

## Stack

React 19, TypeScript, Vite 8, Tailwind CSS 4, Vitest/Testing Library e Playwright. O Supabase é o backend central (dados, autenticação, RLS, Storage e Edge Functions), o Worker Cloudflare `legal-carina` serve a aplicação e o Azure Translator trata a tradução de documentos através do Worker.

## Estado canónico

- Versão publicada: `0.16.3`, confirmada no browser e pelos hashes dos assets em 10-10-2026. Gráficos com scroll horizontal abrem no último período.
- Fonte canónica no GitHub: `main`; fonte publicada `e525a651115300445f07be002586090433d4fdde`, integrada pelo PR #103 em `c6ec17aad4ea5b3b81006775d96fa357fb62e39e`. Identificadores, validações e incidente de upload secundário em `HANDOVER.md`.
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
