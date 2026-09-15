# Legal Carina

Aplicação de gestão de horas, clientes, facturação e recebimentos para um escritório de advogados.

## Stack

React 19, TypeScript, Vite 8, Tailwind CSS 4, Vitest/Testing Library e Playwright. O Supabase é o backend central (dados, autenticação, RLS, Storage e Edge Functions), o Worker Cloudflare `legal-carina` serve a aplicação e o Azure Translator trata a tradução de documentos através do Worker.

## Estado canónico

- Versão publicada: `0.10.16`; versão `0.10.17` em validação local melhora os logótipos, acrescenta pré-visualização com escolha da pasta ao guardar PDF ou Word e bloqueia qualquer cruzamento de identidade entre sociedades.
- Fonte canónica do código publicado no GitHub: `main`, no commit `0a4aa70350f7740afeadd8f5000d0fc243b383c0`.
- A branch `codex/legalteam-distribution` fica preservada apenas como histórico da linha anteriormente publicada.
- Produção: `https://legal-carina.dabranches.workers.dev`.
- A release 0.10.16 acrescenta tratamento formal por cliente, escolha obrigatória na emissão quando omisso e o cabeçalho/rodapé profissional da Carina Santos; a 0.10.15 colocou `Registos` imediatamente depois de `Visão Geral` no menu principal.

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
