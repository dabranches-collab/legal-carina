# Arquitetura

## Estado atual

SPA React/TypeScript compilada pelo Vite. A interface está separada por componentes e páginas; integrações externas ainda não foram ativadas.

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

1. SPA estática nesta fase; autenticação e modelo de dados serão desenhados antes da integração.
2. O browser receberá apenas credenciais públicas do Supabase; operações privilegiadas ficam no servidor.
3. Tabelas expostas terão RLS e políticas por escritório/utilizador. Views deverão usar `security_invoker` quando aplicável.
4. O deploy Cloudflare será configurado e validado numa fase posterior, sem duplicar o backend Supabase.

Registos detalhados de decisões futuras deverão ficar em `docs/architecture/`.
