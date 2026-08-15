# Configuração Cloudflare

## Estado encontrado

O serviço Worker `legal-carina` serve a aplicação React através de Workers Static Assets em `https://legal-carina.dabranches.workers.dev`.

## Decisão recomendada

Foi adotado **Workers Static Assets**, sem criar um projeto Pages paralelo. `wrangler.jsonc` é a configuração versionada usada no deploy; `wrangler.proposed.jsonc` permanece apenas como registo da proposta inicial.

## Plano

1. Build, testes, secret scan e auditoria do bundle.
2. Deploy de `dist` em `legal-carina` com fallback SPA.
3. Smoke test HTTPS e inspeção da consola.
4. Configurar posteriormente domínio definitivo, preview isolado e passkeys para esse domínio.

## Impacto

O Worker serve a aplicação estática e esta contacta diretamente o Supabase autorizado. Não existem segredos Cloudflare no bundle; apenas variáveis públicas `VITE_*` fazem parte do build.

## Rollback

Usar `wrangler rollback <VERSION_ID>` ou o dashboard para restaurar uma versão anterior. A versão publicada em 2026-08-16 é `78a85830-f22f-4a0f-a80d-c4ca260ff2f7`.

## Variáveis

- local: `.env.local`, projeto Supabase local/staging.
- preview: `VITE_APP_ENV=preview`, URL e chave publicável de staging; dados exclusivamente sintéticos.
- production: `VITE_APP_ENV=production`, URL e chave publicável de produção.

Antes de futuras alterações de produção, repetir build, testes, bundle scan, dry-run, registo da versão anterior e smoke test pós-deploy.
