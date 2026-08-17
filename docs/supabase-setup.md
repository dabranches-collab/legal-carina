# Configuração Supabase

Projecto: `vtvvqyebigflgqccbqsw`.

## Local

O signup está desativado. O Auth local usa PKCE, rotação de refresh tokens e password mínima de 12 caracteres. Inicie a stack com a CLI/Docker, aplique migrations e use o Mailpit local para testar convites e recuperação.

```powershell
supabase start
supabase db reset
supabase test db
supabase functions serve --env-file supabase\.env.local
```

`supabase\.env.local` não é versionado e contém apenas segredos das Edge Functions, incluindo `ALLOWED_ORIGINS`, `SECURITY_EVENT_HASH_SALT` e os segredos fornecidos automaticamente pelo Supabase. A service role nunca entra no frontend.

## Documentos legais

O gate de aceitação foi retirado do fluxo e das políticas, conforme a decisão do proprietário para esta aplicação interna de gestão de clientes e facturação. As tabelas históricas do modelo não são apresentadas nem condicionam o acesso; não existem textos legais seed.

## Utilizadores e tipos

Não existe registo público. Administradores criam nome visível, username e PIN temporário, ou usam o fluxo de convite por email quando necessário. O primeiro login por PIN exige a sua substituição. Os códigos internos mapeiam para os perfis funcionais: owner=proprietário, admin=administrador, manager=gestor, billing=financeiro, professional=advogado, viewer=consulta e auditor=auditor.

Depois de aplicar a migration numa branch/staging, gere novamente os tipos:

```powershell
supabase gen types typescript --project-id vtvvqyebigflgqccbqsw | Set-Content -Encoding utf8 src\types\database.types.ts
```

Antes de produção: executar pgTAP, `supabase db advisors`, rever RLS, configurar SMTP próprio e URLs autorizadas. SMTP próprio e controlos avançados de duração/sessão podem implicar custos; confirmar o plano antes.

## Storage

O original importado, se for conservado, usa o bucket privado `legal-imports`, com limite declarado de 50 MB, MIME types `.xlsx`/`.csv` e políticas por `firm_id`. Documentos de clientes usam o bucket privado `client-documents`, ligações assinadas de 60 segundos e a Edge Function `client-documents`; escritas directas do browser ficam revogadas para impedir que se contorne a validação de conteúdo. As migrations documentais `20260817095147`, `20260817095157` e `20260817095316`, bem como `20260817095206` para identificadores, foram aplicadas isoladamente ao remoto em 2026-08-17, sem `db push` das restantes migrations divergentes.
