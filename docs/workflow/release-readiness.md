# Estado da nova versão — 09-10-2026

**Ainda não pronta para publicação.** Frontend 0.16.0 em preparação, branch `codex/workflow-prototype-20261009`; continuação sobre `1c9d051983b0cc34012edec422e5dd73a97f2a19`. A nova navegação e a ficha real estão disponíveis apenas por opção explícita em DEV/teste. A autorização para implementar e testar mantém-se; produção exige ordem explícita «publica».

## Alterações deste lote

- Mudança de categoria de clientes conserva `workflow=preview`, incluindo após recarregar; sair da ficha remove o contexto de grupo na navegação.
- Gráficos de valor por sociedade e por responsável abrem o respectivo painel real na prévia, com botões acessíveis. Valores, consultas e ocultação financeira não foram recalculados.
- Cabeçalho compacto da prévia em ecrãs horizontais baixos permite abrir a primeira linha da tabela. A correcção aplica-se só à prévia; não altera a interface habitual.
- Runner reutilizável de regressão isola os testes existentes. Bloqueio de serviços também aplicado à prévia do build local.

## Verificações

| Verificação | Resultado / alcance |
| --- | --- |
| Instalação | Congelada, Node 24.19.0 / pnpm 11.19.0; lockfile respeitado. |
| Unitários | 318 aprovados, 62 ficheiros; 21 relevantes repetidos após os ajustes finais. |
| SQL local | 25 contratos de pagamentos e nove de avenças aprovados; esquema sintético parcial. |
| Worker | Tradução EN/FR de movimentos/despesas e recusa de redireccionamentos aprovadas com outbound totalmente simulado. |
| E2E existentes | 172 cenários sem dependências reais cobertos: 171 passaram inicialmente; uma falha durante reinício do servidor foi repetida, junto de outro cenário de zoom, e ambos passaram. Os três cenários PWA são executados separadamente. |
| Ficha nova | 28 cenários aprovados: desktop, tablet e iPhone vertical/horizontal em Chromium emulado; dez páginas existentes, cinco grupos, URLs, categorias e filtros combinados. Quatro cenários adicionais aprovados após acrescentar a verificação de recortes laterais/fundo e acesso aos controlos no iPhone horizontal. |
| Documentos na prévia | Seis cenários aprovados: PDF com anexos, rascunho sem gravação/numeração, EN/FR com despesas e totais e notas/cobranças multipágina. Traduções e armazenamento simulados. |
| Protótipo separado | 40 cenários novamente aprovados em quatro formatos; inclui Word/PDF, filtros, traduções, contratos e perfis simulados. |
| PWA compilada | Três cenários aprovados no build de produção local: manifest, aviso da versão e instalação/activação/cache/notas do service worker. |
| Segurança / lint / tipos / build | Aprovados; build mantém o aviso existente de chunks grandes. Auditoria de dependências: zero vulnerabilidades altas/críticas, duas moderadas e duas baixas; sem alteração de dependências. |
| CI remota / deploy | CI remota não confirmada; nenhum merge, deploy ou dry-run de publicação executado neste lote. |
| Rascunho do ambiente | Gravação de install_script/start_skill recusada por configuração-base desactualizada. Proposta integral preservada em ZIP; persistência não confirmada, sem publicação do ambiente. |

A primeira tentativa de PWA utilizou inadvertidamente `VITE_APP_ENV=test`: dois cenários passaram e a instalação expirou, porque esse modo remove service workers. O ensaio final usa o modo de produção local, destinos fictícios e a mesma configuração isolada; não houve alteração do código da PWA nem dos limites dos testes. O primeiro ensaio de zoom falhou após reinício do servidor durante preparação da configuração; a repetição com servidor estabilizado passou. Não se ocultaram estas tentativas.

Os E2E verificam pedidos simulados e os filtros transmitidos às consultas. Limpar o filtro volta a mostrar os quatro movimentos sintéticos: o filtro não é uma operação de eliminação. Isto não é uma prova de integridade de todos os dados de produção.

## O que falta

1. **Filtros transversais financeiros.** Trabalho aceita sociedade + responsável + tipo de cliente em conjunto. Os painéis actuais não partilham esse contrato: `get_dashboard_overview()` e `get_dashboard_metric_breakdowns()` não recebem filtros; `get_payment_queue()` não recebe âmbito; `get_entity_dashboard_rolling(p_kind,p_entity_id)` recebe uma entidade; `get_client_credit_accounts(p_client_id)` recebe um cliente. Algumas filas financeiras não incluem responsável ou categoria. A selecção nos acessos do Resumo abre painéis por entidade; não filtra simultaneamente toda a aplicação. A proposta do protótipo não deve ser apresentada como integração completa. É necessária implementação do contrato de leitura e validação das regras de agregação/visibilidade antes de activar filtros globais. Não acrescentar argumentos inexistentes, filtrar contas por suposição ou reconstruir saldos incompletos no frontend.
2. **Base completa e concorrência.** Os três scripts de integração/locks recusaram iniciar por ausência de `carina-payments-qa-20261006`. Não existem imagens Docker locais. Não se substituiu a base nem se alteraram permissões/rede. Faltam ensaios do esquema completo, RLS/ACL e duas ligações concorrentes.
3. **Integrações reais.** Azure, Auth, Storage, permissões e serviços reais não foram contactados, conforme instrução do utilizador. Os mocks validam contratos, tratamento de falhas e documentos; não provam disponibilidade, configuração ou qualidade linguística do Azure real.
4. **Safari/iPhone físico e revisão operacional.** Chromium emulado não substitui Safari físico, câmara/ficheiros reais ou validação pelos operadores.
5. **Activação e entrega.** A flag continua restrita a DEV/teste; a configuração e o plano de activação/reversão exigem validação antes de disponibilizar aos operadores. Confirmar CI e dry-run de publicação, versão instalada e janela de entrega na fase de publicação autorizada.

Nenhuma alteração neste lote a dependências, lockfile, Worker, migrations, permissões ou regras de gravação financeira. Não foram usados dados ou credenciais reais. Os ensaios não provocaram gravações reais, mas não autorizam prometer ausência absoluta de regressões na produção.

Instruções reproduzíveis: [cloud-setup.md](cloud-setup.md). Evidência detalhada local: JSONs e capturas nas pastas `output/workflow-*`; revisão em `output/workflow-integration/carina-ficha-cinco-grupos-a4.pdf`.
