## 2026-10-10 — 0.16.1 publicada e confirmada

Publicação autorizada concluída. PR #96 integrada em main 89fabd9d5cc0245f8ae8a1994c48a07a0a25f8b6; fonte funcional 2d963d1f8f295cdafeb2b1d0dbb49de14e3c971b. CI 38039545139 e secret scan 38039545140 aprovados: 351 unitários, 61 contratos SQL, 64 integração, 174 regressão e quatro PWA. Segurança, tipos, build real e dry-run aprovados. 25 E2E locais dirigidos passaram; a regressão completa local encontrou limitação preexistente de imports absolutos Windows, resolvida no âmbito de validação pela suite completa Linux na CI.

Worker https://legal-carina.dabranches.workers.dev, **0.16.1**, Version ID b9f159f8-4436-445b-a5f8-6a996aec1222, deployment 2793142a-9012-41e8-8814-dcace4376401, 100% desde **10-10-2026 10:17:31 WAT** (2026-10-10T09:17:31.265577Z). Dez assets públicos exactamente iguais ao build real, Auth verificado pela guarda e five-areas fixado no build oficial. Sessão existente confirmou 0.16.1, menu **Registos**, opções PARTICULARES/EMPRESAS/MISTOS e ausência de alerts. Evidência sanitizada: output/publication-0161-receipt.json, publica-public-hashes-0161.json e publication-0.16.1-proof.png.

Sem migrations ou alterações a dados/ACL/Auth/Storage nesta publicação. Contagens/hashes das **51 relações de negócio/Storage** iguais antes/depois. auth.users conserva cinco utilizadores; o hash mudou durante a sessão, sem atribuição de causa. Não inferir perda de dados a partir dessa mudança de metadados. Nove RPC dos filtros confirmados com acesso autenticado e anon revogado.

Após o upload identificado surgiu outro upload Wrangler sem mensagem/commit: Version ID 7556cf3c-6a28-4f65-80a2-bc4c95bbd822, 09:14:26 UTC, com assets diferentes. Origem ainda não identificada; não atribuir a pessoa/chat/automatização sem evidência. Foi activado o artefacto revisto b9f159f8 e confirmados hashes/sessão após activação. O build oficial impede omissão da navegação nas builds actuais; não garante que outro emissor não publique um checkout antigo. Investigar a origem antes de afirmar controlo exclusivo da publicação. Rollback frontend: e175a768-fbaf-4239-a5d5-bc2b5d9d2cfc (0.16.0), preservando dados/migrations.

**Guardar rascunho com cliente/data e indicadores vermelho/verde permanecem pendentes, fora desta release.** Safari/iPhone físico, tradução Azure e upload/download reais continuam não certificados. Este registo documental é um checkpoint de continuidade, sem novo deploy; entradas abaixo são históricas.


## 2026-10-03 - 0.13.3 publicada: configuracao e filtros repostos

- PR86 integrada em main no merge bca7be0; funcional1f02023. CI37143058853 aprovada, incluindo290 testes, E2E, PWA, auditoria e secret scan. Finding4174232454 corrigido/resolvido: fingerprint obrigatoria da chave publica do projecto existente.
- Cloudflare Version ID23529d47-2201-4175-b422-d2ab5b9a8f6a,100% desde2026-10-03T18:19:24Z. Online release-notes0.13.3, JS index-BXef7Ne2.js com URL/fingerprint correctos, formulario Entrar e cache carina-legal-shell-0.13.3 confirmados. URL https://legal-carina.dabranches.workers.dev .
- Gates negativos CLI/Wrangler bloqueiam chave diferente; leitura publica Auth/settings200. Build configurado renderizado1440/390 e3PWA locais aprovados. Nenhuma credencial submetida pelo agente; Diogo confirmou entrada real na0.13.1 restaurada, nao se extrapola essa aceitacao para0.13.3. Sem Auth/ACL/dados/pipelines alterados.
- Rollback disponivel:3cd368c4-83e4-4647-864a-630b8f6c0624 (0.13.1). Evidencia C:/Dev/filter-standardisation/carina-0.13.3-public.json, carina-0.13.3-status.log e carina-authgate-*.log.

## 2026-10-03 - incidente de entrada e rollback; 0.13.3 apenas em preparacao

- A release 0.13.2 foi compilada sem VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY. HTTP 200, hashes e testes sinteticos nao validavam a configuracao de entrada publicada. O incidente foi causado pela publicacao desta tarefa.
- Rollback concluido para 0.13.1, Cloudflare Version ID 3cd368c4-83e4-4647-864a-630b8f6c0624, 100% do trafego. Formulario publico verificado; Diogo confirmou entrada autenticada as 17:51 UTC. Nenhum teste autenticado foi executado pelo agente.
- 0.13.3 preparada, NAO publicada: Wrangler bloqueia configuracao publica ausente, projecto diferente, chave privada ou ambiente test. Configuracao publica recuperada apenas do artefacto 0.13.1 servido, verificada e guardada em .env.local ignorado. Nenhum segredo ou credencial copiado/versionado; sem alteracao Auth/ACL/dados.
- Os filtros de PR85 permanecem no Git mas nao na producao restaurada. Nova publicacao exige gates e smoke de entrada sobre o artefacto real; nao confundir testes com mocks com autenticacao real. Evidencias locais carina-incident-*.log e incident-login-legal-carina.png em C:/Dev/filter-standardisation.

# Deployment seguro

## 06-10-2026 — versão 0.14.0 publicada e verificada

Por ordem explícita «publica», PR #88 integrado no merge `9df5f264a6f3e65c93cd45b679ff2242a4e663f5` (funcional `ae6116d`). CI `37480126368` e secret scan `37480126626` aprovados: 299 unitários, 25 SQL, 167 E2E/uma omissão e três PWA. Gates locais, seis cenários de navegação, 16 cenários PostgreSQL reais e dry-run aprovados.

Migration Pagamentos aplicada isoladamente antes do frontend: registo remoto `20261006144551`, nome `20261006114804_add_payments_workspace`. Backup físico recuperável confirmado no painel: 06-10-2026 05:45:26 UTC. Preflight de funções/colunas/policies igual ao QA; continuidade de utilizadores e permissões preservada. RLS, grants e sete triggers confirmados; zero recebimentos gravados no smoke. Sem Auth/Storage ou repair/db push.

Worker `legal-carina`, https://legal-carina.dabranches.workers.dev: deployment `d0d2b9e4-4770-48b1-ad83-45fb19e4098a`, Version ID `7f91ce33-407c-4a0c-93fd-8dc594fb96a1`, 100% desde `2026-10-06T14:47:47Z`. HTTP confirma 0.14.0; hashes de HTML/notas/service worker/JS/CSS/Pagamentos iguais ao build. Sessão autenticada carregou Por receber → Pagamentos e as quatro filas; actualização PWA activada. Não se registaram pagamentos reais.

Rollback frontend: `7dc8bc64-d133-4fd5-868a-dde7f88e21e1` (0.13.3). Conservar livro, auditoria e guardas da base após recebimentos; não reverter flags nem apagar dados. O fluxo de estorno de recebimentos permanece fora desta release. Safari físico não foi ensaiado.

## 30-09-2026 — versão 0.13.1 publicada e verificada

- Por ordem explícita «publica», PR [#82](https://github.com/dabranches-collab/legal-carina/pull/82) integrado em GitHub `main` no commit funcional `98f73a0378ce426ffb370c5166f907f576827527`. Checkout oficial alinhado com esse commit, branch documental `codex/deployment-record-0.13.1`. CI `36749735234` e secret scan `36749735050` verdes: 55 ficheiros/283 testes unitários, runtime Worker, 152 E2E aprovados/uma omissão condicional e três testes PWA aprovados. Segurança de ficheiros, lint, tipos, suite unitária, runtime, build de produção, três testes PWA e dry-run final também aprovados localmente.
- Worker Cloudflare `legal-carina`, URL `https://legal-carina.dabranches.workers.dev`: deployment ID `2fc58910-fca0-48b6-9e8b-db3f1e84f179`, Version ID `3cd368c4-83e4-4647-864a-630b8f6c0624`, 100% do tráfego desde `2026-09-30T17:26:17.077112Z` (CONFIRMADO por deployments status). `/release-notes.json` confirmou HTTP 200/0.13.1 em 30-09-2026; o browser integrado mostrou «Aplicação actualizada · 0.13.1» com as duas alterações. Rollback frontend: Version ID `ea7bc7a9-ec75-4686-82dd-1cece93e793f` (0.13.0).
- Sociedade e valor/hora da ficha preenchem novos registos, incluindo no atalho Nova despesa, com edição manual por registo. Barra horizontal no fundo visível das tabelas largas, sincronizada e sem sobrepor a paginação. Antes da publicação, a auditoria exigiu os patches transitivos de undici `7.29.1` e `8.10.2`; auditoria final aprovada sem findings altos. Sem migration ou alteração de dados nesta publicação; Supabase manteve como últimas migrations confirmadas directamente `20260928165827` e `20260928165929`. O ensaio num iPhone físico permanece pendente.

## Produção confirmada em 2026-09-29

- Plataforma: Cloudflare Workers Static Assets; serviço `legal-carina`; URL `https://legal-carina.dabranches.workers.dev`.
- Versão 0.13.0: commit funcional `69546655dcf38720c26e99d0fc83426128beaf63` em GitHub `main` (PR #79; CI `36564781739` e secret scan `36564781785` verdes). Deployment `f0a1adbe-4c36-4911-b3d5-fa5cb22e8506`, Version ID `ea7bc7a9-ec75-4686-82dd-1cece93e793f`, 100% do tráfego desde `2026-09-29T12:07:57Z`; HTTP 200/0.13.0 em `12:08:22 UTC`. A política `camera=(self)` permite a captura na própria origem. Rollback do Worker: Version ID `b2ae645d-1b53-4046-8e98-a28802273a9a` (0.12.12).
- Sem migration nesta versão. As últimas migrations remotas confirmadas continuam `20260928165827` e `20260928165929`. A UI publicada foi aberta no browser integrado; a captura e escolha da Fototeca dependem de ensaio num iPhone físico.

## Produção confirmada em 2026-09-28

- Plataforma: Cloudflare Workers Static Assets; serviço `legal-carina`; URL `https://legal-carina.dabranches.workers.dev`.
- Versão 0.12.11: commit funcional publicado `f55e83163c1564a76c1e0b9a0020652cb01ba042` em GitHub `main` (PR #74 e #75), deployment `756a758a-10c2-4a63-8bf5-6835e11f31fc`, Version ID `d7e3032e-9378-4aaa-8453-ef7cc4e0abd6`, 100% do tráfego desde `2026-09-28T17:21:13Z`. Notas online 0.12.11/HTTP 200 em `2026-09-28 17:23:39 UTC`.
- Supabase: migrations remotas `20260928165827` e `20260928165929` aplicadas; ver correspondência local em `docs/database/migration-reconciliation.md`. A versão anterior do Worker para rollback é `db8dded3-c4d6-4555-874d-02e641a17f50` (0.12.10). O rollback do Worker não reverte as funções de leitura da base.

## Produção confirmada em 2026-09-25

- Plataforma: Cloudflare Workers Static Assets.
- Serviço: `legal-carina`.
- Ambiente: produção.
- URL: `https://legal-carina.dabranches.workers.dev`.
- Versão visível: `0.12.8` (notas online confirmadas por HTTP 200).
- Deployment activo: `e592b705-b4a0-40d2-a6f1-6f171d58e883`.
- Version ID activo: `18587752-c567-4818-ae0f-7a2a1ca5e182` (100% do tráfego desde `2026-09-25 12:44:52 UTC`).
- Commit funcional publicado e fonte canónica no GitHub: `main` em `8ec12655f64c2bc7dde2dd0f2bd215c65f2b0161` (PR #67; CI verde).
- Rollback imediato do frontend: `ee689cb4-9c11-4a15-ac22-2e662c4b148e` (0.12.7). A versão 0.12.8 não exigiu nova migration.

Estes identificadores devem ser novamente consultados antes de cada publicação; não assumir que permanecem activos.

## Gates obrigatórios

- Pull request revisto; CI, E2E, auditoria de dependências e secret scan verdes.
- Migration testada numa branch Supabase/staging, pgTAP e advisors sem findings críticos.
- Textos legais aprovados, SMTP e redirect URLs configurados.
- Preview sem dados reais e smoke test aprovado.
- Backup/PITR e rollback de base de dados confirmados conforme o plano contratado. A confirmação tem de incluir a data/hora do último ponto recuperável.
- Exportação/cópia independente dos objectos privados do Storage confirmada: o backup da base contém metadados, mas não recupera ficheiros apagados do Storage.
- Linha de base de utilizadores, pertenças, perfis e permissões comparada com `scripts/audit-continuity.sql`, sem órfãos.

## Promoção

1. Fixar o commit e artefacto aprovados.
2. Aplicar apenas a migration aditiva previamente revista e ensaiada; nunca executar reset remoto, `db push` global ou `migration repair` por suposição.
3. Publicar Edge Functions e respectivos segredos backend.
4. Validar login, reset, termos, RLS e auditoria com utilizadores de teste.
5. Publicar os assets no ambiente production somente após a palavra explícita `publica`.
6. Monitorizar erros e reverter Worker se o smoke test falhar.

Pushes, PRs e a CI não publicam a aplicação. A integração Git Cloudflare está desligada; qualquer automatização futura de deploy deve ser apenas manual, protegida por ambiente/revisor e separada da CI. Funcionalidades com MFA avançado, timeouts de sessão, PITR, SMTP externo ou observabilidade com retenção podem exigir planos pagos; confirmar preços antes de as activar.
