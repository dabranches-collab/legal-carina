## 2026-10-10 — 0.16.0 publicada

0.16.0 confirmada a 100%, Version ID `e175a768-fbaf-4239-a5d5-bc2b5d9d2cfc`, deployment `f7539c54-2249-4fa7-a4f7-63e676ad214f`, 10-10-2026 00:43:30 WAT. Fonte funcional main `bfde6a8`; CI da correcção `38004536233` e secret scan aprovados. Migrations remotas `20261009232051` (nove RPC) e `20261009234216` (materialização), correspondentes a `20261009221918_add_workflow_scoped_reads.sql` e `20261009232441_materialize_workflow_read_scope.sql`. Hashes/contagens das 52 relações iguais antes/depois de cada aplicação, funções/colunas/policies anteriores preservadas; advisors sem ERROR. Smoke real dos pagamentos combinados passou após corrigir timeout, com provisões/avenças filtradas e resumo funcionais. Backup 09-10-2026 05:51 UTC; Storage intacto. Sem pagamentos ou dados operacionais alterados. Ensaios físicos, revisão operacional e tradução/documentos reais continuam não certificados. Detalhes/rollback em HANDOVER.md; este registo prevalece sobre as entradas históricas seguintes. Sem novo deploy por documentação.

# Estado da nova versão — 09-10-2026

## Retoma local — código funcional `511d89d`

Cloudflare/Supabase e QA completo disponíveis nesta retoma. Os nove RPC têm agora migration aditiva candidata e passaram 15 verificações com o esquema reconciliado; pagamentos/RLS, avenças, concorrência, contratos sintéticos e unitários aprovados. Build/dry-run com configuração real e cinco áreas aprovados; backup recuperável de 09-10-2026 05:51 UTC confirmado. PR draft #93, CI funcional 37998912619 e CI do PR 37999259451 aprovadas, incluindo secret scan. **Ainda não pronta para activação:** tradução/documentos reais com conteúdo fictício, Safari físico e revisão operacional sem evidência. Produção permanece 0.15.1, sem merge, instalação remota ou deploy. A autorização mantém-se. [Preflight actual e limites](publication-preflight.md) prevalece sobre o relato histórico seguinte; a retoma foi expressamente autorizada a verificar integrações reais.

**Ainda não pronta para publicação.** Frontend 0.16.0 em preparação, branch `codex/workflow-prototype-20261009`; este lote continua `de349b159fbed954a6510397798daa4aecad9b5c`. Publicação explicitamente autorizada pelo utilizador. O preflight ficou bloqueado por falta de acessos/configuração e validações pendentes; nenhuma publicação, merge em main, migration, operação real ou alteração de permissões. Ver [preflight de publicação](publication-preflight.md).

## Preparado neste lote

Cinco menus e ficha real em cinco grupos, preservando as dez páginas existentes. Filtros partilhados de sociedade, responsável e tipo de cliente nas listas, trabalho, filas e gráficos; URL, histórico e ligações conservam o âmbito. A ficha mantém dados/movimentos completos e bloqueia a mudança global enquanto o diálogo está aberto. Manutenção conserva a leitura habitual.

Dívidas, avenças, notas e contas mantêm os montantes integrais e indicam o respectivo alcance. Trabalho e gráficos usam a intersecção das três dimensões. Pagamentos conservam ordem, tokens, revisões e capacidades da fila original. Mistos paginam perfis e movimentos e respeitam a vertente e o cliente explícito. Sociedades homónimas são agregadas por UUID; valores financeiros ocultos continuam ocultos. Distribuição entre sociedades mantém o período integral.

Nove novos contratos SQL de leitura preparados **fora de migrations**, sem execução num servidor real. Com âmbito activo, a aplicação exige os novos RPC; se faltarem, mostra erro, sem recuar para resultados globais. [Contrato e semântica](scoped-read-contract.md).

Opção de build `VITE_WORKFLOW_NAVIGATION=five-areas` preparada, desactivada por omissão e independente dos atalhos QA. Build de produção local tenta forjar os parâmetros QA e deve permanecer no login. CI da branch prepara contratos sintéticos, regressão existente isolada e PWA compilada; execução remota aprovada para o código funcional `956b39b` (run 37976453290, ambos os jobs), confirmada às 19:13:16 UTC.

## Verificações desta continuação

| Verificação | Resultado / alcance |
| --- | --- |
| Instalação | Congelada aprovada, Node 24.19.0 / pnpm 11.19.0, sem alteração de dependências ou lockfile. |
| Unitários | 344 aprovados em 66 ficheiros. |
| SQL sintético | 25 contratos de pagamentos + nove de avenças + 27 contratos de âmbito/resumos aprovados (61). Incluem corpos reais dos resumos com auxiliares ACL sintéticos; não provam o esquema completo. |
| Worker | EN/FR, movimentos/despesas e recusa de redireccionamentos aprovados; Azure inteiramente simulado. |
| Integração nova | 56 E2E aprovados nos quatro formatos: desktop, tablet e iPhone vertical/horizontal, em Chromium emulado. Ficha, restauro, intersecções, financeiros integrais, paginação de mistos, gráficos/listas, bloqueio de RPC ausente e pedidos externos; erros JavaScript monitorizados. |
| Regressão habitual | 172 cenários existentes cobertos: 170 passaram na execução inicial com dois workers; duas interrupções de geometria foram repetidas com um worker e passaram. Quatro cenários PWA saltados aqui e executados no build de produção local. |
| Documentos na nova navegação | Seis aprovados: anexos PDF/JPEG, rascunho sem numeração/gravação, EN/FR com movimentos/despesas/totais e documentos multipágina. |
| Protótipo independente | 40 aprovados nos quatro formatos; PDF/Word, traduções, contratos e pagamentos simulados. |
| PWA de produção local | Quatro aprovados: manifest, recusa dos atalhos QA, aviso da versão e instalação/activação/cache/service worker. Build com flag five-areas e destino fictício. |
| Segurança / lint / tipos / build | Aprovados; mantém aviso de chunks grandes. Auditoria: duas vulnerabilidades moderadas, duas baixas, nenhuma alta/crítica. Não alteradas dependências para as corrigir. |
| CI remota / publicação | Código funcional `956b39b`: validate e dependency-audit aprovados no run 37976453290, confirmado às 19:13:16 UTC. Este lote documental seguinte não altera código. Nenhum merge, deploy ou dry-run de publicação. |
| Instruções de ambiente | Guardadas no workspace. Persistência de install_script/start_skill bloqueada por configuração-base desactualizada; proposta completa preservada, sem publicação do ambiente. |

Um erro de composição que introduzi no dashboard foi detectado e corrigido antes da suite final. As primeiras tentativas dirigidas também detectaram asserções que não correspondiam à apresentação existente (`1200,00 €`, nome completo «Paula Chaves» e rótulo «Valor Trabalhado»); os testes foram alinhados com estes contratos existentes, sem alterar a formatação/nome da aplicação nem remover verificações de montantes ou de selecção. As tentativas estão preservadas nos logs locais. A suite final de integração passou 56/56, sem skips ou retries.

As duas interrupções da regressão ocorreram em testes iniciados às 18:34:55/58 UTC, coincidindo com alterações da documentação às 18:34:57 e 18:35:10 enquanto o Vite estava activo. Essas escritas podem provocar recarregamento; a repetição sem alterações de ficheiros passou os dois cenários completos. Falhas iniciais e repetição preservadas em `output/workflow-regression/scoped-initial-results.json` e `retry.json`. Não se removeram asserções nem se excluíram rotas. Os seis documentos foram repetidos com a nova navegação depois desta regressão.

## Bloqueios antes de disponibilizar aos operadores

1. **Base completa, RLS/ACL e concorrência.** Os scripts exigem o container PostgreSQL QA dedicado, ausente nesta instância. As tentativas recusaram antes de inserir dados; não se substituiu por outra base nem se alteraram rede/permissões. Contratos PGlite sintéticos não substituem estes ensaios.
2. **Nove RPC ainda não instalados.** Rever as propostas e validar no esquema completo antes de qualquer aplicação autorizada. Sem eles, as vistas com âmbito financeiro apresentam erro. A preparação do frontend não basta para activação dos filtros.
3. **Integrações reais.** Azure, Auth e Storage reais não contactados, por instrução expressa. Mocks validam contratos, documentos e falhas; não confirmam disponibilidade, configuração ou qualidade linguística do Azure real.
4. **Safari/iPhone físico e operadores.** Faltam ensaio físico, revisão de percursos e validação operacional. Emulação Chromium não substitui Safari.
5. **Entrega.** CI do código funcional confirmada. Na fase de publicação autorizada, confirmar novamente os checks do SHA que será entregue, dry-run, configuração de activação/reversão, versão instalada e janela de entrega. A opção nova não foi configurada em produção.

Os filtros não executam eliminações e os testes verificam o regresso dos registos após limpar o âmbito. Não houve alteração das funções de gravação, cálculos-base ou dados reais; isto não permite garantir ausência absoluta de regressões em produção. Produção não foi consultada neste lote; não há deployment/version ID novo.

Instruções reproduzíveis: [cloud-setup.md](cloud-setup.md). Evidência local em `output/workflow-*`, logs em `/workspace/.tmp/workflow-scope-*` e recibo de entrega em `output/workflow-delivery/receipt.json` após confirmação do SHA remoto. Revisão visual A4: `output/workflow-integration/carina-ficha-cinco-grupos-a4.pdf`.

Continuação dos bloqueios e roteiro executável após disponibilização do QA: [qa-completion.md](qa-completion.md). Os três scripts PostgreSQL foram novamente executados nesta continuação: todos recusaram por ausência do container dedicado, antes de inserir dados. Docker operacional com zero imagens/containers; imagem oficial exigida não está em cache e o registry não consta da política vigente. Não houve mudanças de rede, permissões, daemon, dependências ou scripts para contornar a recusa. Manifest local preserva os hashes das 137 migrations actuais.
