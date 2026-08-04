# Análise e proposta Cloudflare

## Estado encontrado

O serviço Worker `legal-carina` existe e responde atualmente apenas `Hello world`. Não contém os assets da aplicação. Nenhuma configuração remota foi alterada.

## Decisão recomendada

Usar **Workers Static Assets**, não criar um projeto Pages paralelo. O serviço já é Worker; Static Assets serve a SPA Vite e preserva a possibilidade de acrescentar lógica edge e observabilidade sem uma migração posterior. `wrangler.proposed.jsonc` é apenas uma proposta e não deve ser usado para deploy sem aprovação.

## Plano

1. Confirmar domínio, conta, plano e nomes de ambientes.
2. Criar `legal-carina-preview` sem domínio de produção e com variáveis públicas do Supabase de staging.
3. Fazer build com `VITE_APP_ENV=preview`, publicar preview e executar smoke tests sem dados reais.
4. Guardar a versão Worker atualmente ativa e exportar as definições.
5. Só após aprovação, publicar `dist` em `legal-carina` com fallback SPA e associar o domínio.

## Impacto

O Worker `Hello world` deixa de responder e passa a servir a aplicação estática. A aplicação contactará diretamente o Supabase autorizado. Não são necessários segredos Cloudflare no bundle; apenas variáveis `VITE_*` públicas no build.

## Rollback

Reverter imediatamente para a versão anterior do Worker no dashboard/API, restaurando `Hello world`, e remover/ajustar o domínio se tiver sido associado. Manter o artefacto e identificador da versão anterior antes da promoção.

## Variáveis

- local: `.env.local`, projeto Supabase local/staging.
- preview: `VITE_APP_ENV=preview`, URL e chave publicável de staging; dados exclusivamente sintéticos.
- production: `VITE_APP_ENV=production`, URL e chave publicável de produção.

Não executar `wrangler deploy` sem apresentar e aprovar novamente plano, impacto, rollback e variáveis. Workers Static Assets possui limites por plano; confirmar o plano antes da publicação.
