# Arquitetura

## Estado actual

SPA React/TypeScript compilada pelo Vite e servida por um Cloudflare Worker com Static Assets. O Supabase centraliza dados, autenticação, autorização, auditoria, ficheiros privados e Edge Functions. A tradução PT/EN/FR é mediada pelo Worker e enviada ao Azure Translator; as credenciais ficam em segredos backend e nunca no bundle.

## Fronteiras

- `components`: UI reutilizável e acessível.
- `features`: módulos de negócio isolados por domínio.
- `pages`: composição das rotas/páginas.
- `hooks`: estado e comportamento React partilhado.
- `services`: adaptadores para Supabase e APIs.
- `lib`: inicialização de bibliotecas.
- `types` e `utils`: contratos e funções puras.
- `supabase`: migrations, Edge Functions e testes de base de dados.

## Decisões

1. O browser é um cliente da plataforma online; nenhum computador local é fonte canónica de dados ou código.
2. O browser receberá apenas credenciais públicas do Supabase; operações privilegiadas ficam no servidor.
3. Tabelas expostas terão RLS e políticas por escritório/utilizador. Views deverão usar `security_invoker` quando aplicável.
4. A publicação Cloudflare é manual e exige a ordem explícita `publica`. Pushes e pull requests não podem publicar produção automaticamente.
5. O GitHub é a fonte canónica do código e `main` é a base obrigatória para trabalho novo. A antiga `codex/legalteam-distribution` fica preservada apenas como histórico; produção pode ficar temporariamente atrás de `main` quando existem correcções validadas ainda sem ordem explícita de publicação.
6. Migrations aplicadas nunca são renomeadas, apagadas ou reexecutadas por suposição. A divergência histórica é reconciliada por nome e efeito, com SQL novo e aditivo quando necessário.

Registos detalhados de decisões futuras deverão ficar em `docs/architecture/`.
