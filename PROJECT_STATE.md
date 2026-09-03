# Estado do projecto

## Preparação da publicação 0.8.0 — 03-09-2026

- Aviso de actualização passa a mostrar a versão em espera e as alterações incluídas, obtidas do próprio service worker. Notas em public/release-notes.json; build recusa versão divergente. Uma página ainda executando 0.7.1 conserva o aviso antigo até actualizar. Corrigido foco das fichas para não roubar a escrita nem fechar fichas sobrepostas ao usar Escape.

- Ordem autorizada: terminar e validar alterações, publicar 0.8.0, auditar intensivamente movimentos/relações/saldos, corrigir e voltar a publicar. A auditoria posterior ainda não foi concluída neste ponto.
- Fichas de clientes, sociedades e responsáveis abrem editáveis. Guardar e Cancelar ficam inactivos sem alterações; após alteração, Guardar a verde e Cancelar a vermelho. A mesma apresentação aplica-se aos movimentos, condições/prestações de avença e credenciais. Fechar mantém-se disponível. A outra vertente do cliente só aparece por opção Acrescentar vertente e só persiste quando activa, preenchida e guardada; cancelar não grava. Novas vertentes conservam o ID devolvido, impedindo nova inserção na gravação seguinte.
- Sociedade do cliente na página Geral, independente da sociedade emissora documental. Ao escolher cliente na criação de movimento, assume a sociedade-mãe; permite alteração manual e limpa/redefine a escolha ao mudar cliente. Clientes históricos sem atribuição ficam Por atribuir; não se presumiu uma sociedade a partir do histórico.
- Angariador Outro cria um cadastro reutilizável por firma, com nome normalizado e sem duplicação por maiúsculas/espaços. A parcela integra a repartição, incluindo acumulação com angariação da tarefa. Não cria conta de autenticação. Cadastro e cliente são guardados atomicamente pelo trigger.
- Acompanhamento em clientes/sociedades/responsáveis mostra resultados no mesmo menu com deslocação/foco; Visão Geral continua a abrir Registos. Resumos de cada conjunto têm altura uniforme. Cabeçalho aumentado de 104 para 156 px, títulos proporcionais e offsets sticky medidos; nomes duplicados removidos da área de trabalho. Actividade 192 px, Observações 64 px, ambas redimensionáveis.
- Repartição: páginas de 5000, indicador animado visível e progresso. O volume de 4424 exige um pedido em vez de nove; conjuntos maiores mantêm até três pedidos simultâneos e verificação de completude. Legenda explicita Clientes com movimentos no período seleccionado.
- Supabase original: migration list revista antes de cada aplicação; ensaios sintéticos em transacção/rollback autorizados, sem staging pago. 20260903033000_expand_allocation_read_page.sql aplicada como 20260903021033; 20260903034500_add_client_referrer_directory.sql aplicada como 20260903022253. Permissões/âmbito preservados, anon recusado, RLS do cadastro confirmado. Zero angariadores criados nos ensaios persistiram. Histórico divergente preservado, sem db push/repair.
- Validação: 139 testes unitários; 98 E2E aprovados, dois específicos de preview de produção executados separadamente; 29 verificações PostgreSQL locais e ensaios rollback na base original. Segurança de ficheiros, lint, tipos e build aprovados. Dry-run Cloudflare concluído. E2E cobre claro/escuro, desktop, tablet, iPhone/safe areas, perfis, PDF/XLSX, filtros e persistência sintética. Revisão visual no browser integrado confirma fichas e cores.
- Verificação urgente Supabase em 03-09-2026: apenas branch main, projecto original CARINA LEGAL activo; nenhum projecto/branch temporário de testes activo. A branch cobrada à hora já foi eliminada. Os utilizadores de teste autorizados permanecem.
- Estado anterior à publicação: local 0.8.0, branch codex/legalteam-distribution; GitHub será actualizado com este lote. Produção reconfirmada 0.7.1, commit aeb647b19f8f45b3b25b5da265ff834b7b9f1c88, deployment 2caa6ea0-b4c2-4e15-87c9-563a993342d3, version 1805f1f4-6f33-4654-bc1c-8f3c67dad1f1, URL https://legal-carina.dabranches.workers.dev. Sem alteração de movimentos reais ou emissão de notas neste lote.


## Continuidade das fichas e leitura da repartição — 03-09-2026

- Fichas abertas a partir de Avenças, clientes mistos ou pendências LEGALTEAM são sobrepostas ao menu de origem, sem navegação nem alteração do URL. O conteúdo original permanece montado; ao fechar preserva filtros, taxas, selecção e posição. Consulta directa pelo ID evita depender da primeira página de clientes. Guardar o angariador actualiza o mapa ao fechar a ficha; o componente da tabela é preservado durante a recarga.
- Resumos operacionais/acompanhamento ficam acima da repartição. Incobráveis com contagem zero são ocultados no dashboard de clientes/sociedades/responsáveis e Visão Geral; onde restam quatro cartões, a grelha existente fica 2×2.
- Âmbito da consulta confirmado directamente na função Supabase instalada: apenas tarefas com billing_entity_id da LEGALTEAM, na firma autorizada. Os clientes disponíveis derivam destas tarefas, não de todos os trabalhos do cliente. Nenhuma migration/escrita remota neste lote.
- Datas, percentagens e filtros editáveis destacados por fundo e contorno. Pendências com contagem positiva a vermelho: sem angariador de cliente, sem angariador da tarefa, sem executor e sem montante, reunidas no mesmo grupo de pré-filtros.
- Os 24 movimentos sem montante foram verificados por agregação: 990 minutos, todos sem preço/hora e sem montante efectivo; 21 importados marcados como pagos e três manuais em rascunho. Não foram atribuídos preços nem alterados estados. Aviso esclarece horas incluídas e valor por apurar; pré-filtro permite consultar as fichas. Sem dados pessoais guardados.
- Carregamento da repartição: primeira página seguida de até três pedidos em paralelo, cancelamento ao sair, validação de total/páginas/IDs antes de mostrar resultados. Agregação de pendências por cliente numa passagem e resultados memorizados reduzem trabalho repetido. Não apresenta somas parciais como completas.
- PDF: nomes em colunas adaptadas às larguras usuais, nomes longos quebrados, continuação paginada. Ensaio com 138 nomes sintéticos exportado, renderizado e revisto em três páginas.
- Validação: 12 E2E de repartição/fichas/PDF e um cenário adicional com 1501 registos comprovando até três pedidos simultâneos e ordem dos resumos; preservação do URL/filtros ao fechar e guardar clientes na LEGALTEAM e ao fechar em Avenças. Tipos, lint, segurança e build aprovados.
- Pré-filtros de pendências e cartões da repartição deslocam imediatamente para o início da tabela no mesmo menu/URL; foco acessível e margem medida do cabeçalho, incluindo móvel. O botão Ver registos de um cliente aplica a mesma deslocação. Testados os quatro tipos e cartões pessoais a 390/1440 px.
- Exportações das provisões: preparação PDF/XLSX concluía sem erro mas fechava a caixa sem confirmação. Agora permanece uma confirmação do ficheiro preparado, com descarga repetível, alteração da modalidade e ligação Abrir PDF. Download por Blob/âncora, ficheiros apenas em memória até descarga. Não se confirmou a localização das descargas reais no browser integrado; o clique automatizado Abrir PDF foi bloqueado pela política do browser e não foi contornado.
- Validação final: 22 E2E aprovados, incluindo PDF em ambas as modalidades, XLSX em ambas as modalidades e repetição da descarga, fichas, pré-filtros, layout claro/escuro 320/390/768/1440 px e carregamento de 1501 registos. Confirmação visual no browser integrado com base original; nenhum dado real alterado.
- Versão 0.8.0 local/GitHub na branch codex/legalteam-distribution, revisão normal em http://127.0.0.1:4194/. Sem publicação: Cloudflare continua 0.7.1, commit aeb647b19f8f45b3b25b5da265ff834b7b9f1c88, deployment 2caa6ea0-b4c2-4e15-87c9-563a993342d3, version 1805f1f4-6f33-4654-bc1c-8f3c67dad1f1, https://legal-carina.dabranches.workers.dev, confirmados em 03-09-2026. Base conserva a migration autorizada 20260903011816.


## Base original activada e duplo clique — 03-09-2026

- Após bloqueio inicial da revisão automática, o utilizador autorizou expressamente os campos de angariação e três RPCs na base original, aceitando o ensaio com rollback em substituição de staging separado. Migration candidata `20260902235343_add_legalteam_allocation.sql` aplicada isoladamente como `20260903011816_add_legalteam_allocation` no Supabase `vtvvqyebigflgqccbqsw`. Três colunas e três RPCs confirmadas; execução authenticated autorizada e anon recusada. Histórico divergente preservado, sem db push/repair.
- Preview normal na porta 4194, sem flags de demonstração e com a base original: login, mapa com 4424 movimentos, 138 clientes e período 21-02-2018 a 02-09-2026 confirmados pelo browser. O mapa já apresenta gráficos, taxas, pendências e PDF. Campos históricos sem angariador permanecem por preencher.
- Duplo clique abre a ficha do registo na lista inferior comum das Sociedades/Responsáveis, na repartição e nos registos de consumo das provisões; mantém o clique simples sem edição de células. Gravações nas listas do painel actualizam a repartição/lista/indicadores, preservando as datas e percentagens da consulta.
- Clientes sem angariador, mistos e avenças abrem a ficha pelo duplo clique; utilizadores abrem a configuração e documentos abrem a consulta. Clientes/Sociedades/Responsáveis/Registos e Provisões já usavam a ficha comum. Botões e campos dentro das linhas não desencadeiam outra ficha por propagação do duplo clique/Enter.
- Prestações de avença deixam de gravar por alteração de célula: duplo clique ou «Abrir prestação» apresenta a caixa, só «Guardar prestação» envia os dados; Cancelar preserva a prestação. Fichas de movimentos/prestações são renderizadas fora do formulário do cliente para impedir submissões cruzadas. Tabelas técnicas de auditoria/origem continuam apenas de consulta.
- Validação deste lote: 25 testes unitários dirigidos, 17 E2E de repartição e fichas/permissões mais um E2E de prestação (só a prestação é gravada), TypeScript, lint, segurança e build aprovados. Cenários responsivos claro/escuro em 320/390/768/1440 px incluídos. Abertura de movimento real confirmada no browser e fechada sem gravar. Testes de escrita só com fixtures sintéticas.
- Frontend 0.8.0 continua em revisão local/GitHub na branch `codex/legalteam-distribution`; **não publicado**. Produção Cloudflare mantém 0.7.1, commit funcional `aeb647b19f8f45b3b25b5da265ff834b7b9f1c88`, deployment `2caa6ea0-b4c2-4e15-87c9-563a993342d3`, version `1805f1f4-6f33-4654-bc1c-8f3c67dad1f1`, URL https://legal-carina.dabranches.workers.dev (reconfirmados neste lote antes da alteração da base). Não se criou recurso temporário pago nem se emitiram notas.


## Revisão 0.8.0 com base original — 03-09-2026

- O utilizador autorizou expressamente trabalhar na versão local com a base original, criar dados de teste e apagá-los no fim, preservando os utilizadores de teste. Esta indicação substitui neste lote a restrição anterior a previews sintéticos. Frontend ainda **não publicado**.
- Painel LEGALTEAM: datas compactas com extremos automáticos do período completo, taxas 10/10/50/30 editáveis (soma obrigatória 100%), cálculo imediato, selecção múltipla de clientes e filtro de pagamento independente. Três pré-filtros com contagens exactas: clientes sem angariador, tarefas sem angariador e registos sem executor; incluem trabalho sem preço. Fichas de clientes acessíveis pela lista de pendências.
- Totais e cartões por pessoa reorganizados, gráficos de composição e exportação do resumo PDF com período, clientes, taxas, horas, parcelas pessoais, escritório e valores por atribuir.
- Limpeza autorizada concluída na base original: dois clientes sintéticos, 23 movimentos (seis incobráveis), uma factura sintética, duas despesas, os perfis/ajustes associados e um anexo sintético. Transacção auditável, contagens dos restantes clientes/movimentos preservadas; dois utilizadores de teste mantidos. Não foram apagadas auditorias, clientes reais ou provisões reais.
- Login local: corrigido erro 502/EACCES iniciando Vite com acesso de rede autorizado. Processo actual na porta 4194 usa `.env.local` e a base original; URL sem flags de demonstração: `http://127.0.0.1:4194/?view=billing&society=LEGALTEAM`. Prova sem credenciais reais: o pedido sintético chega à autenticação e recebe a rejeição funcional de utilizador/PIN inválido.
- Migration candidata revista para preservar as RPCs da versão publicada: obrigatoriedade do angariador nas novas RPCs, sem trigger global que bloquearia o frontend 0.7.1. Consulta completa paginada, identificadores de cliente e limites automáticos. Histórico ligado revisto, divergência histórica preservada.
- Ensaio expressamente autorizado na base original em BEGIN/ROLLBACK, usando esquema, triggers e permissões reais: preço, criação/edição, recusa de dados inválidos, rollback atómico, compatibilidade com a RPC publicada, paginação e recusa a outra firma/anónimo aprovados. Zero firmas/utilizadores/cliente de ensaio persistidos. Script: `scripts/test-allocation-original.sql`; sem branch temporária paga.
- Verificações locais: sete testes de repartição, 22 verificações PGlite, nove cenários E2E de repartição (incluindo PDF e 320/390/768/1440 px), tipos, lint e segurança aprovados. PDF sintético renderizado e revisto. Migration persistente ainda por aplicar neste ponto documental.
- Produção frontend reconfirmada em 0.7.1: commit `aeb647b19f8f45b3b25b5da265ff834b7b9f1c88`, deployment `2caa6ea0-b4c2-4e15-87c9-563a993342d3`, version `1805f1f4-6f33-4654-bc1c-8f3c67dad1f1`, 100%, https://legal-carina.dabranches.workers.dev. Sem deploy Cloudflare neste lote.

## Versão 0.8.0 — preparada para revisão local, 03-09-2026

- Commit funcional `56be98f70d3eb494053752c7b30837fbe4d8cf8d` confirmado em GitHub e local na branch `codex/legalteam-distribution`. Este apontamento segue em commit documental posterior; produção permanece separada.
- Branch `codex/legalteam-distribution`, baseada em `5535dde0f3cc15c0daaf53992aa75b9c030d2cb0`. Código e documentação deste lote seguem juntos para GitHub. O utilizador pediu para ver antes de publicar: **sem deploy, migration remota, emissão de notas ou alteração de dados reais**.
- LEGALTEAM: período inclusivo pela data do trabalho, filtro todos/só pagos, horas por responsável e distribuição dos honorários sem IVA: 10% angariador do cliente, 10% angariador da tarefa, 50% executor e 30% escritório. Despesas excluídas; avenças contribuem apenas horas. Partes históricas sem angariador ficam por atribuir.
- Campo Angariador do cliente no separador Geral de todos os clientes, opcional para preenchimento retroactivo. Tarefas LEGALTEAM exigem Carina, Hugo ou Outro com nome. Menus apresentam Carina Santos, Hugo Mendonça e Paula Chaves, preservando identidades existentes.
- Histórico de provisões mostra apenas movimentos válidos: correcções estornadas deixam de aparecer no histórico normal, sem apagar a auditoria. O botão PDF existente e o novo XLSX abrem sempre a escolha entre tempos/valores por registo e apenas tempos com resumo monetário final.
- Validação: segurança de ficheiros, lint, TypeScript, build sintético e 134 testes unitários aprovados; 20 verificações PostgreSQL/PGlite com dados sintéticos. E2E: 75 cenários aplicáveis aprovados (74 na execução integral e o cenário restante após corrigir um selector que apanhava o menu oculto); dois exclusivos de produção omitidos. XLSX verificado nos dois formatos. Browser integrado revisto em claro/escuro; layouts automatizados em 320/390/768/1440 px.
- Migration `20260902235343_add_legalteam_allocation.sql` **apenas local/GitHub**. Histórico ligado consultado antes da operação; divergência histórica conhecida preservada. Supabase `vtvvqyebigflgqccbqsw` consultado apenas para confirmar contratos/permissões. Ensaio de staging com esquema real, CI e dry-run continuam gates de publicação; PGlite não substitui staging.
- Produção **CONFIRMADA** e preservada: 0.7.1, commit funcional `aeb647b19f8f45b3b25b5da265ff834b7b9f1c88`, deployment `2caa6ea0-b4c2-4e15-87c9-563a993342d3`, version `1805f1f4-6f33-4654-bc1c-8f3c67dad1f1`, 100%, https://legal-carina.dabranches.workers.dev, publicação de 02-09-2026 19:50:23 UTC reconfirmada por Wrangler neste lote.
- Preview sintético em `http://127.0.0.1:4194/`, flags `qa-iphone=1&qa-demo=1&qa-allocation=1&view=billing&society=LEGALTEAM` ou `qa-iphone=1&qa-demo=1&qa-provisions=1&view=provisions`. Não foi criado recurso temporário pago; a anterior branch de ensaio já foi eliminada.
- Critérios e limites: `docs/legalteam-allocation.md`.

## Correcção de saldo inicial e proposta de apresentação — 03-09-2026

- Por indicação expressa do utilizador, uma provisão histórica foi reclassificada como saldo inicial no dia anterior ao primeiro registo, através de estorno e reposição auditáveis no browser autenticado. Montante líquido preservado; data efectiva e recálculo confirmados por SQL e interface. Nenhuma nota emitida. Sem dados pessoais neste documento.
- Pedido seguinte: apresentar primeiro a provisão e depois os registos por ordem cronológica, com saldo corrente e identificação da parcela não coberta quando o saldo se esgotar. Apenas proposta nesta fase; nenhuma alteração ao formato das notas implementada.
- Código local e GitHub continuam na versão funcional 0.7.1 (aeb647b19f8f45b3b25b5da265ff834b7b9f1c88), branch codex/client-credit. Produção reconfirmada: deployment 2caa6ea0-b4c2-4e15-87c9-563a993342d3, version 1805f1f4-6f33-4654-bc1c-8f3c67dad1f1, 100%, https://legal-carina.dabranches.workers.dev. Este lote altera apenas dados autorizados e documentação; sem deploy, migration ou recurso temporário pago.

## Versão 0.7.1 — saldo por registos, publicada

- Correcção solicitada: a própria linha de Provisões apresenta consumo e saldo pelos serviços desde a data efectiva do primeiro depósito válido, incluindo esse dia. Não emitir notas para actualizar o saldo. A autorização anterior de emissão foi cancelada; zero notas emitidas confirmado.
- Cálculo apenas de leitura, usando tabelas/RPCs e RLS existentes, sem migration ou nova branch Supabase paga. Soma o valor efectivo dos serviços elegíveis da mesma conta (Cliente/Sociedade/moeda), com IVA da sociedade por compatibilidade com 0.7.0; pergunta sobre o critério de IVA enviada ao utilizador. Exclui trabalho anterior ao depósito, futuro, pago/facturado, avenças, anulado/incobrável e serviços de notas já descontadas. Sinaliza registos sem preço.
- Saldo visível nas primeiras colunas; histórico discrimina os registos e permite guardar mapa de consumo PDF. Removido o botão de emissão do painel de provisões. Os lançamentos contabilizados permanecem separados do acompanhamento calculado, sem alterar facturação ou emitir documentos de cobrança.
- Publicada em 02-09-2026 19:50:23 UTC, commit funcional aeb647b19f8f45b3b25b5da265ff834b7b9f1c88, branch codex/client-credit. Deployment ID 2caa6ea0-b4c2-4e15-87c9-563a993342d3, Version ID 1805f1f4-6f33-4654-bc1c-8f3c67dad1f1, activa a 100% em https://legal-carina.dabranches.workers.dev. HTTP 200, bundle index-C59OY9Is.js e cache 0.7.1 verificados directamente.
- Gates aprovados: segurança, lint, TypeScript, 127 testes unitários, cinco E2E específicos incluindo mapa PDF, CI #50 completo, auditoria e secret scan; build/dry-run aprovados. Browser integrado em desktop, tablet e iPhone, claro/escuro, e PDF renderizado. Consulta real pós-publicação confirmou saldo calculado na linha e zero notas/consumos contabilizados; nenhuma escrita adicional de dados, migration ou recurso pago neste lote.

## Versão 0.7.0 — publicada em 02-09-2026

- Produção confirmada em https://legal-carina.dabranches.workers.dev: commit 473650fa13e4c048e480253fdbdbd0685ae462b4, branch codex/client-credit, Deployment ID 6a768ae1-f1c8-4c3b-87e9-a89cc480bab6, Version ID 532a50bf-ab68-40f7-97b1-ce9c64b2608d, activa a 100% desde 19:28:30 UTC. Tag 0.7.0 e SHA guardados nos metadados Cloudflare; HTTP 200, bundle index-BdH1XRZh.js e cache carina-legal-shell-0.7.0 verificados sem cache. Sessão autenticada, menu Provisões e abertura da ficha por duplo clique confirmados no browser integrado.
- Migration local 20260902180905_add_client_credit_ledger.sql aplicada isoladamente em produção como 20260902192704_add_client_credit_ledger. Quatro tabelas com RLS, sem SELECT anónimo ou INSERT directo authenticated, verificadas; advisors sem ERROR/críticos. Nenhuma reparação de staging promovida.
- CI #48 e secret scan verdes no commit publicado; dry-run aprovado. Ensaio de staging: 20/20 pgTAP; PGlite: 24; unitários: 122. Documentação de validação e recuperação em docs/database/provisions-070-validation.md.
- Branch Supabase temporária provisions-070-validation eliminada no fim do ensaio; confirmação de sucesso e lista apenas com main recebidas. Não permanece recurso temporário com custo horário.
- Provisão histórica autorizada registada em produção com a data do depósito; nota de consumo preparada, ainda não emitida por bloqueio da revisão automática que exigiu confirmação expressa da emissão. Pedido concreto de confirmação enviado. Não há desconto efectuado neste ponto.

## Versão 0.7.0 — provisões e edição por ficha, não publicada

- Gates de publicação concluídos no commit funcional acc7b2ac671e433add7f24e8d1a2cb392f91cff3: CI/secret scan verdes, ensaio remoto com 20/20 pgTAP e zero findings críticos. Backup físico confirmado. A migration foi aplicada apenas em staging. Evidências e limites em docs/database/provisions-070-validation.md; produção ainda 0.6.5 neste ponto.

- Correcção adicional de QA: a demonstração sintética reconhece também o Supabase local configurado pelo CI; isolamento de produção mantido. Os seis E2E de provisões/isolamento passaram com a configuração exacta do CI, lint e TypeScript aprovados.

- Publicação autorizada em 02-09-2026; PR #13 em validação. jsPDF actualizado para 4.2.1 para resolver o bloqueio da auditoria; instalação frozen e auditoria sem vulnerabilidades conhecidas. Fixtures E2E alinhados com o carregamento integral e termo Registos; service worker versionado também em builds com outDir alternativo. 122 unitários, 24 verificações SQL isoladas e 68 E2E aprovados, um cenário exclusivo de Vite omitido no preview estático. Staging com esquema/políticas reais e CI ainda em curso.

- Em preparação na branch `codex/client-credit`: separador Provisões na ficha, submenu abaixo de Avenças, lista de todas as contas que já tiveram provisões, saldo inicial/reforços, desconto na Nota de Honorários, histórico, cópia discriminativa e extracto PDF. Clientes permanecem nas categorias existentes.
- Ajuste de 02-09-2026: sem filtro de saldo positivo; linhas verdes com saldo e vermelhas esgotadas, recebimentos/descontos/saldo e barra de consumo visíveis. Histórico por botão ou duplo clique, seleccionando a conta correspondente à linha. TypeScript, lint, segurança, build sintético, 16 testes da tabela e 5 E2E aprovados; verificação visual integrada em claro/escuro, desktop/tablet/iPhone.
- A nota abate a provisão ao total com IVA e apresenta valor a pagar/saldo restante. Persistência transaccional, pedidos idempotentes e estornos impedem duplo desconto ou saldo negativo. Registos já utilizados são excluídos de novos documentos; facturação fiscal mantém tratamento separado.
- Clique simples selecciona e duplo clique abre a ficha editável; eliminados os editores dentro das células dos Registos.
- Migration candidata `20260902180905_add_client_credit_ledger.sql` não aplicada remotamente. Teste PostgreSQL isolado aprovado com 24 verificações. Supabase ligado confirmado saudável; histórico de migrations consultado, divergência histórica preservada.
- Demonstração local no browser integrado, porta 4193, só com dados sintéticos. 28 E2E aplicáveis aprovados entre provisões, fichas/permissões e iPhone; 1 cenário exclusivo de Vite omitido. PDF e extracto revistos por renderização.
- Produção permanece em 0.6.5: Version ID Cloudflare confirmada `ac433c71-5464-4bb1-8894-ec490d41c740`, activa a 100%, URL `https://legal-carina.dabranches.workers.dev`, em 02-09-2026. Deployment ID `7a682a2c-bf6a-4fda-8e0e-d76caa80f6af` e commit funcional `f77e58a` associados no handover anterior. CI, staging com esquema real e gates de publicação pendentes; não publicar sem **publica**.

- Verificação final: segurança de ficheiros, lint sem avisos, TypeScript, 122/122 testes unitários e build aprovados. Os comandos foram executados pelos entrypoints locais instalados, equivalentes aos scripts pnpm, após o wrapper pnpm ficar preso a tentativas de rede.

- GitHub confirmado após push: commit funcional `7020e845aed3d53f288511ad1ebfea06b16c7999`, branch `codex/client-credit`, HEAD local e remoto coincidentes em 02-09-2026. Este registo documental segue num commit adicional.

## Versão 0.6.5 — carregamento dos Registos publicada

- A entrada em «Registos» mantém agora o estado informativo «A recolher os registos…» enquanto repete automaticamente falhas transitórias de rede como `Failed to fetch`; o alerta com «Tentar novamente» só aparece se as três tentativas falharem.
- Publicada em 02-09-2026 a partir do commit `f77e58a`: Deployment ID `7a682a2c-bf6a-4fda-8e0e-d76caa80f6af`, Version ID `ac433c71-5464-4bb1-8894-ec490d41c740`, bundle `index-BeVkmjPK.js` e cache PWA 0.6.5. Supabase não foi alterado.
- Gates aprovados: ficheiros sensíveis, lint, TypeScript, 115/115 testes, build e dry-run. A matriz E2E local foi interrompida porque o Chromium abortou a navegação para o servidor local antes de chegar à aplicação (`ERR_ABORTED`), limitação já documentada neste computador; o smoke test online confirmou HTTP 200 e os artefactos 0.6.5 activos a 100%.

## Avenças temporais e tratamento — 30-08-2026

- Backend ligado já tem condições temporais de avença, periodicidade de facturação e cálculo do consumo de horas do ciclo actual.
- Frontend local tem submenu/ecrã de tratamento e 3.ª caixa Avenças no dashboard de Clientes, sem retirar clientes de Particulares/Empresas.
- Registos de avença preservam apenas horas e estão excluídos de `Sem preço`; Infantário do Povo tem 139 movimentos e 5 160 minutos classificados.
- Código frontend 0.6.1 ainda não publicado; produção permanece 0.6.0. Validação: segurança, lint, tipos, 114 testes e build verdes.

## Versão 0.6.1 — contadores de pendências e edição imediata em preparação

- As tabelas de dados-base repetem automaticamente falhas transitórias como `Failed to fetch` e descartam respostas tardias de pedidos anteriores; erros funcionais/permissões continuam a ser apresentados sem repetição.
- Neste computador, o proxy de PIN da porta 4181 devolvia `502`; a aplicação local foi mantida em `http://127.0.0.1:4190/`, onde o endpoint foi validado com credenciais sintéticas e devolveu a rejeição funcional esperada.
- Os seis botões de «Pendências a corrigir» apresentam o número exacto de registos do universo filtrado. Uma única RPC agregada substitui seis listagens completas; ensaio autenticado: 796 por facturar, 487 facturados não pagos, 665 sem preço, 47 sem sociedade, 248 históricos e 0 cobertos por avença.
- A edição directa actualiza imediatamente a linha no ecrã e faz a reconciliação silenciosa com o Supabase em segundo plano, evitando o bloqueio visual causado pelo recarregamento integral.
- A função `get_work_attention_counts` foi ensaiada com rollback e aplicada isoladamente; não foi usado `db push` nem `migration repair`. Frontend 0.6.1 não publicado.
- Atribuições solicitadas em 2026-08-29: Vanessa Domingos, Sara Brazona, Pedro Mimoso, Maria Sousa, Maria Dionísio, Inês Ferreira Lopes e César Remisio para CARINA SANTOS; GHH, Frank Morlock e Carolina Rocha para LEGALTEAM. Fichas, 899 registos e assuntos verificados com zero divergências.
- Gates: segurança, lint, TypeScript, 114/114 testes unitários, build e 58/58 E2E aplicáveis aprovados; 2 exclusivos de produção omitidos. Existe cobertura unitária específica dos seis contadores e das falhas transitórias.

## Versão 0.6.0 — publicada

- Implementados logótipos privados por Sociedade em Notas de Honorários/Cobranças, avenças e mensalidades por Cliente, classificação individual dos movimentos, credenciais visíveis cifradas no Vault, edição imediata das fichas e remoção da justificação obrigatória para Paula/Operadores.
- Trabalho coberto preserva duração e elimina preço/valor individual. Fica fora de «Por facturar» e disponível em «Cobertos por avença»; trabalho extra do mesmo Cliente mantém facturação normal. A ficha resume horas, valor/hora efectivo, avenças por facturar e facturado por liquidar.
- Exportação XLSX e impressão/PDF respeitam pesquisa, filtros de coluna e filtros de atenção. A folha de tabela usa A4 horizontal, uma página de largura e o conjunto completo filtrado.
- Supabase alterado apenas por quatro execuções SQL isoladas e previamente ensaiadas: logótipos, avenças, credenciais e motivos opcionais. Esquema/RPCs confirmados; não foi feito `db push`, `migration repair` nem deploy Cloudflare.
- Ensaio autenticado integral com dados sintéticos comprovou upload/reabertura/remoção de logótipo, mensalidade facturada e liquidada, 2 h cobertas sem valor, 1 h extra normal, cálculo de 600 €/h efectivo e duas versões de uma credencial visível. Limpeza final confirmou zero resíduos funcionais.
- Gates actuais: segurança, lint, TypeScript, 112 testes unitários, build e 58 E2E aplicáveis aprovados; 2 exclusivos de produção omitidos. Produção 0.6.0 confirmada em 2026-08-24; a 0.6.1 permanece apenas em preparação.

## Política de publicação — 2026-08-22

A integração Git Cloudflare está desligada, o antigo build token foi revogado e
a branch predefinida no GitHub é `codex/reconcile-full-import`. Produção só é
publicada manualmente após a ordem explícita `publica`; Supabase e dados não
foram alterados nesta operação.

## Incidente de publicação automática — resolvido em 2026-08-22

- A integração Git da Cloudflare estava a executar `npx wrangler deploy` também nas branches não produtivas. Seis PRs do Dependabot foram assim promovidos sucessivamente para o Worker de produção entre 09:13:33 e 09:14:43 UTC; o último voltou a servir o frontend antigo 0.2.5, sem alterar o GitHub nem o Supabase.
- Em Cloudflare, «Compilações para ramificações de não produção» foi desactivado, guardado e confirmado novamente após recarregar as definições. PRs e branches não produtivas deixam de publicar este Worker.
- A versão 0.5.7 do commit funcional `480135e` foi reconstruída e reposta manualmente. Deployment activo a 100% em 2026-08-22 às 09:59 UTC: Version ID `15485d53-a045-4f1f-bbca-8998eba30bd1`.
- Verificação directa sem cache: HTTP 200, bundle `/assets/index-B_aNRE0x.js` e service worker `carina-legal-shell-0.5.7`.
- Gates da reposição: ficheiros sensíveis, lint, TypeScript, 107/107 unitários, build e dry-run Cloudflare aprovados. O Chromium local não chegou à aplicação (`page.goto` abortado contra o servidor local), pelo que se preserva a prova E2E integral já aprovada para o mesmo commit e artefacto.

## Versão 0.5.7 — acessos ao retomar o PWA publicada

- O regresso de uma sessão autenticada ao primeiro plano passa a criar um acesso com `auth_method=app_resumed`; existe uma janela de 60 segundos para impedir duplicações por alternância rápida de aplicações.
- O histórico dá prioridade ao nome visível autenticado e só depois ao nome antigo da credencial e ao username. O proprietário deixa de surgir com o identificador de login.
- A auditoria directa confirmou que a Carina abriu uma sessão persistente, sem novo login Auth; eventos históricos que nunca foram gravados não recebem uma hora inventada.
- Validação: lint, TypeScript e 107/107 testes unitários aprovados.
- Publicada: Cloudflare Version ID `c5135902-610c-4d70-82d4-064c98fdb7c2`, bundle `index-B_aNRE0x.js`; Edge Function `admin-users` v8 activa com JWT obrigatório.

## Versão 0.5.6 — cobertura integral dos acessos publicada

- A reabertura da aplicação com uma sessão válida passa a criar um evento de acesso, cobrindo o PWA quando o utilizador não volta a introduzir o PIN.
- O histórico recupera lacunas anteriores através do `last_sign_in_at` autenticado, sem duplicar eventos existentes separados por menos de um minuto.
- A identificação usa nome visível da credencial, depois nome do perfil autenticado e só por fim o username; nomes vazios deixam de provocar apresentação inconsistente.
- Validação local: lint, TypeScript e 107/107 testes unitários aprovados.
- Publicada a partir do commit `9b8f9aa`: Cloudflare Version ID `d00e6567-9e53-4d79-a211-33e69f236b71`, bundle `index-B6E1XSJM.js`; Edge Function `admin-users` v7 activa com JWT obrigatório.

## Versão 0.5.5 — registos de acesso em preparação

- Criada uma página autónoma «Registos de acesso» dentro de Administração, visível e navegável apenas pelo proprietário.
- Administradores mantêm Administração e Utilizadores, mas a rota dos logs é recusada e redireccionada para a Visão Geral; Operadores continuam sem acesso a toda a Administração.
- A página de Utilizadores deixou de consultar ou apresentar o histórico; o backend já exige explicitamente o perfil `owner` para devolver os acessos.
- Validação: TypeScript, lint, 107/107 testes unitários e 9/9 fluxos Administrador/Operador. Desempenho isolado: 72 posições de scroll em 4,10 s, desvio sticky 0 px e pesquisa em 0,75 s.

## Versão 0.5.4 — correcção definitiva do alinhamento sticky em preparação

- O cabeçalho fixo preserva agora no `colgroup` as larguras efectivamente renderizadas antes de sair do fluxo da tabela, impedindo que o corpo recalcule colunas diferentes no PWA/produção.
- Novo teste geométrico compara margens e centro de cada cabeçalho com a célula correspondente usando larguras persistidas e zoom entre 80% e 200%.
- Perfis confirmados: Administrador acede a Administração, Utilizadores e Definições; Operador cria e edita Clientes, Sociedades e Responsáveis, sem acesso à Administração.
- Validação local: 19/19 cenários sticky/iPhone, 9/9 fluxos de permissões, 7/7 testes de navegação, segurança, lint, TypeScript, build e 105/105 testes unitários.

## Versão 0.5.3 — validação reforçada em preparação

- Estado exclusivamente local; produção mantém-se em `0.5.2`. Não publicar sem nova ordem explícita.
- O painel documental de Cliente permite substituir, no próprio documento, destinatário e idioma em Notas de Honorários e Cobranças; o Operador pode editar e persistir os dados da ficha tal como o Administrador.
- Corrigida a internacionalização da tabela informativa de despesas: cabeçalho e colunas seguem agora Português, Inglês ou Francês tanto na área imprimível como no PDF.
- A abertura de anexos privados reserva a janela no gesto do utilizador antes de obter o URL assinado, evitando bloqueio de pop-up; o selector é limpo depois do carregamento para permitir repetir o mesmo ficheiro.
- Prova real autenticada como `TESTE CODEX OPERADOR`: movimento `tcodexoperador teste despesas múltiplas`, 90 minutos × 120,00 € = 180,00 €, duas despesas totalizando 18,00 € e um PDF no bucket privado. A Nota em Francês apresenta ambas as despesas associadas ao movimento e mantém o total de tempo/valor independente.
- A bateria pgTAP executada no projecto correcto `vtvvqyebigflgqccbqsw` terminou em `ok 34` e rollback: RLS, isolamento entre escritórios, permissões de Operador/Administrador, auditoria, criação atómica e exclusão da facturação passaram.
- Gates locais: ficheiros sensíveis, lint, TypeScript, 105/105 testes unitários, build e 57/57 E2E aplicáveis aprovados; 2 cenários exclusivos de preview/produção omitidos. Scroll do Operador: 72 amostras, desvio do cabeçalho 0 px e filtro em 772 ms.

## Versão 0.5.2 — protecção contra edição acidental

- Nos Registos, o primeiro clique numa célula interactiva selecciona a linha e é deliberadamente consumido; apenas o segundo clique activa a edição. O mecanismo é reutilizável nas restantes tabelas editáveis.
- Todas as tabelas carregam o universo integral por defeito e deixam de apresentar o selector/paginação 10/20/50/100/Todas; a virtualização protege os universos grandes.
- Títulos centrados em todas as colunas; Actividade alinhada à esquerda e valores à direita.
- Sociedades suportam várias contas bancárias, criadas apenas através do botão próprio; a primeira conta é principal. Notas de Honorários e Cobranças permitem escolher uma ou várias contas para o PDF.
- O IVA das Notas de Honorários é inicializado pela Sociedade e editável por documento, recalculando IVA e total sem interferir com movimentos ou totais de facturação.
- Migration `20260821124055_add_multiple_billing_entity_bank_accounts` aplicada e confirmada no projecto Supabase correcto. Sem novos avisos de segurança ou desempenho.
- Gates: segurança de ficheiros, lint, TypeScript, build, 99/99 unitários e 55/55 E2E aplicáveis; 2 exclusivos de preview omitidos. Browser real: 7 233/7 233 registos sem paginação e dois blocos bancários no Operador sem gravação.
- Produção 0.5.2 confirmada: commit `d6f8417`, Deployment `21efbce5-cd22-4c3c-9550-d4e30a11796d`, Version `dd1d69d0-72cd-4b13-b7a7-d34b113d0b01`, bundle `/assets/index-CBtzDRk4.js` e PWA actualizado no browser autenticado.

## Versão 0.5.1 — alinhamento sticky publicado

- A grelha fixa agora as larguras num `colgroup`; o desvio medido entre os centros do cabeçalho e das células foi `0 px` antes e depois da fixação sticky. Segurança, lint, TypeScript, build, 96/96 unitários e 55/55 E2E aplicáveis aprovados.

## Versão 0.5.0 — despesas persistentes publicadas

- Migration `20260821115454_add_work_entry_expenses.sql` aplicada isoladamente ao Supabase e Edge Function `expense-documents` v1 activa com JWT obrigatório. Zero dados sintéticos após os testes transaccionais.
- Várias despesas por movimento, observações, anexos privados e criação atómica. Administrador/Proprietário sem justificação; Operador com motivo auditável para alteração e remoção.
- Coluna `Despesas` depois de `Valor`, com agregado, quantidade, legenda e exportação paginada. Nota de Honorários com tabela informativa separada; Cobrança e todos os totais financeiros excluem despesas.
- Gates aprovados: segurança, lint, TypeScript, build, 95/95 unitários, 55/55 E2E aplicáveis e 30/30 pgTAP ligados. Frontend ainda não estava publicado no momento deste registo.

## Versão 0.4.18 — em preparação local

- A sidebar valida as respostas de Sociedades, Responsáveis e perfis antes de as percorrer. Respostas parciais ou de formato inesperado deixam apenas o submenu afectado vazio, em vez de produzirem uma rejeição não tratada.
- O build QA explícito (`VITE_APP_ENV=test`) permite medir o código compilado sem expor o bypass de autenticação no build normal de produção. O cenário `/iphone-preview` continua exclusivamente local.
- Validação: segurança, lint, TypeScript, 88/88 unitários, build, 56 E2E no preview compilado mais 1 E2E exclusivo do Vite. Matriz Supabase transaccional: 11 + 12 + 11 + 30 invariantes, todos revertidos; zero resíduos.
- Tempos confirmados no build: 5 000 Clientes em 0,56–0,88 s, pesquisa em 0,11–0,22 s, maior tarefa longa 89–170 ms; 1 000 movimentos com 72 amostras de scroll em 1,17–1,18 s, pesquisa em 0,51–0,84 s e desvio do cabeçalho 0 px.
- PDFs reais de Nota de Honorários e Cobrança, 90 movimentos/5 páginas cada, revistos visualmente página a página sem cortes, sobreposições ou colunas indevidas.
- Estado remoto divergente mas funcional: as funções finais existem, porém as migrations locais de 21/08 não constam do histórico remoto. Reconciliação deve ser explícita e não autoriza `db push`/`migration repair` indiscriminado.

## Versão 0.4.17 — publicada em 2026-08-21

- A verificação pós-publicação 0.4.16 detectou que a Cloudflare continuava a servir os bytes antigos nos URLs já conhecidos dos ícones. Foram criados URLs novos para o favicon brilhante e para os ícones Windows de 192/512 px, eliminando a dependência dessa cache. O `apple-touch-icon` de 180 px recebe o mesmo contraste reforçado e também um URL novo.
- Publicada a partir do commit funcional `2cc1c41`. Deployment activo a 100% `b57716d2-34d4-495e-948e-8af8647776a7`, Version `0b7f4c9d-04ac-40f2-a1c4-f7258b22add8`. Os novos URLs devolveram os comprimentos esperados: favicon 1 604 bytes, iPhone 29 446, Windows 192 px 39 623 e Windows 512 px 213 653; página e service worker `0.4.17` confirmados.

## Versão 0.4.16 — contraste Windows/browser local

- Mantido o `apple-touch-icon` de 180 px aprovado no iPhone. A variante usada no Windows/PWA e no favicon recebeu dourado mais luminoso, traço cerca de 25% mais espesso e ocupação ligeiramente maior do quadrado para não se perder sobre o azul-escuro.
- Foram actualizados o favicon de 32 px e os ícones manifest de 192/512 px, incluindo os caminhos antigos de compatibilidade. Ainda não publicada.

## Versão 0.4.15 — publicada em 2026-08-21

- O busto dourado da Justiça Cega passa a ser o ícone comum da PWA, do atalho iPhone (`apple-touch-icon`) e do favicon do browser, sobre o azul-escuro da aplicação.
- Foram criados ficheiros próprios de 32, 180, 192 e 512 px e URLs novas para reduzir a reutilização das caches antigas. O iOS não oferece uma API que garanta a substituição do ícone de um atalho já instalado; a nova URL maximiza a possibilidade de actualização, mas alguns dispositivos podem exigir remover e voltar a adicionar ao ecrã principal.
- Publicada a partir do commit funcional `fd66f66`. Deployment activo a 100% `568e73b9-429d-4137-8827-f0b96b96a3c1`, Version `86727e94-d8d9-4c70-b297-26d4e87e1d74`. Página, service worker `0.4.15`, manifest, favicon e ícones de 180/192/512 px responderam HTTP 200 com os tipos correctos.

## Versão 0.4.14 — publicada em 2026-08-21

- No iPhone, o busto da Justiça Cega na sidebar passa de 256 px para 128 px de altura, reduz também a largura máxima para cerca de metade e desce ligeiramente dentro da barra. O desktop mantém as dimensões anteriores.
- Validação aprovada: captura real do iPhone 13 mini revista, 15/15 cenários móveis em onze modelos, 88/88 unitários, segurança, lint, TypeScript, build e dry-run Cloudflare.
- Publicada a partir do commit funcional `1d6923a`. A integração do mesmo commit ficou activa a 100% como Deployment ID `c5f53186-4cfc-4509-b3f6-686c22ff3a1e` e Version ID `8e277618-1449-4660-84e6-80c2ab1cb324`. HTTP 200, service worker `0.4.14` e bundle activo confirmados directamente.

## Versão 0.4.13 — publicada em 2026-08-21

- O cabeçalho e os filtros por coluna deixam de depender de uma transformação vertical recalculada em cada evento de scroll. Quando a tabela entra na zona fixa, o cabeçalho usa uma posição fixa estável, acompanha apenas o scroll horizontal e fica recortado aos limites da tabela.
- Prova visual e funcional local: cabeçalho alinhado com a grelha; 18/18 cenários de scroll aprovados entre 80–200% de zoom e em seis dimensões de iPhone. Lint sem avisos, TypeScript, 88/88 testes unitários e build aprovados.
- Publicada a partir do commit funcional `9775923`, branch `codex/reconcile-full-import`. Deploy manual: Deployment ID `76f40895-b74d-47d7-b1b7-c170f015821a`, Version ID `ca987268-e904-4cab-8ffb-fb33eeaa0083`; a integração Git do mesmo commit criou depois `6f5a9f4c-ba0b-4cad-bb33-de915d5fbcd2` / `2cbe8222-d0da-4a89-a65c-a4991a8cac1c`. HTTP 200, service worker `0.4.13` e bundle activo confirmados directamente.

## Versão 0.4.12 — publicada em 2026-08-21

- Publicada em `https://legal-carina.dabranches.workers.dev` a partir do commit funcional `0d9eb98`, branch `codex/reconcile-full-import`. Deploy manual actual e a 100%: Deployment ID `c6f91020-c3de-49b3-9550-ccf0ceb35f2d`, Version ID `fed44c92-2b2d-4b5f-83dd-424c90817f69`, criado em 2026-08-21 às 08:23 UTC.
- Campanha funcional concluída localmente para Administrador e Operador: criação, edição completa/em linha/em massa, mudança de Sociedade, duração, valor/hora, descontos, estados financeiros, eliminação e motivos por perfil. O total nunca recalcula ao contrário o valor/hora.
- O Operador passa a poder consultar, criar e editar Clientes, Sociedades e Responsáveis. Utilizadores e importações continuam administrativos. As quatro migrations deste lote foram aplicadas remotamente de forma individual e revista; não foi usado `db push` nem `migration repair`.
- Matrizes ligadas com `ROLLBACK`: 16 invariantes de edição completa, 12 de edição em massa, 11 de dados mestres e 30 de estados/transições/consolidações financeiras. Incluem o mesmo Cliente em duas Sociedades, totais por Cliente/Sociedade/Responsável, incobráveis e sequências inválidas. Consultas de resíduos devolveram zero.
- Notas de Honorários e Cobranças reais com 90 linhas geraram 5 páginas cada; nomes incluem tipo, Cliente e data. Linhas não mostram Responsável nem valor individual, datas/tempos ficam centrados e os totais não ultrapassam a margem.
- Estabilidade medida: 5 000 Clientes abriram entre 0,8–2,2 s conforme isolamento/contenção, filtro entre 0,2–0,6 s; 1 000 movimentos, 72 amostras de scroll em cerca de 1,17 s dentro do browser, desvio do cabeçalho `0 px`; pesquisa com debounce 0,99 s isolada e 1,55 s com sete workers.
- Matriz visual/E2E: zoom 80–200%, seis famílias de iPhone na tabela, onze modelos na matriz PWA, sete resoluções Windows, rotação, modo escuro, texto ampliado e safe areas. Resultado global: 55 aprovados e 2 cenários exclusivos de produção omitidos.
- Gates finais: ficheiros sensíveis aprovados, lint sem avisos, TypeScript aprovado, 88/88 testes unitários, build Vite e dry-run Cloudflare aprovados, 55 E2E aprovados e 2 cenários exclusivos de produção omitidos. Após as migrations, os testes ligados de edição, recálculo, permissões, dados mestres e consolidação financeira passaram com `ROLLBACK`. Produção respondeu HTTP 200, o service worker confirmou `0.4.12` e o recurso gráfico respondeu HTTP 200.

## Versão 0.4.11 — estabilidade da tabela e documentos financeiros

- Cabeçalho e filtros dos Registos deixam de oscilar durante o scroll, incluindo scroll descendente e ascendente.
- Nota de Honorários e Cobrança apresentam nas linhas apenas período, descrição e tempo; o responsável e o valor individual deixam de poder ser incluídos. Período e tempo ficam centrados horizontalmente nas células.
- Os valores financeiros permanecem apenas nos totais do documento e os dados do emitente são os da Sociedade seleccionada.
- Validação final: segurança de ficheiros, lint, TypeScript, 81 testes, build, dry-run Cloudflare e 30 E2E Chromium aplicáveis aprovados; 2 cenários exclusivos de produção omitidos.
- Publicada em 2026-08-21 a partir do commit funcional `9d98ad9`. O deploy manual criou `5f80941d-fcfd-4a7f-93fc-2f5536b4cb7d` / `fec6a83f-3092-4583-83c8-509373b7b39e`; a integração automática do mesmo commit ficou depois activa a 100% como Deployment ID `7e08c564-2f37-4de0-b2a8-cab9e1788a7a` e Version ID `fae41e0b-1bd1-4963-8561-143fd5228a88`. HTTP 200 e bundle `0.4.11` confirmados directamente.

## Lote local 0.4.10 — auditoria funcional alargada

- Ordem inicial dos Registos alterada para data descendente: mais recente primeiro.
- Correcção preparada para recálculo nas edições em linha e auditoria obrigatória do motivo do Operador.
- Matriz real Administrador/Operador aprovada transaccionalmente, incluindo movimentos, estados financeiros, Notas de Honorários e Cobranças; nenhuma escrita de QA ficou persistida.
- Segurança, lint, TypeScript, 81 testes, build e 30 E2E Chromium aplicáveis aprovados.
- Produção 0.4.10: frontend automático no commit `36dbe35`, Deployment ID `9089632c-3a3f-48d9-aba4-0cafab690ae3`, Version ID `aafb55c6-f638-47a9-8082-01764f1baa11`; backend e reparação selectiva aplicados após autorização.
- Estado final confirmado: zero totais horários manuais incoerentes; novo RPC auditado activo; RPC antigos revogados; smoke Administrador/Operador aprovado com rollback.

## Versão 0.4.9 — recálculos e sessão após mudança de PIN

- Duração, valor/hora e descontos recalculam o total na interface e no servidor.
- Mudanças das dimensões de preço, incluindo Sociedade, recalculam a regra e os totais dependentes.
- Administradores não justificam edições ou eliminações; Operadores indicam motivo auditável e concluem a operação.
- Primeira alteração de PIN mantém o acesso através de uma sessão nova.
- Testes: 81 unitários/componentes, 30 E2E Chromium aplicáveis e bateria transaccional Administrador/Operador com rollback aprovados.
- Produção confirmada em `https://legal-carina.dabranches.workers.dev`, commit funcional `0bbea29`, Cloudflare Deployment ID `551cd5ff-140c-4678-bd23-5a524b2d3e05` e Version ID `bcb82b5a-dcd3-4569-934f-f6214865cdc1`, publicada em 2026-08-20.
- Bundle online `0.4.9`, HTTP 200 e smoke transaccional pós-publicação Administrador/Operador aprovados com rollback.

## Versão 0.4.8 — permissões dos movimentos

- Administradores editam, mudam Sociedade e apagam movimentos sem justificação obrigatória.
- Operadores podem executar as mesmas operações, com motivo auditável obrigatório e sem bloqueio depois de preenchido.
- Supabase validado transaccionalmente e migrations isoladas aplicadas; nenhuma escrita de teste ficou persistida.
- Segurança, lint, TypeScript, 79 testes, build, dry-run e 30 E2E aplicáveis aprovados.
- Produção confirmada em `https://legal-carina.dabranches.workers.dev`, commit `e6b8677`, Cloudflare Version ID `19b81fd5-25aa-4658-b974-4060c8f1f9f3`, publicada em 2026-08-20.

## Versão 0.4.7 — correcções de movimentos

- Criação com cálculo bidireccional entre duração, valor/hora e valor total, persistido no Supabase.
- Ordem por defeito crescente, colocando os movimentos mais recentes no fim da lista.
- Refresh preserva a localização actual, incluindo PWA standalone.
- Justificação de alterações financeiras obrigatória apenas para Operadores; administradores mantêm auditoria automática sem campo obrigatório.
- Supabase `vtvvqyebigflgqccbqsw` saudável e migrations isoladas do lote aplicadas após revisão do histórico remoto.
- Validação local: segurança, lint, TypeScript, 79 testes, build, dry-run Cloudflare e E2E focado aprovados.
- Produção 0.4.7: commit `f9bad23`, Cloudflare Version ID `5412939b-d0b7-4e2a-9617-8db71510a93c`, publicada em 2026-08-19.
- Backfill autorizado e publicado no Supabase: 7 movimentos anteriores à versão 0.4.7 receberam o total calculado e auditoria técnica. Confirmação pós-operação: trigger financeiro activo, 8/8 movimentos manuais do dia com total e zero linhas com valor/hora sem total.

## Hotfix 0.3.3 — grelha dos gráficos principais

- Os gráficos `Valor por ano` e `Valor por mês` da Visão Geral voltaram a ocupar conjuntamente toda a largura disponível, em duas colunas iguais, sem a metade vazia introduzida pela grelha de quatro colunas.
- Correcção confirmada visualmente nos modos claro e escuro antes da publicação urgente solicitada.
- Produção e actualização PWA confirmadas em `0.3.3`; commit `e03f6e77411fc00a77b88dfb49c8bba27febe01d`, Cloudflare Version ID `c74b9fb3-5614-4cb8-bdfa-fa74e317295d`.

## Lote local 0.3.2 — em curso

- Versão `0.3.2` publicada em 2026-08-18 a partir do commit `25fc7cee980badadb9ece6a2930ae6c1238be345` da branch `codex/reconcile-full-import`.
- Produção confirmada visualmente em `https://legal-carina.dabranches.workers.dev/`; Cloudflare Version ID `c34073d9-d160-43c2-8ba1-d40f1e066621` e versão visível `0.3.2`.
- Pesquisa de Registos optimizada no Supabase: primeira página autenticada reduziu de cerca de 7 s para 1,7 s; foram acrescentados índices de paginação, estados e ligação à factura, preservando âmbito e mascaramento financeiro.
- Cache temporária em memória prepara os 7 198 movimentos numa chamada e é invalidada após criação/edição. As tabelas passaram a usar o scroll vertical da página, têm opção 100 e mantêm `Todas` virtualizada.
- Retirada a coluna `Alteração manual`; `N.º factura` é editável na linha. Cliente apresenta apenas o nome, mantendo código e vertente nas colunas próprias.
- Base sem clientes mistos activos após reclassificação explícita dos 24 casos.
- Primeira correcção: fallback seguro quando `get_work_entry_form_options` responde sem opções; confirmado com 225 vertentes disponíveis e sem escrita de teste.
- Atalhos dos dashboards e listas passaram para navegação SPA partilhada; o fluxo autenticado `Particulares > Por facturar` manteve a sessão e conciliou 559 no cartão e na tabela integral.
- Corrigida a persistência de perfis de cliente: vertentes novas desactivadas não são inseridas com código vazio; prefixos e duplicados são validados antes da escrita.
- Validação autenticada conciliou atalhos de Clientes, Sociedades, Responsáveis e Sem sociedade com as tabelas (559, 243, 39 e 127), sem logout.
- A tabela integral terminou em `1–7198 de 7198`; o filtro Cliente apresentou as opções do universo e regressou a 7 198 ao limpar. A leitura integral passou a uma chamada de 10 000 após optimização do RPC e deixou de exceder o timeout no ensaio autenticado.
- Balões dos gráficos e editor directo Dias/Horas/Minutos confirmados visualmente em modo escuro; sem gravações de teste.
- Gates finais 0.3.2: ficheiros sensíveis, lint, TypeScript, 52/52 testes, build, dry-run Cloudflare e 24 E2E aprovados (2 exclusivos de produção omitidos), cobrindo iPhone/PWA, Windows, claro/escuro, rotação e safe areas.
- Fecho do lote: permissões de Definições limitadas a proprietário/administrador, criação de cliente com uma única vertente obrigatória, dashboards de Sociedade/Responsável com seis indicadores e quatro alertas, e contraste próprio dos gráficos no modo escuro.
- Validação final actualizada: 56/56 testes unitários; dry-run Cloudflare aprovado; 22/22 cenários locais de iPhone/Windows aprovados. O processo Playwright continua a não encerrar sozinho depois do último cenário e foi terminado apenas após confirmar todos os resultados.

## Lote 0.3.0 — preparado para publicação em 2026-08-18

- Versão local: `0.3.0`; branch `codex/reconcile-full-import`.
- Inclui a reorganização transversal de dashboards, tabelas e filtros, edição individual de movimentos, criação de movimentos, ficha de cliente móvel, contactos múltiplos e códigos de cliente por vertente.
- Gates verdes: ficheiros sensíveis, lint, TypeScript, 52 testes, build, 24 E2E aprovados e dry-run Cloudflare. Dois testes dependentes de produção foram omitidos como previsto.
- Supabase: manter aplicação isolada de SQL e reconciliação cautelosa do histórico; `db push` global permanece bloqueado.
- Produção e PWA confirmados na versão `0.3.0`: commit funcional `72906a0`, Cloudflare Version ID `6c8c8099-0169-4a92-a9c5-0777b91cc3fe`; o fluxo `Actualização disponível` → `Actualizar aplicação` foi validado directamente.

Actualizado em: 2026-08-17

## Regra de entrega

### Publicação 0.2.7

### Hotfix 0.2.8

- Corrigido o arranque/reabertura do PWA Windows para regressar sempre à Visão geral, em vez de reutilizar o último dashboard de Sociedade.
- Atalhos do acompanhamento, incluindo `Sem sociedade`, navegam sem refresh completo e preservam a sessão.
- Restauradas isoladamente as RPCs/permissões remotas necessárias ao refresh, dashboard e pesquisa de movimentos através de `20260817173743_restore_dashboard_rpc_permissions.sql`.
- Sessão autenticada confirmada após refresh; atalho `Sem sociedade` confirmado com 127 movimentos e sem logout.

- Branch `codex/reconcile-full-import` reconciliada por merge com o lote remoto 0.2.6 que estava publicado.
- Importação canónica concluída com 7 198 movimentos activos; as importações seguintes comparam todas as linhas e actualizam movimentos já existentes quando a origem mudou.
- Dashboards, atalhos de acompanhamento, 12 meses móveis, comparação por sociedade, tooltips por período, landing de clientes e tabelas compactas estão implementados.
- A tabela de movimentos carrega o universo autorizado completo para pesquisa, filtros, ordenações e `Todas`; o backend integral recebe exactamente os mesmos filtros, incluindo `Sem sociedade`.
- Supabase: migrations funcionais aplicadas isoladamente, incluindo `20260817173000_extend_work_export_universe.sql`; `db push` global continua bloqueado pela divergência histórica conhecida.
- Validação local: `pnpm check` verde, 51/51 testes, build e dry-run Cloudflare verdes. A matriz Playwright percorreu os 24 cenários, mas o runner ficou aberto após iniciar o último e teve de ser interrompido.

- Alterações acumuladas apenas no checkout local `C:\Projetos\legal-carina`.
- Versão publicada: `0.2.6`.
- A Cloudflare publicou automaticamente a versão `0.2.6` após o push da branch `codex/client-identifiers-documents-0.2.6`; a produção foi confirmada directamente no browser integrado.
- Migrações remotas destrutivas continuam excluídas desta publicação.
- Versão local e produção: `0.2.6`, na branch `codex/client-identifiers-documents-0.2.6`. `main` ainda não contém o lote; abrir PR, obter CI verde e fundir é prioritário para não deixar produção à frente do GitHub principal.

## Lote local 0.2.6 em preparação

- Identificadores de cliente activos no Supabase, com consulta, criação, alteração e eliminação sujeitas ao âmbito de acesso do cliente.
- Documentos de cliente activos num bucket privado de 20 MB, limitado a PDF, JPG, PNG, DOCX e XLSX sem conteúdo activo.
- Upload, arquivo, reactivação e eliminação passam pela Edge Function autenticada `client-documents`; o browser não tem escrita directa na tabela nem no Storage.
- Consulta por ligação assinada de 60 segundos; metadados incluem categoria, datas, tamanho e SHA-256.
- Migrations remotas isoladas `20260817095147`, `20260817095157`, `20260817095206` e `20260817095316`; não foi executado `db push`.
- O ficheiro de importação mais recente ainda tem de ser localizado e comparado por data, hash, linhas e duplicados. Não limpar a base antes dessa verificação, cópia de segurança e autorização específica para a operação destrutiva.
- Validação local deste lote: lint, TypeScript e 49/49 testes aprovados. A validação visual autenticada ficou pendente porque a sessão do browser integrado expirou; não foram solicitados nem usados PINs.
- Produção confirmada em 0.2.6. O erro transitório `permission denied for table clients` foi investigado: privilégios e RLS permanecem presentes e a lista voltou a carregar sem alteração à base.

## Lote 0.2.4 publicado

- A exportação XLSX dos Registos de trabalho pede ao backend todos os movimentos autorizados que correspondem aos filtros principais apenas quando o utilizador carrega em XLSX.
- O carregamento inicial continua limitado à pesquisa paginada de 100 movimentos e deixa de determinar o conteúdo da exportação integral.
- O botão comunica preparação, sucesso e erro sem bloquear a abertura da página.
- Foram acrescentadas regras permanentes em `AGENTS.md`, protocolo de computador novo e política de versionamento.
- O deployment Cloudflare activo e a limitação da associação ao commit ficaram documentados.
- Validação local: `pnpm check` aprovado com 47/47 testes; E2E local com 23 aprovados e 1 cenário exclusivo do preview de produção omitido como previsto.
- Browser integrado: versão `0.2.4`, exportação visível, claro/escuro e viewport iPhone compacto sem overflow horizontal.
- GitHub: PR rascunho `#5`; `CI` e `Secret scan` do commit funcional `67797f9` verdes.

## Advisors Supabase consultados em 2026-08-17

- Segurança: `billing_entity_financial_permissions` e `user_login_credentials` têm RLS activa sem políticas directas; confirmar que permanecem exclusivamente acessíveis por endpoints controlados.
- Segurança: `export_visible_work_entries` e `get_entity_dashboard_rolling` são `SECURITY DEFINER` executáveis por `authenticated`; este desenho é intencional para aplicar âmbito e mascaramento, mas exige revisão dos predicados e testes negativos antes de publicação.
- Auth: protecção contra passwords comprometidas aparece desactivada; confirmar disponibilidade/custo do plano antes de activar.
- Desempenho: existem FKs sem índice de cobertura, índices ainda não utilizados e políticas permissivas múltiplas. Não remover índices apenas por ainda não terem utilização; rever com carga representativa e migrations próprias.
- Nenhuma alteração remota foi feita durante esta consulta.

## Lote local 0.2.5 em preparação

- Registos de trabalho e clientes abrem por duplo clique; `Enter` numa linha focada mantém acesso equivalente por teclado.
- Corrigida a abertura dos movimentos enquanto as RPC `get_work_entry_form_options`, `get_work_entry_for_edit` e `update_work_entry_details` ainda não existem no Supabase remoto: existe fallback compatível, sempre sujeito às permissões/RLS actuais.
- Ficha completa de movimento preparada, incluindo duração, preços, descontos, estados, facturação, pagamento, arquivo e sociedade.
- Edição completa activa no Supabase através de `update_work_entry_full`. A eliminação foi simplificada para controlo interno: qualquer utilizador com acesso de edição pode apagar qualquer movimento após confirmação, incluindo facturados ou pagos. Ligações a facturas, importações e descontos são anuladas, preservando esses registos. Migrações remotas isoladas `20260817091517` e `20260817091927`, sem `db push` das restantes migrações divergentes.
- A ficha de cliente abre inicialmente para consulta e permite mudar explicitamente para edição e guardar alterações.
- Dados gerais da ficha: nome, estado, vertentes/códigos, denominação legal, NIF, correio electrónico, telefone, morada e notas.
- Documentos do cliente são consultáveis na ficha; o carregamento só aparece durante a edição.
- Identificadores múltiplos e flexíveis (`client_identifiers`) aplicados remotamente e preparados para criação, edição e eliminação.

- Duplo clique numa linha dos Registos de trabalho abre directamente o modal de edição desse movimento.
- A mesma acção é acessível por teclado com `Enter` quando a linha tem foco.
- Produção mantém `0.2.4`; não efectuar push deste lote até controlar os builds automáticos Cloudflare.

## Correcção local 0.2.6 em preparação

- Importação integral reconciliadora implementada na branch `codex/reconcile-full-import`.
- Todas as linhas efectivas são comparadas com a linhagem do lote anterior; novas são criadas, inalteradas preservam o movimento e alteradas actualizam o mesmo `id` com auditoria.
- Linhas ausentes não são apagadas. Conflitos com alterações manuais bloqueiam a transacção.
- RPCs base e reconciliadoras aplicadas isoladamente ao Supabase remoto em 2026-08-17. Nenhuma outra migration pendente, Edge Function ou publicação Cloudflare foi executada.
- A análise reconciliadora foi otimizada em `20260817162500_optimize_import_candidate_analysis.sql` depois de o ficheiro real exceder o `statement_timeout`; a versão remota agora agrega e classifica as linhas em bloco, sem concatenação JSON quadrática.
- Nova linha de base concluída a partir de `20260817 HORAS ESCRITÓRIO.xlsx`: 7 198 movimentos activos e 6 linhas inválidas apenas na revisão da importação. Verificação idempotente: 7 198 inalterados, 0 alterados, hash remoto confirmado.
- Aplicação directa confirmada por catálogo e privilégios: RPCs apenas para `authenticated`, helper privado sem execução para clientes. Os carimbos locais permanecem ausentes do histórico remoto e devem ser reconciliados sem `migration repair` por suposição.

## Implementado localmente

- Interface **Carina - Legal**, navegação hierárquica, contraste claro/escuro, PWA e versão visível.
- Dashboards e registos ligados aos dados reais existentes, com ocultação visual uniforme de valores financeiros.
- Administração de utilizadores com nome visível, identificador independente, PIN inicial, alteração obrigatória, suspensão, reposição e mensagem copiável.
- Perfis proprietário, administrador, gestor, financeiro, advogado, consulta e auditor; o Gestor continua limitado às Sociedades autorizadas e à permissão financeira independente.
- Permissões editáveis por Sociedade, separando acesso operacional de acesso a valores financeiros.
- Clientes com perfis particular e empresa; a mesma entidade pode possuir ambas as vertentes.
- Documentos de cliente preparados para bucket privado, com metadados, hash, limite, URLs assinadas e validação obrigatória do conteúdo numa Edge Function; uploads directos ficam bloqueados.
- Importação XLSX/CSV em análise, confirmação e gravação transaccional; linhas inválidas ficam preservadas para revisão.
- Read models preparados para aplicar âmbito e mascarar valores financeiros no backend.
- Criação e edição operacional de movimentos usam endpoints controlados; acções em massa de Sociedade, Responsável, processo, preço/hora, desconto, facturação, pagamento e arquivo são atómicas, exigem motivo e ficam auditadas.
- Worker Cloudflare preparado com CSP e restantes cabeçalhos de segurança.
- Carregamento diferido dos módulos; processador XLSX separado do bundle principal.

## Validação local confirmada

- TypeScript aprovado; 46/46 testes unitários aprovados; build de produção aprovado e sem source maps.
- Refresh da Visão geral validado com estado de carregamento explícito; gráficos anuais e mensais suportam vista agregada ou por Sociedade, com séries de cores distintas e curvas mensais suavizadas.
- O gráfico anual por Sociedade usa todo o histórico autorizado; o gráfico mensal apresenta os 12 meses terminados no mês do movimento mais recente.
- Os dashboards individuais terminam os seus 12 meses no último movimento da entidade seleccionada; o export completo de movimentos foi criado no Supabase com mascaramento financeiro e acesso apenas autenticado.
- E2E: 24 testes aprovados em duas execuções limpas: 23 cenários funcionais/responsivos e 1 cenário isolado contra o preview real do build e respectivo service worker; 11 iPhones e 7 resoluções Windows cobertos.
- Inspecção visual corrigiu a localização truncada em iPhone compacto; título completo confirmado sem overflow horizontal.
- Auditoria de dependências de produção sem vulnerabilidades conhecidas.
- Pesquisa de segredos no checkout e histórico sem segredo confirmado.
- Dry-run do Worker Cloudflare aprovado, sem publicação.

## Exige aprovação e execução remota

- Permanecem por decidir as migrations locais divergentes `20260816180000` a `20260816198000` que não foram aplicadas isoladamente neste lote.
- Edge Functions eventualmente alteradas, deploy do frontend/Worker e actualização das PWA instaladas.

## Ainda aberto antes da publicação

- Executar pgTAP das novas políticas e importador num PostgreSQL/Supabase autorizado.
- Os fixtures pgTAP foram alinhados com o modelo actual, mas esta estação não tem Docker para iniciar uma stack Supabase local.
- Concluir a decisão de histórico para os pares de migrations com formatação extensa e para a migration de username/PIN aplicada fora do histórico.
- Repetir a matriz e os fluxos críticos no preview remoto sem dados reais, depois de aplicar a configuração aprovada.

## Riscos actuais

- As funções deste lote documental foram executadas; outras funções de migrations locais divergentes continuam por reconciliar.
- O histórico remoto de migrations usa 11 versões que não existem com o mesmo carimbo no checkout; o `db push --dry-run` fica bloqueado até reconciliar os identificadores sem perder código.
- A ocultação visual protege o ecrã; a autorização efectiva tem de permanecer no backend.
- Passkeys exigem domínio HTTPS definitivo e validação em hardware Windows/iPhone.
- Documentos estão activos com bucket privado, políticas por âmbito e URLs de 60 segundos; falta executar um teste visual autenticado sem dados reais.
- A aplicação não pode receber “PRONTA PARA PUBLICAÇÃO” antes dos testes remotos de RLS, Storage, perfis e bundle.
# Correcções 0.2.3 em preparação

- Registos de trabalho passaram a carregar os primeiros 100 movimentos pela pesquisa paginada, sem executar uma exportação integral no arranque.
- RPCs de Registos de trabalho e dashboards tiveram permissões autenticadas reafirmadas e o schema PostgREST recarregado.
- Os dashboards das Sociedades apresentam os 12 meses até ao último registo disponível.
- O gráfico mensal deixa de exigir scroll horizontal em resoluções desktop, mantendo comportamento adaptado em ecrãs pequenos.
- O servidor de desenvolvimento remove service workers antigos para mostrar sempre a versão local em preparação.
# Versão 0.2.9 — perfil Operador e leitura operacional

- Novo perfil **Operador**, limitado às Sociedades explicitamente atribuídas, com edição dos movimentos e sem administração de utilizadores, importações ou configurações.
- A autorização financeira continua independente por Sociedade; criação e alteração do perfil são validadas no backend e auditadas.
- Visão geral reorganizada em dois grupos lado a lado, cada um com duas colunas: Resumo operacional e Acompanhamento. O indicador redundante Total de minutos foi retirado.
- Widgets preparados com total e subtotais exactos por Sociedade, calculados no Supabase sob as mesmas regras de âmbito e ocultação financeira.
- Evolução anual das Sociedades apresenta uma linha por Sociedade com mini-barras verticais, valores e anos, sem scroll horizontal em desktop; inclui uma linha final Total com a soma anual.
- Valor por mês mostra, em Agregado e Por sociedade, uma janela por período com o total e todos os valores por Sociedade.
- Os alertas de Acompanhamento usam agora fundo, contorno, ícone, título e atalho vermelhos para evidenciarem trabalho pendente.
- Nos gráficos finais, a Evolução anual ocupa a coluna larga da esquerda; Arquivo e Distribuição das sociedades ficam empilhados à direita, sem espaços vazios em desktop.
- Nas tabelas comuns, todas as células não monetárias ficam centradas; apenas os valores monetários permanecem alinhados à direita.
- No scroll horizontal dos Registos de trabalho, a Data e a selecção deslocam-se normalmente; apenas o nome do Cliente permanece fixo.
- A coluna Cliente usa fundo opaco nos estados normal, hover e seleccionado, impedindo a sobreposição visual das restantes células durante o scroll.
- Imprimir/PDF isola o resultado da tabela, usa orientação horizontal e ajusta todas as colunas a uma única página de largura.
- A edição em massa foi retirada dos Registos de trabalho; não existem caixas de selecção nem acções colectivas, mantendo-se apenas a edição individual por duplo clique/Enter.
- Acima dos filtros normais existe um bloco vermelho de pré-filtros de atenção: Sem sociedade, Sem preço, Por facturar, Facturados não pagos e Facturados sem data/estados históricos. Cada botão limpa os filtros correntes e consulta o universo integral.
- A versão local passa a acompanhar automaticamente o `package.json` quando este muda, através do reinício observado pelo Vite.
- Evolução anual dos dashboards de Sociedade usa também barras verticais compactas.
- Validação local: `pnpm check` aprovado (51/51 testes); E2E 24 aprovados e 2 opcionais omitidos.
- Migrations isoladas deste lote: `20260818105352_add_operator_role.sql` e `20260818111659_add_dashboard_metric_breakdowns.sql`. Não executar `db push` devido à divergência histórica conhecida.

# Versão 0.3.2 — auditoria das dimensões e tabelas

- Os dashboards de uma Sociedade usam a Sociedade como universo e desagregam os gráficos por Responsável; os dashboards de um Responsável usam o Responsável como universo e desagregam por Sociedade. A Visão geral mantém a desagregação por Sociedade e os dashboards de categoria de Cliente permanecem agregados.
- A função `get_entity_dashboard_rolling` foi corrigida e aplicada isoladamente através de `20260818190000_correct_entity_dashboard_breakdowns.sql`; não foi usado `db push`.
- Os atalhos filtrados deixam de herdar pesquisa, filtros, ordenação e página de uma consulta anterior. Apenas ordem, largura e visibilidade de colunas, além do tamanho de página, permanecem como preferências visuais do utilizador.
- A paginação distingue o total remoto do lote inicialmente carregado: o caso Sem sociedade foi validado visualmente com 127 resultados, páginas 1–100 e 101–127.
- Alertas de dashboard com contagem zero desaparecem; reaparecem quando a contagem volta a ser positiva.
- Auditoria visual confirmada em Visão geral, Clientes/Particulares, MASSIVE SEARCH e PAULA. Validação local: lint e TypeScript aprovados, 55/55 testes aprovados e build de produção aprovado.
- Estado: apenas local/Supabase isolado; não publicar sem nova ordem explícita do utilizador.
- Corrigida ainda a reutilização indevida do identificador ao navegar entre submenus: cada Sociedade ou Responsável remonta o dashboard antes da consulta. Sequência visual confirmada: CARINA SANTOS 149 227,50 €, LEGAL TEAM 417 509,50 € e MASSIVE SEARCH 127 337,50 €.
# Lote local 0.4.0 — preparação de Notas de Honorários (2026-08-18)

- Produção permanece em `0.3.3`; este lote não foi publicado nem enviado para uma branch com build automático.
- Arquivo documental local reforçado: carregamento múltiplo com resultado individual, validação de conteúdo, prevenção por SHA-256, remoção lógica recuperável e estados de validade. A Edge Function e a migration `20260819020000_prevent_duplicate_client_documents.sql` ainda não foram promovidas ao remoto.
- A lista de Clientes deixou de carregar antecipadamente o gerador de PDF: o bloco inicial `MasterDataPage` baixou de cerca de 458 kB para 38 kB brutos; o gerador só é carregado ao abrir Nota de Honorários/Cobrança.
- Validação corrente: TypeScript, build e 69/69 testes aprovados. Produção e Supabase remoto permanecem inalterados neste sublote.
- A ficha de Cliente ganhou `Preparar Nota de Honorários`: consulta apenas movimentos não facturados do Cliente, permite selecção múltipla apenas neste fluxo e prepara uma impressão/PDF com Cliente, mês/ano, descrição, duração e total de tempo.
- Foram acrescentados os dados futuros de emissão ao Cliente (destinatário, Sociedade emissora, idioma e meio de envio) e à Sociedade (identificação, contactos, morada, banco, conta, IBAN, BIC/SWIFT, moeda e IVA).
- A migration remota isolada `add_honorarium_note_fields` foi aplicada ao Supabase, seguida de `secure_honorarium_default_society_scope`; a chave composta impede referências entre escritórios. Não foi executado `db push`.
- O gráfico anual duplicado no fim dos dashboards de Responsáveis foi removido, uniformizando-os com os dashboards de Sociedades.
- Validação local: ficheiros sensíveis, oxlint, TypeScript, 58/58 testes e build aprovados. A matriz Playwright percorreu 24 cenários locais e omitiu 2 exclusivos de produção; mantém-se a anomalia conhecida de o processo não encerrar após o último resultado.
- Dry-run Cloudflare aprovado sobre 31 assets, sem publicação. O comando de build do Wrangler passou a usar directamente os binários locais de TypeScript/Vite, evitando que o wrapper pnpm tente reinstalar dependências numa sessão sem TTY.
- Auditoria Supabase: sem erros críticos; 19 avisos de segurança/informativos e 92 de desempenho/informativos, todos pré-existentes ou de revisão arquitectural. Não foram revogados RPCs necessários nem removidos índices por automatismo.
- Decisão confirmada pelo utilizador: o Operador pode consultar, criar e actualizar todos os Clientes e respectivas vertentes do escritório, independentemente da Sociedade. A migration `allow_operator_all_client_management` foi aplicada isoladamente; não concede eliminação nem acesso às Definições. Teste RLS transaccional positivo para leitura integral, criação e actualização, negativo para eliminação, sem deixar dados sintéticos.
- As listas de Clientes apresentam, ao lado de `Abrir ficha`, o botão `Emitir Nota de Honorários`. O botão abre exactamente o mesmo selector de movimentos não facturados usado dentro da ficha; fica azul/activo quando há movimentos disponíveis e neutro/desactivado quando não há. A RPC `get_uninvoiced_client_ids()` fornece o indicador sem carregar movimentos cliente a cliente e uma falha transitória deste indicador nunca bloqueia a lista.

# Estado de validação 0.4.0 — 2026-08-19

- Estado: versão `0.4.0` publicada a partir do commit funcional `ec0541a` da branch `codex/reconcile-full-import`; URL `https://legal-carina.dabranches.workers.dev`, Version ID Cloudflare `7a560053-0951-421f-989d-519d3ef9d2c4`, confirmado em 2026-08-19.
- UX responsiva verificada no browser integrado: Windows 1920×1080 (100%, equivalentes 125%/150%), tablet 1024×768, iPhone compacto 375×667 e iPhone 430×932, nos modos claro e escuro.
- Corrigido o overflow móvel dos gráficos finais da Visão Geral através de `min-w-0` na grelha e nos dois contentores. O dashboard preenchido passou a ter largura estritamente contida.
- Criar e editar movimento usam formulário vertical com scroll interno e rodapé sticky seguro em iPhone. A tabela liberta os filtros extensos a 150%, preservando apenas ferramentas e cabeçalho sticky.
- Gates locais finais aprovados: ficheiros sensíveis, lint, TypeScript, 75 testes unitários, build Vite, dry-run Cloudflare e 29 testes E2E; 2 cenários exclusivos de produção foram omitidos por condição normal. Supabase ligado sem erros de schema no lint público.
- As migrations isoladas revistas, a Edge Function documental e o frontend foram publicados. Nunca executar `db push` global enquanto persistir a divergência histórica.
- Validação funcional autenticada como `Operador`: rotas de Administração, Utilizadores, Importações, Definições e Auditoria ficam inacessíveis; leitura, criação e edição de movimentos permanecem disponíveis e auditadas para consulta posterior por Administrador.
- Dashboards confirmados com universos distintos: as três Sociedades apresentam totais próprios e desagregação por Responsável; CARINA, HUGO e PAULA apresentam totais próprios e desagregação por Sociedade. CARINA continua a ser o caso mais lento, cerca de 6 segundos, e requer análise de plano antes de qualquer optimização SQL.
- Atalhos de acompanhamento conferidos contra as tabelas: CARINA 722 por facturar, 463 facturados não pagos e 554 sem preço; MASSIVE SEARCH 62, 173 e 0, respectivamente. O alerta a zero permanece visível em verde e abre uma tabela vazia coerente.
- Nota de Honorários do cliente sintético validada em desktop e iPhone 390×844, incluindo separação por Sociedade, Português/Inglês/Francês, selecção de movimentos, colunas ordenáveis, totais e despesas. Não existe overflow móvel e o rodapé de gravação fica integralmente visível em modo escuro.
- Foi criado e depois eliminado um movimento estritamente sintético pelo Operador para confirmar criação, permissões de eliminação e auditoria. A pesquisa exacta devolveu 0/0 e o universo regressou de 7 221 para 7 220 movimentos; o motivo QA ficou registado.
- A opção `Todas` foi medida com 7 221 movimentos: apresenta o intervalo integral, mas mantém apenas 40 linhas reais no DOM por janela virtual. Um teste com 7 200 linhas fixa este contrato para evitar regressões de desempenho.
- Notas de Honorários e Cobranças deixaram de depender de uma única resposta de 10 000 linhas: carregam todas as páginas do Cliente e recusam gerar um documento se o total recebido estiver incompleto.
- O carregador de documentos deixou de usar um formulário aninhado dentro do formulário da ficha. O editor permanece aberto após carregar o painel documental e o upload usa agora um botão explícito, sem submissões involuntárias da ficha.
- No Chrome real foi detectada uma segunda submissão involuntária: durante o clique, o botão `Editar` era reutilizado como `Guardar alterações` e o comportamento predefinido submetia a ficha. A transição cancela agora explicitamente esse comportamento e o botão final declara `type="submit"`; confirmado visualmente após 4 segundos em claro e escuro, com ficha, arquivo e rodapé ainda abertos.
- No cliente sintético, Nota de Honorários devolveu apenas o movimento não facturado (15 min) e Cobrança apenas o movimento facturado não pago (1 h). Idiomas, colunas e totais mantêm-se funcionais. Com `Allow access to file URLs` activo, o Chrome aceitou o PDF sintético.
- O projecto Supabase correcto é `vtvvqyebigflgqccbqsw`: a sequência aditiva 0.4.0 está aplicada e reconciliada, o projecto está `ACTIVE_HEALTHY` e a Edge Function `client-documents` versão 2 está `ACTIVE`, com `verify_jwt=true`. Não foi executado `db push` global.
- Verificação pós-publicação: página, manifesto e service worker respondem por HTTPS 200; o manifesto abre em `/?view=overview` e o cache activo é `carina-legal-shell-0.4.0`. Os 2 testes específicos de produção/preview passaram.

# Correcção local 0.4.1 — janela mensal dos dashboards de Clientes

- Particulares e Empresas passam a receber do Supabase uma janela contínua de 12 meses terminada no mês do registo mais recente do respectivo universo, em vez de Janeiro–Dezembro do último ano com meses futuros vazios.
- Migration isolada `make_client_dashboards_rolling_12_months` aplicada e registada no projecto `vtvvqyebigflgqccbqsw`; não foi usado `db push` global.
- Validação autenticada como Operador: Particulares e Empresas apresentam 12 pontos de 09/25 a 08/26, em claro e escuro, sem erros de consola. Segurança, lint, TypeScript, 75/75 testes, build e matriz E2E com 29 aprovados/2 omitidos passaram.
- Os contadores de `Não facturados` e `Facturados não pagos` dos dashboards de Clientes usam agora exactamente o mesmo universo dos atalhos, excluindo respectivamente `uncollectible_uninvoiced` e `uncollectible_invoiced`. A migration isolada `align_client_dashboard_attention_counts` está aplicada e registada no Supabase correcto.
- Prova autenticada: Particulares apresentam 484/484 não facturados e 294/294 facturados não pagos; Empresas apresentam 281/281 e 193/193. Em todos os casos, o valor da caixa coincide com a contagem total da tabela filtrada.
- Estado: Supabase corrigido e código local em `0.4.1`; frontend Cloudflare permanece em `0.4.0` até nova ordem explícita de publicação.

# Lote 0.4.2 — incobráveis nos dashboards

- Os dashboards de Clientes, Sociedades e Responsáveis apresentam um contador próprio de Incobráveis com acesso directo à tabela filtrada.
- Nos dashboards de Clientes, créditos facturados incobráveis continuam incluídos no histórico facturado, mas deixam de integrar `Por receber`; trabalho abandonado antes de facturar permanece fora de `Não facturados`.
- Prova autenticada: Particulares 2/2, Empresas 4/4, Sociedade CARINA SANTOS 3/3 e Responsável CARINA 4/4 entre contador e tabela filtrada.
- Contraste e legibilidade revistos visualmente nos modos claro e escuro, mantendo o comportamento vermelho quando existem ocorrências e verde quando o contador é zero.
- Versão `0.4.2` publicada em 2026-08-19 a partir do commit funcional `537bc4a`; Cloudflare Version ID `57434d1c-d171-46c6-8183-8127d95e4a95` em `https://legal-carina.dabranches.workers.dev`.
- Verificação pós-publicação: HTTPS 200, manifesto com arranque na Visão Geral e service worker `carina-legal-shell-0.4.2`. A interface pública identifica correctamente a versão 0.4.2.
- Correcção Supabase posterior ao frontend 0.4.2: `get_entity_dashboard_rolling` deixou de reutilizar métricas/recentes da função antiga sem mascaramento e passou a construir todo o resultado exclusivamente com `has_scope_access` e `visible_financial_value`. O Operador mantém 4 936 h e 203 clientes em CARINA, mas os valores financeiros passaram a reflectir apenas as Sociedades autorizadas.
- Medição autenticada de CARINA: 6,4 s antes e 8,1 s depois da correcção de segurança. O acréscimo vem do cálculo seguro das opções do selector; optimização posterior obrigatória, sem recuar no controlo financeiro.

# Lote 0.4.3 — desempenho seguro dos dashboards individuais

- A migration isolada `optimize_secure_entity_dashboard` foi aplicada ao projecto confirmado `vtvvqyebigflgqccbqsw`. O perfil, o escritório e o âmbito global são resolvidos uma única vez por pedido; utilizadores limitados continuam a usar `has_scope_access` e o Operador continua sujeito às permissões financeiras por Sociedade.
- Prova autenticada como Operador: CARINA mantém exactamente 660 818,25 € trabalhados, 602 835,00 € facturados e 553 103,75 € recebidos. Três carregamentos completos consecutivos baixaram de cerca de 8,1 s para 1,27–1,30 s.
- Sociedade CARINA SANTOS e Responsável CARINA carregaram em cerca de 1,3 s, sem erro, com gráficos e alertas. Contraste revisto visualmente em claro e escuro.
- Gates locais: ficheiros sensíveis, lint, TypeScript, 75/75 testes e build aprovados. A matriz E2E percorreu os 31 cenários; mantém-se apenas a anomalia conhecida de o processo não encerrar depois de apresentar todos os resultados.
- Auditorias Supabase depois da DDL: zero erros de segurança e zero erros de desempenho. Avisos existentes permanecem para revisão arquitectural, sem revogar RPCs necessárias nem remover índices por automatismo.
- Versão `0.4.3` publicada a partir do commit `cd06d3d` em `https://legal-carina.dabranches.workers.dev`; Cloudflare Version ID `b95932a2-0a46-466b-9cd8-2de5936e28ea`.
- Pós-publicação: página pública sem ecrã branco e com versão 0.4.3, manifesto HTTPS 200 com `/?view=overview` e service worker/cache `carina-legal-shell-0.4.3` confirmados.

# Lote 0.4.4 — arranque PWA sem recarga inicial

- Corrigido o `controllerchange` do service worker: a activação inicial deixa de forçar uma recarga; a recarga acontece apenas depois de o utilizador escolher «Actualizar aplicação».
- O teste PWA tem limite explícito de 10 segundos, valida a cache `carina-legal-shell-0.4.4` e limpa o worker/cache do contexto de ensaio.
- Validação local: segurança, lint, TypeScript, 75/75 testes unitários, build, 29 testes E2E de interface (2 ignorados por modo), 2/2 testes PWA de produção e dry-run Cloudflare concluídos.
- Publicado em `https://legal-carina.dabranches.workers.dev` com Cloudflare Version ID `7c577650-c8eb-44c3-ac1f-c5b843a0bd84`; confirmação pós-publicação em Chrome: versão 0.4.4, Visão Geral renderizada e sem recarga repetida/ecrã branco.

# Lote 0.4.5 — consistência dos documentos de cobrança

- Notas de Honorários e Cobranças foram validadas na lista de Empresas com o cliente sintético, incluindo o universo correcto, selecção de movimentos, separação por Sociedade e idiomas Português, Inglês e Francês.
- A Cobrança passa a apresentar o mesmo aviso preventivo da Nota de Honorários quando faltam dados legais ou bancários da Sociedade emissora; mantém-se possível gerar um documento incompleto apenas para revisão.
- Validação local: segurança, lint, TypeScript, 76/76 testes unitários, build, 29 testes E2E de interface (2 omitidos por modo) e dry-run Cloudflare aprovados.
- Publicação final 0.4.5 confirmada em `https://legal-carina.dabranches.workers.dev`, a partir do commit `e359402`, Cloudflare Version ID `49fdc0e8-6d2b-430b-9360-528998edf161`.
- O teste PWA deixou de fixar a versão da cache no código e passa a derivá-la de `package.json`; manifesto e activação da cache `carina-legal-shell-0.4.5` passaram 2/2 no preview de produção.
- Pós-publicação autenticado em Chrome: versão 0.4.5, Visão Geral sem ecrã branco, Nota de Honorários e Cobrança com universos correctos e aviso de dados incompletos da Sociedade emissora em ambos os documentos.

# Lote 0.4.6 — validação integral do Operador em preparação

- A matriz documental passou a cobrir despesas, IVA e total global da Nota de Honorários e confirma que a Cobrança não apresenta despesas.
- Foi acrescentada prova E2E de navegação: o PWA abre deliberadamente na Visão Geral; o browser normal preserva `Clientes > Empresas > Lista` num refresh directo.
- Tabela real medida em produção: cerca de 3,2 s para 7 220 movimentos; pesquisa global do cliente sintético em cerca de 1,2 s, com 12/12 resultados. A opção `Todas` representa 7 220 linhas, mantendo cerca de 41 elementos no DOM por virtualização.
- Edge Function `client-documents` activa no Supabase, JWT obrigatório e rejeição sem sessão confirmada. A documentação RLS passou a incluir o papel Operador e a eliminação individual por RPC com motivo auditável.
- A ficha completa do movimento passou a expor os dois estados Incobrável e mantém `status`, Facturado e Pago sincronizados. Ensaio autenticado como PAULA CHAVES (`Operador`) confirmou 7 220/7 220 movimentos, edição completa em claro/escuro, ausência de menus administrativos e acesso correcto a Nota de Honorários e Cobrança do cliente sintético.
- Gates finais locais: ficheiros sensíveis, lint, TypeScript, 78/78 testes unitários, build, dry-run Cloudflare e 30 E2E aprovados; 2 cenários exclusivos do preview de produção foram omitidos por condição normal.
- Versão 0.4.6 publicada em `https://legal-carina.dabranches.workers.dev`, Cloudflare Version ID `e02609ff-527d-4e84-97d7-7de3df1b612e`; confirmação visual pública mostrou 0.4.6, login íntegro e nenhum erro de consola.
# Versão 0.6.0 — publicada em 2026-08-24

- Publicação manual confirmada a partir do commit `80a45cbdae4fdd5d316d7011300df7f15d887033`, branch `codex/reconcile-full-import`, em `https://legal-carina.dabranches.workers.dev`.
- Cloudflare Deployment ID `cea3b2b4-3ce4-40c5-bdea-3b437dee59f1`; Version ID `ae1b887b-b59d-4342-bc1d-0e5e389ecc54`, com 100% do tráfego desde 2026-08-24 19:17 UTC.
- Pós-publicação: HTTP 200, bundle `index-BMQuYZr1.js` e cache PWA `carina-legal-shell-0.6.0` confirmados. Gates finais: segurança, lint, TypeScript, 112/112 unitários, build, 58/58 E2E aplicáveis em série, 2 cenários exclusivos de preview omitidos, CI e dry-run Cloudflare aprovados.

# Versão 0.6.0 — logótipos por Sociedade

- A ficha de cada Sociedade aceita um logótipo por selecção ou arrastamento de JPG, PNG ou PDF. A primeira página de PDF é convertida localmente e só o recorte PNG final é guardado; o documento original não é conservado.
- O editor permite deslocar e ampliar a imagem numa moldura 3:1 antes de aplicar o recorte. O ficheiro final fica num bucket Supabase privado e associado à Sociedade.
- Notas de Honorários e Cobranças usam o logótipo da Sociedade emissora no cabeçalho do PDF. Sem logótipo, preservam exactamente o cabeçalho textual anterior.
- Migration candidata `20260824153000_add_billing_entity_logos.sql` criada localmente; não foi aplicada ao Supabase. Frontend 0.6.0 não publicado.
- Validação local: segurança de ficheiros, lint, TypeScript, 107/107 testes unitários e build aprovados.
- Avenças: modelo funcional discutido, mas ainda não implementado neste lote. Os movimentos cobertos deverão preservar horas sem valor individual; a análise calculará o valor/hora efectivo a partir do valor das avenças no período.

# Versão 0.6.1 — avenças em validação local

- Tratamento de avenças implementado com condições temporais, periodicidade financeira independente do período das horas, mapa mensal/anual, valor/hora efectivo e controlo das mensalidades.
- Registos de avença preservam horas sem preço/valor individual e já não entram nas pendências financeiras normais.
- Fichas de clientes, sociedades e responsáveis usam consulta compacta e edição explícita, com guardar condicionado a alterações e cancelamento restaurável.
- EBO inicia a condição activa em 2021-01-01: 48 movimentos permanecem cobertos (36 h) e 4 movimentos de 2026 com 120 €/h e 150 € históricos foram preservados como trabalho à peça até confirmação do escritório. Frontend ainda não publicado.
- Validação actual: segurança, lint, TypeScript, 114/114 testes e build aprovados; browser confirmou contadores, ficha EBO e cancelamento sem persistência.
- Tratamento de avenças: títulos distinguem contratado/utilizado e período actual/histórico total. Valores/hora efectivos confirmados em 221,40 €, 528,89 € e 182,33 € para os três clientes. Facturação detalhada está visível mas permanece sem períodos criados até validação do escritório.
- Ficha de cliente organizada em Geral, Contactos, Facturação, Avença, Credenciais e Documentos. Geral inclui denominação, NIF, tipo e códigos, ocultando em consulta as vertentes inexistentes e o estado activo redundante.
- Criação de movimentos: Facturável, Facturado e Pago são cumulativos; Avença é exclusiva, só está disponível durante uma condição vigente e envia a duração sem preço/valor para os mapas. Supabase recebeu isoladamente `add_creation_billing_treatment`, através da nova RPC `create_work_entry_with_treatment`, preservando a RPC anterior.
- Validação móvel focada aprovada: 26/26 E2E, incluindo iPhone SE antigo a Pro Max, sem overflow horizontal e com Guardar/Cancelar acessíveis por scroll vertical. Unitários: 115/115.
- Novo menu Notas depois de Registos, com cartões adaptados ao conteúdo, texto, anexos de imagem/áudio, gravação de voz, listas marcáveis, urgência e partilha individual em Consulta/Edição. O acesso é isolado por escritório e utilizador através de RLS; o Dono mantém visão global.
- As migrations isoladas `add_workspace_notes` e `allow_note_policy_helpers` estão aplicadas ao projecto Supabase confirmado. A página real carrega sem erro de políticas e apresenta a lista de utilizadores activos para partilha.
- Publicação 0.6.1 concluída em `https://legal-carina.dabranches.workers.dev`, Cloudflare Version ID `e243f1e8-7017-4e7d-8772-e728b306a928`. Produção confirmou HTTP 200, bundle `index-CzuQpdVx.js` e service worker/cache `carina-legal-shell-0.6.1`.
- Ajuste posterior local: removido o título «Notas» repetido dentro da área de trabalho e promovido «+ Nova nota» a acção principal larga e destacada, ocupando a largura disponível em iPhone. TypeScript e build aprovados; ainda não publicado.
- O protótipo local das Notas usa agora `qa-demo=1` para dados estritamente sintéticos em memória e deixa de consultar tabelas reais com a identidade QA. Verificação visual completa: zero alertas, dois cartões com alturas distintas, editor com texto/lista/voz/partilha funcional e iPhone 320 px sem overflow.
- Os dados demonstrativos incluem quatro notas de CARINA SANTOS partilhadas com o utilizador actual: texto, lista, imagem e áudio. Todos os títulos contêm `TESTE`; Consulta bloqueia os campos e não apresenta Guardar, enquanto Edição permite alterar e guardar.
- O modo `qa-demo` intercepta transversalmente chamadas REST/RPC ao Supabase e devolve apenas respostas sintéticas locais. Auditoria visual aos 12 destinos principais — Visão Geral, Clientes, Sociedades, Responsáveis, Registos, Notas, Avenças, três listas de fichas, Administração e Importações — confirmou conteúdo visível, zero alertas e nenhuma ocorrência de `permission denied`/`Failed to fetch`.
- A marca `TESTE` é visível exclusivamente nos quatro títulos das notas demonstrativas. Avenças conserva os nomes EBO, INFANTÁRIO DO POVO e COCKTAIL TEAM sem qualquer sufixo de exemplo; a matriz transversal impede `TESTE` em qualquer outro menu do protótipo.
- Versão 0.6.2 preparada para publicação. A matriz completa detectou sobreposição do símbolo da Justiça com o menu no iPhone 13 mini; a altura móvel foi ajustada e os 15/15 cenários iPhone passaram depois da correcção. Segurança, lint, TypeScript, 115/115 unitários e build também aprovados.
- Versão 0.6.2 publicada em 2026-08-30 a partir do commit funcional `daa6cdd2f67dde5974e71260e70e9ba9cb0d5a16`. Cloudflare Version ID `3f2dc508-7df5-4d60-b9aa-50b571a9a767`; produção confirmou HTTP 200, bundle `index-D-GNWpSl.js`, cache `carina-legal-shell-0.6.2` e renderização visual da página Notas com a versão correcta.
- Versão 0.6.3 preparada: quatro notas demonstrativas reais pertencem a CARINA SANTOS e estão partilhadas com `dabranches`, incluindo lista, imagem e áudio. Os recursos demonstrativos são servidos por caminhos públicos controlados; nenhuma avença foi modificada. Gates aprovados: segurança, lint, TypeScript, 115/115 unitários e build.
- Versão 0.6.3 publicada em produção com Cloudflare Version ID `91d12e25-f890-43e9-a8ca-179f78994685`; HTTP, bundle `index-Dp9eifQ2.js`, cache PWA, anexos e versão visível confirmados directamente.
- Versão 0.6.4 preparada localmente: Administradores podem corrigir apenas o nome visível do Proprietário; login, perfil e estado permanecem protegidos. A interface passa a mostrar o erro funcional real das Edge Functions. Gates aprovados: segurança, lint, TypeScript, 115/115 testes e build; ainda não publicada.
- O nome do Proprietário estava divergente entre os metadados Auth (`DIOGO ABRANCHES`) e `user_login_credentials` (`dabranches`). A cópia interna foi sincronizada em produção e o selector de partilhas já apresenta visualmente o nome correcto; a correcção de código 0.6.4 previne a recorrência após publicação.
- Versão 0.6.4 publicada: Cloudflare Version ID `9988876c-ef87-4ae5-9a69-ac2f6609aa71`, bundle `index-CchSpcbr.js`, cache PWA 0.6.4 e `admin-users` v9. Teste real confirmou que um Administrador corrige o nome do Proprietário sem poder alterar o login e sem erro não-2xx genérico.
