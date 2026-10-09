# Desenvolvimento e testes isolados na nuvem

Repositório: `/workspace/legal-carina`; branch de integração: `codex/workflow-prototype-20261009`. Node **24.19.0**, pnpm **11.19.0**; respeitar `pnpm-lock.yaml`. Não usar credenciais, clientes ou serviços reais. Não publicar, aplicar migrations ou mudar permissões. A instalação congelada já foi executada nesta conversa; as dependências e o lockfile não foram alterados neste lote.

## Preparação

Confirmar checkout, branch e trabalho existente antes de instalar. Caches e temporários devem ficar no workspace:

```sh
export XDG_DATA_HOME=/workspace/.local/share
export XDG_CACHE_HOME=/workspace/.cache
export TMPDIR=/workspace/.tmp
export npm_config_cache=/workspace/.cache/npm
mkdir -p "$XDG_DATA_HOME" "$XDG_CACHE_HOME" "$TMPDIR" "$npm_config_cache"
pnpm install --frozen-lockfile --store-dir /workspace/.pnpm-store --fetch-retries=0
```

Após esta instalação, executar os scripts com `pnpm --config.verify-deps-before-run=false SCRIPT`. Neste ambiente, a verificação automática anterior a cada script tenta instalar novamente com outro store e falha com `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`. Esta opção evita essa segunda instalação: não altera o lockfile, não desactiva a integridade da instalação congelada e não dispensa a instalação. Não aplicar correcções automáticas de dependências nem modificar rede/permissões para ultrapassar recusas.

## Verificações locais

```sh
pnpm --config.verify-deps-before-run=false security:files
pnpm --config.verify-deps-before-run=false lint
pnpm --config.verify-deps-before-run=false typecheck
pnpm --config.verify-deps-before-run=false test
pnpm --config.verify-deps-before-run=false test:worker-runtime
pnpm --config.verify-deps-before-run=false audit --audit-level high
node scripts/workflow/audit.mjs --operational-preview
git diff --check
```

Os contratos SQL usam PGlite e um esquema sintético parcial. Os scripts `test-payments-integration.mjs`, `test-payments-lock-order.mjs` e `test-retainer-integration.mjs` exigem o container QA identificado no próprio script, com `network=none`. Não usar outra base por substituição. O container e a imagem não estão disponíveis neste ambiente; esses três testes ficaram bloqueados antes de inserir dados.

## Browser: bloqueio antes de navegar

Não iniciar testes sobre `pnpm dev` ou `pnpm preview` habituais: podem encaminhar pedidos para serviços reais. Usar exclusivamente as configurações isoladas abaixo. Não reutilizam servidores já existentes, não carregam `.env`, removem os proxies e o tradutor local e devolvem 403 nos caminhos `/supabase-api`, `/supabase-functions` e `/api/document-translation`. Os testes confirmam estes bloqueios antes de navegar. O browser recebe bloqueio de DNS externo, bloqueio de WebSockets e intercepção de pedidos; os dados REST, traduções e ficheiros são simulados.

```sh
# Ficha real, URLs, filtros e regressão, em quatro formatos de ecrã
node node_modules/@playwright/test/cli.js test --config playwright.workflow.config.ts

# Todos os E2E existentes com a camada de isolamento acrescentada
node scripts/workflow/regression.mjs

# Documentos existentes, com a nova navegação activa
WORKFLOW_REGRESSION_PREVIEW=1 WORKFLOW_REGRESSION_REPORT=preview-documents \
  node scripts/workflow/regression.mjs document-pdf-real

# Protótipo independente, quatro formatos; servidor próprio
node node_modules/@playwright/test/cli.js test --config prototypes/workflow/playwright.config.ts
```

O runner de regressão cria cópias temporárias em `e2e/.isolated`, ajusta imports/URLs de ficheiros para as fontes originais e acrescenta a fixture de isolamento. Não altera os testes originais. Recusa substituir uma pasta já existente e remove apenas a sua própria pasta no final. As configurações usam Chromium do sistema quando disponível; pode indicar outro executável local em `WORKFLOW_CHROMIUM_EXECUTABLE`. Não descarregar navegadores ou alterar políticas como resposta a uma recusa de acesso.

## Build e PWA local

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54321 \
VITE_SUPABASE_PUBLISHABLE_KEY=test-publishable-key-not-a-secret \
VITE_APP_ENV=isolated-production \
  pnpm --config.verify-deps-before-run=false build --config scripts/workflow/isolated-vite.config.ts
WORKFLOW_REGRESSION_PRODUCTION=1 node scripts/workflow/regression.mjs
```

Este build é de produção local com destino Supabase fictício, sem configuração real e sem activar os atalhos QA ou a nova navegação. O modo `VITE_APP_ENV=test` desactiva o service worker por definição; não serve para o ensaio de instalação da PWA. Só a configuração PWA local permite service workers, sobre estes artefactos fictícios, mantendo os destinos externos bloqueados e os proxies recusados. Nunca executar builds e estes testes simultaneamente, pois partilham `dist`.

Resultados em `output/workflow-integration`, `output/workflow-regression`, `output/workflow-pwa` e `output/workflow-qa`. `python scripts/workflow/review_client_pdf.py` gera a revisão visual A4 após os E2E da ficha. Consultar [release-readiness.md](release-readiness.md) para resultados e limitações. Nenhum destes comandos autoriza publicação.

## Persistência do ambiente

A repetição do script de instalação foi aprovada, sem alterar o lockfile. A gravação dos campos `install_script` e `start_skill` foi recusada por conflito: a configuração mudou depois de o rascunho desta conversa ter sido criado. A ferramenta informa que reenviar o mesmo rascunho não resolve o conflito. As instruções completas propostas e a evidência foram preservadas em `output/workflow-delivery/environment-setup-handover.zip`, para transferência para uma nova conversa de configuração iniciada nas definições actuais do ambiente e reconciliação antes de guardar. A persistência destes campos não está confirmada; nenhum ambiente foi publicado. Não foram propostos novos segredos, variáveis, domínios ou permissões.
