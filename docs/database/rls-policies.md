# Políticas RLS

## Modelo de autorização

RLS está ativa em todas as 17 tabelas de negócio. A identidade vem exclusivamente de `auth.uid()`. Não se usa `user_metadata` nem `auth.role()`.

As funções `private.is_firm_member` e `private.has_firm_role` são `security definer`, têm `search_path` vazio e verificam explicitamente o utilizador autenticado. O schema `private` não é exposto pela API; apenas as duas verificações e a reversão controlada são executáveis por `authenticated`.

| Papel | Leitura | Escrita principal |
| --- | --- | --- |
| owner | todo o próprio escritório, incluindo auditoria | administração, financeiro, overrides e imports |
| admin | todo o próprio escritório, incluindo auditoria | referências, membros, financeiro, trabalho e imports |
| billing | todo o próprio escritório, exceto auditoria | preços, overrides, faturas, pagamentos, imports e trabalho |
| professional | todo o próprio escritório, exceto auditoria | criar/editar trabalho sem alterar campos financeiros |
| viewer | todo o próprio escritório, exceto auditoria | nenhuma |

## Princípios aplicados

- `TO authenticated` em todas as políticas; `anon` não recebe privilégios.
- Toda política filtra `firm_id`; autenticação isolada nunca equivale a autorização.
- Políticas de UPDATE têm `USING` e `WITH CHECK`.
- `auth.uid()` e helpers são envolvidos em `select` para initPlan/caching.
- Colunas usadas em membership/RLS e todas as FKs têm índices adequados.
- Não há políticas ou grants DELETE para a aplicação.
- Escritas que contêm ator exigem `created_by = auth.uid()`.

## Bootstrap

Não existe política pública para criar `law_firms`. O primeiro escritório e owner devem ser criados por uma operação administrativa controlada após autenticação/configuração do ambiente. Isto evita que qualquer conta autenticada crie tenants arbitrários.

## Testes

`supabase/tests/database/rls.test.sql` cobre:

- leitura limitada ao escritório;
- admin sem escrita cross-tenant;
- profissional capaz de criar trabalho próprio;
- profissional impedido de alterar faturação;
- billing capaz de aplicar override previamente registado;
- viewer apenas vê o seu escritório.

Executar localmente com `supabase test db --local` depois de iniciar a stack. Docker não estava disponível no ambiente de criação, portanto estes testes ainda não foram executados contra PostgreSQL real.
