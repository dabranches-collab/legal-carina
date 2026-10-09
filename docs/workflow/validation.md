## 2026-10-09 — filtros partilhados, gráficos e saldos integrais

Estado actual: [docs/workflow/release-readiness.md](docs/workflow/release-readiness.md); regras de selecção em [docs/workflow/scoped-read-contract.md](docs/workflow/scoped-read-contract.md). Continuação de `de349b159fbed954a6510397798daa4aecad9b5c`, branch `codex/workflow-prototype-20261009`, frontend 0.16.0 em preparação. Filtros simultâneos de sociedade/responsável/tipo preparados nas listas, trabalho, filas e gráficos; ficha real conserva todos os dados/movimentos. Saldos, notas e avenças mantêm montantes integrais; filtros não recalculam repartições nem alteram dados. Mistos paginam completamente e intersectam vertente/cliente. Leitura de resumos conserva controlos financeiros e sociedades homónimas usam UUID.

Nove propostas RPC fora de migrations, **não aplicadas a serviços reais**. Com âmbito activo e RPC ausente, aparece erro sem resultados globais. Flag de build `VITE_WORKFLOW_NAVIGATION=five-areas` preparada, desactivada por omissão e sem habilitar QA de autenticação em produção. CI da branch inclui os contratos sintéticos, regressão isolada e PWA; resultado remoto não confirmado.

Validação desta continuação: instalação congelada Node 24.19.0/pnpm 11.19.0; 344 unitários/66 ficheiros, 61 contratos SQL sintéticos (25 pagamentos + nove avenças + 27 âmbito/resumos), Worker EN/FR simulado, segurança, lint, tipos e build aprovados. Browser: 56 integração em quatro formatos, 172 percursos existentes cobertos (170 na primeira execução e duas interrupções de geometria repetidas/aprovadas), seis documentos com nova navegação, 40 protótipo e quatro PWA compilada aprovados. A regressão initial usou dois workers; repetição seguiu um worker da configuração. Logs/JSON preservam falhas e contagens. Build mantém aviso de chunks grandes; auditoria duas moderadas/duas baixas, zero altas/críticas. Nenhuma dependência ou lockfile alterado.

**Não pronto para publicação:** container PostgreSQL QA dedicado ausente; faltam esquema completo, RLS/ACL e concorrência. Rever/validar os nove RPC antes de qualquer aplicação autorizada; sem eles, filtros financeiros não podem ser activados. Azure/Auth/Storage reais não usados por instrução expressa, pelo que a disponibilidade/configuração real não está confirmada. Faltam Safari/iPhone físico, revisão pelos operadores, CI remota e preparação da entrega. Sem merge em main, deploy, migrations, alterações a dados, permissões ou serviços reais. Produção não consultada: nenhum novo deployment/version ID.

Instruções reproduzíveis em [docs/workflow/cloud-setup.md](docs/workflow/cloud-setup.md). Rascunho install_script/start_skill continua bloqueado por configuração-base desactualizada; proposta completa actualizada e preservada no ZIP local, persistência não confirmada. O recibo `output/workflow-delivery/receipt.json` será actualizado com o SHA confirmado directamente no remoto após o push. Entradas abaixo são históricas; esta entrada e release-readiness prevalecem.

## 2026-10-09 — regressão alargada e preparação da entrega

Estado de referência deste lote: [docs/workflow/release-readiness.md](docs/workflow/release-readiness.md). Sobre `1c9d051`, na branch `codex/workflow-prototype-20261009`, foram corrigidos o restauro do preview por categoria e a sobreposição da primeira linha da tabela no iPhone horizontal. Gráficos de sociedade/responsável abrem painéis reais na prévia. Nova camada de isolamento reutiliza os E2E existentes, incluindo documentos e PWA compilada, sem contactar serviços reais.

Nesta conversa: 318 unitários/62 ficheiros e 34 contratos SQL locais aprovados; Worker simulado, segurança, lint, tipos e build aprovados. E2E: 172 percursos existentes cobertos (uma falha durante reinício repetida e aprovada), 28 da ficha nova, quatro ensaios adicionais de acesso/safe areas, seis documentos com preview activo, 40 do protótipo e três da PWA de produção local aprovados. Auditoria de dependências sem altas/críticas (duas moderadas, duas baixas). Instruções: [docs/workflow/cloud-setup.md](docs/workflow/cloud-setup.md). Os JSONs preservam as tentativas iniciais; não confundir mocks com validação de Azure/Auth/Storage reais.

Não pronto para publicar: filtros simultâneos transversais ainda não implementados nos resumos/filas financeiras; falta o contrato de leitura correspondente. Três ensaios de integração/concorrência bloqueados por ausência do container PostgreSQL QA exigido, antes de inserir dados. Faltam Safari/iPhone físico, revisão dos operadores, integrações reais e CI remota/activação. O modo novo continua restrito a DEV/teste. Não alterar serviços ou cálculos financeiros por suposição.

Sem mudanças neste lote a dependências, lockfile, Worker, SQL, Auth, permissões ou funções de gravação financeira. Sem credenciais/dados reais, merge em main, deploy ou migrations. Produção não consultada; nenhum deployment/version ID novo. A instalação congelada foi repetida e aprovada. A gravação do rascunho install_script/start_skill foi recusada por configuração-base desactualizada; proposta completa preservada no ZIP `output/workflow-delivery/environment-setup-handover.zip`, sem nova publicação ou mudanças de rede. Persistência dos campos não confirmada. O lote será versionado e o SHA da branch confirmado directamente após o push; o recibo local fica em `output/workflow-delivery/receipt.json`. As entradas abaixo são históricas e não substituem este estado.

# Ficha real — validação de continuação

## 2026-10-09 — ficha real em cinco grupos, apenas em teste

Continuação sobre `50f56f35a1b086c7317af3c9018fe7b7af206d3f`, na branch `codex/workflow-prototype-20261009`. Em `workflow=preview` (DEV/teste), a ficha real conserva as dez páginas e agrupa-as em Resumo, Dados, Trabalho, Contratos e Financeiro e documentos. Resumo reutiliza os totais/atalhos de registos existentes; Dados mantém Geral/Contactos/Facturação; Contratos mantém Avença/Preço fixo; Financeiro e documentos mantém Provisões/Credenciais/Documentos/Facturas/Notas de Honorários. Os painéis, formulários, validações e gravações existentes são reutilizados. URLs conservam o grupo, página e filtro; fechar repõe a lista e remove o contexto da ficha. Sem preview, os dez separadores e o comportamento habitual mantêm-se.

Validação nesta conversa: instalação congelada com Node 24.19.0/pnpm 11.19.0; segurança, lint, tipos, 316 unitários/62 ficheiros e 34 contratos SQL (25 pagamentos, nove avenças) aprovados, apenas com esquema/dados sintéticos. Runtime Worker simulado e build aprovados. 16 E2E da ficha real aprovados nos quatro formatos, com capturas em claro/escuro; oito cenários de URLs/filtros repetidos após o ajuste final de restauro e oito de painéis/regressão repetidos após a correcção do regresso a Resumo, todos aprovados. A configuração `playwright.workflow.config.ts` inicia Vite sem proxies/tradutor local e sem .env; confirma HTTP 403 nos três caminhos de serviços antes de navegar, bloqueia destinos externos/service workers/WebSockets no browser e simula os pedidos REST. Foi adicionada à CI; CI remota ainda não confirmada.

Diagnóstico dos ensaios: aviso de versão sobrepunha a tabela no iPhone; preparação dos testes passou a reconhecer a versão. Um helper Playwright anterior do onboarding era recolhido pelo Vitest; foi movido para fora do checkout, sem alterar testes/dependências. A fixture de atenção não tinha contrato de resposta; completada a simulação com movimentos sintéticos. A tabela de origem em iPhone horizontal apresentou sobreposição de ferramentas/barra no duplo clique; os percursos da ficha usam o acesso suportado em caixas nesse formato. Este defeito da tabela não foi corrigido nem validado como resolvido.

Faltam filtros transversais, interacções adicionais dos gráficos, integração de módulos/serviços com dados sintéticos autorizados, Safari/iPhone físico e revisão dos operadores. Estes E2E não validam Azure, Auth/RLS/Storage reais nem concorrência multi-sessão. Sem deploy, merge em main, migration, dados reais ou mudanças de permissões. Produção não consultada; não há novos deployment/version IDs. SHA final deve ser confirmado no remoto após o push.

# Validação e continuidade do workflow — 09-10-2026


## Estado actual da entrega

Branch `codex/workflow-prototype-20261009`, em `/workspace/legal-carina`. Frontend 0.16.0 em preparação; protótipo independente 0.16.0-preview.2. O commit de integração `9ba01aae88e3f6675cc5827068c8a2b5705fdd2c` foi enviado e confirmado directamente no GitHub por `git ls-remote` em 09-10-2026; este registo documental segue esse commit na mesma branch. O bloqueio de rede anterior ficou resolvido. O SHA final desta entrega é o HEAD da branch após o commit documental e será novamente verificado directamente após o push.

A integração real conserva os componentes existentes e exige `workflow=preview` em DEV/teste. A ficha organizada em cinco grupos está concluída no protótipo; **a reorganização da ficha real continua pendente**. O checkout não tinha alterações por guardar: 9ba01aa já continha todo o código real preparado. História e trabalho existentes preservados.

Nesta entrega executados: auditoria `node scripts/workflow/audit.mjs --operational-preview` (84 funções, 16 vistas antigas, dez ficheiros operacionais previstos), segurança `node scripts/check-sensitive-files.mjs` e `git diff --check`, aprovados. Só documentação alterada; os testes de implementação abaixo são resultados de execuções anteriores, não repetidos agora.

Pendências: ficha real em cinco grupos; filtros globais transversais; interacções adicionais dos gráficos operacionais; E2E da integração real; Safari/iPhone físico; ensaios integrados Azure/Storage/regras/perfis; revisão pelos operadores. Os testes SQL ficaram por executar por ausência de `@electric-sql/pglite` no ambiente.

Nenhum merge em main, deploy, migration ou operação em dados reais/permissões/serviços de produção. Versão instalada não reconfirmada nesta entrega; nenhum deployment/version ID novo. Os relatos históricos abaixo distinguem preparação isolada e primeira integração.

## Preparação isolada — contexto histórico

Base `88adcd6471f3ef469470c6a0899dd1dc6a187eb7`; versão operacional do código-base 0.15.1 antes da primeira integração. A consulta HTTP de versão nessa preparação devolveu 403; não usar esse registo como confirmação da versão instalada agora.

## Evidência concluída

- Inventário: 84 funcionalidades com origem e acesso actual/proposto; 58 demonstradas parcialmente com dados fictícios, 25 mapeadas, uma em preparação. 16 rotas antigas cobertas pela proposta. Nenhum ficheiro operacional alterado.
- Playwright: 40 cenários aprovados, dez percursos em desktop, tablet, iPhone vertical e horizontal (Chromium emulado). Temas, navegação, contexto/filtros, tradução falhada, versões, PDF/Word, recebimentos parciais, contratos e perfis simulados. Pedidos externos bloqueados e erros JavaScript monitorizados. 84 capturas.
- Conteúdo francês e marca DEMO verificados nos PDF e Word descarregados nos quatro formatos de ecrã.
- 303 testes unitários existentes, 59 ficheiros, aprovados. Segurança de ficheiros, lint, TypeScript e build operacional aprovados. Protótipo ausente do bundle operacional.
- Build independente e HTML autónomo gerados. HTML servido localmente verificado sem pedidos externos nem erros JavaScript.

## Limites e revisão antes de activar

As integrações reais (incluindo Azure Translator, autenticação, permissões, arquivos e regras financeiras no servidor) não foram exercitadas: só foram inventariadas, com comportamentos parciais simulados. Nada foi gravado no backend. Os testes SQL não puderam executar por falta de `@electric-sql/pglite` no ambiente; não houve alterações SQL.

A política do Chromium deste ambiente bloqueia `file://`: execução do HTML por esse protocolo não verificada. O PDF é a entrega para leitura no iPhone; o HTML exige navegador que permita ficheiros locais ou servidor de revisão. Localhost não é acessível remotamente no iPhone.

Faltam revisão humana pelos operadores, teste num iPhone físico/Safari, ligação dos componentes existentes e validação integrada das regras/autorização antes de qualquer activação. A comparação de percursos é estrutural, sem medição de tempos reais. Não há migração, merge em main ou deploy deste trabalho.

## Lote de pré-filtros — 09-10-2026

Nove caixas e três grupos de gráficos clicáveis; selecção global aplicada às listas, critérios indicados, remoção/retorno e histórico. Os 16 cenários novos validam quantidade de itens, exclusão de despesas nas horas, cliente/sociedade/responsável, notas/provisões/recebimentos, segmentos inclusivos de mistos, contratos, teclado e listas vazias. Suite completa do protótipo: 40/40. Lint, tipos e build independente aprovados. Os 303 unitários do lote anterior não foram repetidos; nenhum ficheiro operacional mudou. Os gráficos/indicadores operacionais completos continuam com reutilização obrigatória documentada.

## Primeira integração operacional — 0.16.0 em preparação

Navegação em cinco áreas ligada aos componentes reais; protegida por opção explícita apenas DEV/teste. A navegação normal mantém-se predefinida. Nenhuma operação no backend, Auth/RLS/Storage/Worker ou migrations. Auditoria `--operational-preview` verifica uma lista exacta de ficheiros previstos, mantendo o modo de isolamento estrito sem essa opção. Dez ficheiros operacionais preparados neste lote, incluindo testes, versão e notas.

A suite unitária completa inicial passou 307 testes; depois da conservação do modo em links internos/externos, os 19 testes relevantes passaram novamente (App, gate e AppLink). Verificação final integral: **310 testes aprovados em 61 ficheiros**, após os últimos ajustes. Segurança de ficheiros, auditoria do âmbito, lint, tipos e build aprovados. Tipos, lint e build operacional aprovados. Os 40 E2E anteriores validam apenas o protótipo. Falta E2E em browser da integração real, Safari físico, ficha reorganizada e validação das integrações antes de activar. Nesse lote o push ficou pendente por restrição de rede; resolvido nesta entrega, como registado no estado actual acima.
