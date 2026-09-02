# Legal Carina — handover

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

## Versão 0.7.0 — provisões e edição por ficha, em preparação

- Gates de publicação concluídos no commit funcional acc7b2ac671e433add7f24e8d1a2cb392f91cff3: CI/secret scan verdes, ensaio remoto com 20/20 pgTAP e zero findings críticos. Backup físico confirmado. A migration foi aplicada apenas em staging. Evidências e limites em docs/database/provisions-070-validation.md; produção ainda 0.6.5 neste ponto.

- Correcção adicional de QA: a demonstração sintética reconhece também o Supabase local configurado pelo CI; isolamento de produção mantido. Os seis E2E de provisões/isolamento passaram com a configuração exacta do CI, lint e TypeScript aprovados.

- Publicação autorizada em 02-09-2026, em validação no PR #13. Gate identificou jsPDF 3.0.3 vulnerável: actualizado para 4.2.1, lockfile preservado e auditoria sem vulnerabilidades conhecidas. Corrigidos fixtures E2E antigos (universo completo/terminologia de registos) e versionamento do service worker em directórios de build alternativos. 122 unitários, 24 verificações PostgreSQL isoladas e 68 E2E passaram (1 cenário exclusivo do servidor Vite omitido no preview estático). Branch Supabase temporária autorizada para ensaio sem dados reais; não promover enquanto não validar esquema/políticas reais e CI.

- Branch `codex/client-credit`, baseada no checkout limpo `1120068db17b674e3fbc417e74f55543226f82a9`, sincronizado com `origin/codex/reconcile-full-import` após `fetch`. `origin/main` permanece 99 commits atrás dessa base; não foi feito merge ou alteração de produção.
- Novo separador **Provisões** na ficha do Cliente e submenu **Clientes > Provisões**, depois de Avenças. A lista usa pesquisa/filtros/exportação comuns e inclui todas as contas que já tiveram provisões, mesmo esgotadas; não retira clientes de Particulares/Empresas.
- Ajuste visual de 02-09-2026: removido o filtro de saldo positivo. Linhas verdes com saldo e vermelhas sem saldo; valores recebidos, descontos, barra/percentagem consumida e saldo visíveis. Botão Histórico e duplo clique abrem a conta da linha, incluindo a sociedade/moeda correcta. Altura de linha configurável na tabela comum, respeitada pela virtualização. Validação deste ajuste: TypeScript, lint, segurança, build sintético, 16 testes da tabela e 5 E2E de provisões aprovados; revisão integrada em claro/escuro e formatos desktop, tablet e iPhone. Versão 0.7.0 continua em preparação, sem deploy ou migration remota.
- Saldo inicial e reforços por Cliente/Sociedade; a emissão da Nota de Honorários desconta a provisão no total com IVA, permite cobertura parcial e guarda nota/registos/valores. Novo download é idempotente. Extracto por período, cópia discriminativa e estorno auditável disponíveis na ficha. Registos de notas activas ficam fora de novas notas/cobranças; facturação fiscal não é alterada automaticamente.
- Edição: clique simples selecciona, duplo clique abre a ficha; removida toda a edição de células nos Registos. Clientes/Sociedades/Responsáveis abrem editáveis, com Guardar condicionado a alterações.
- Migration `20260902180905_add_client_credit_ledger.sql` apenas local/GitHub: **não aplicada ao Supabase**. `supabase migration list --linked` executado/revisto; permanece a divergência histórica conhecida. Projecto `vtvvqyebigflgqccbqsw` confirmado `ACTIVE_HEALTHY` por consulta directa. Ensaio isolado em PostgreSQL/PGlite 0.5.8: 24 verificações, incluindo repetição, dupla emissão, saldo parcial, estorno, RLS e bloqueio de alterações ao serviço. Esquema completo/políticas reais de staging e CI são gates ainda necessários antes de publicar.
- Browser integrado aberto com demonstração sintética em `http://127.0.0.1:4193/?qa-iphone=1&qa-demo=1&qa-provisions=1&view=provisions`; estado apenas em memória. Servidor estático usado porque Vite na porta 4192 ficou sem responder. Não foram usados dados de clientes reais.
- Validação visual em claro/escuro, desktop/iPhone e PDFs renderizados; fluxo de provisões aprovado em 320, 390, 768 e 1440 px. E2E: 5 cenários de provisões, 9 de fichas/permissões e 14 iPhone aprovados; o cenário `/iphone-preview` foi omitido por ser exclusivo do servidor Vite.
- **Produção CONFIRMADA e preservada:** 0.6.5, URL `https://legal-carina.dabranches.workers.dev`, Version ID `ac433c71-5464-4bb1-8894-ec490d41c740`, activa a 100% em consulta Wrangler de 02-09-2026. Deployment ID documentado `7a682a2c-bf6a-4fda-8e0e-d76caa80f6af`; commit funcional associado `f77e58a` pelo handover/GitHub. Nenhum deploy, migration ou escrita de dados remota neste lote. Publicação requer ordem explícita **publica**.
- Detalhes e limites: `docs/client-provisions.md`.

- Verificação final: segurança de ficheiros, lint sem avisos, TypeScript, 122/122 testes unitários e build aprovados. Os comandos foram executados pelos entrypoints locais instalados, equivalentes aos scripts pnpm, após o wrapper pnpm ficar preso a tentativas de rede.

- GitHub confirmado após push: commit funcional `7020e845aed3d53f288511ad1ebfea06b16c7999`, branch `codex/client-credit`, HEAD local e remoto coincidentes em 02-09-2026. Este registo documental segue num commit adicional.

## Versão 0.6.5 — carregamento dos Registos publicada

- Corrigido o alerta transitório `TypeError: Failed to fetch` ao entrar em «Registos»: a consulta repete automaticamente apenas falhas de rede transitórias e conserva o estado «A recolher os registos…» durante as tentativas.
- Erros persistentes e funcionais continuam a apresentar o aviso com «Tentar novamente»; não são ocultados nem repetidos indiscriminadamente.
- Publicada em 02-09-2026 a partir do commit funcional `f77e58a`, branch `codex/reconcile-full-import`: Deployment ID `7a682a2c-bf6a-4fda-8e0e-d76caa80f6af` e Version ID `ac433c71-5464-4bb1-8894-ec490d41c740`, activa a 100% em `https://legal-carina.dabranches.workers.dev`. Supabase não foi alterado.
- Verificação sem cache: HTTP 200, bundle `/assets/index-BeVkmjPK.js` e service worker/cache `carina-legal-shell-0.6.5`.
- Validação: ficheiros sensíveis, lint, TypeScript, 115/115 testes, build e dry-run aprovados. A matriz E2E local foi interrompida após o Chromium abortar a navegação para o servidor local antes de chegar à aplicação (`ERR_ABORTED`), limitação já documentada neste computador; o smoke test online foi aprovado.

## Avenças temporais e tratamento — base ligada em 30-08-2026

- Migração `add_retainer_terms_history` aplicada ao Supabase ligado: condições históricas sem sobreposição, periodicidade mensal/bimestral/trimestral/semestral/anual, horas incluídas por ciclo e resumo de consumo corrente.
- Novo submenu `Clientes > Avenças` e 3.ª caixa Avenças no dashboard; é uma visualização adicional e não altera as contagens de Particulares/Empresas.
- `INFANTÁRIO DO POVO`: 139/139 movimentos em avença, 5 160 minutos preservados e zero preços/valores individuais.
- Movimentos de avença não contam na pendência `Sem preço`; contador autenticado passou de 666 para 527 e Avenças mostra 139.
- Interface 0.6.1 continua apenas local/GitHub por publicar; produção frontend permanece 0.6.0. `pnpm check`: 114/114 testes e build verde.

## Versão 0.6.1 — contadores e edição imediata em preparação

- Tabelas de Clientes/Sociedades/Responsáveis repetem até duas vezes apenas falhas transitórias de rede (`Failed to fetch`) e ignoram respostas tardias de carregamentos já substituídos, evitando o alerta inicial que permanecia sobre uma tabela entretanto carregada.
- Login local validado na porta 4190: o proxy de `pin-auth` responde correctamente; a porta 4181 devolvia `502` neste computador e foi abandonada para a sessão local.
- «Pendências a corrigir» apresenta contadores exactos nos seis botões através da nova RPC agregada `get_work_attention_counts`, sem carregar os movimentos completos apenas para contar.
- Após uma edição directa, a linha é actualizada imediatamente; a confirmação integral acontece silenciosamente em segundo plano.
- Migration `20260829125438_add_work_attention_counts.sql` ensaiada com rollback e aplicada isoladamente. Frontend ainda não publicado.
- Atribuições de sociedades pedidas pelo utilizador concluídas e verificadas em 899 registos: sete clientes em CARINA SANTOS e três em LEGALTEAM; zero divergências finais.
- Segurança, lint, TypeScript, 114/114 unitários, build e 58/58 E2E aplicáveis aprovados; 2 cenários exclusivos de produção omitidos. Existem testes específicos dos seis contadores e da repetição selectiva de falhas de rede.

## Versão 0.6.0 — avenças, credenciais, logótipos e exportação publicada

- **PRODUÇÃO CONFIRMADA em 2026-08-24:** commit funcional `80a45cbdae4fdd5d316d7011300df7f15d887033`, branch `codex/reconcile-full-import`, URL `https://legal-carina.dabranches.workers.dev`, Deployment ID `cea3b2b4-3ce4-40c5-bdea-3b437dee59f1` e Version ID `ae1b887b-b59d-4342-bc1d-0e5e389ecc54`, activa a 100% do tráfego desde 19:17 UTC.
- Verificação pós-publicação: HTTP 200, bundle `/assets/index-BMQuYZr1.js`, folha `/assets/index-DZI4m6Z2.css` e service worker/cache `carina-legal-shell-0.6.0` confirmados directamente sem depender do estado local.

- Sociedades: upload JPG/PNG/PDF, enquadramento inicial integral, recorte/zoom e PNG privado usado nas Notas de Honorários e Cobranças. A migration isolada foi aplicada ao Supabase; coluna, bucket privado, quatro políticas e permissões auxiliares foram confirmados. Upload, gravação, reabertura e remoção foram provados no browser com dados sintéticos depois eliminados.
- Clientes: configuração de avença, mensalidades com estados Por facturar/Facturada/Liquidada/Incobrável, horas cobertas sem preço por movimento, valor/hora efectivo e fila própria «Cobertos por avença». Cada movimento pode ser classificado como coberto ou fora da avença; só os segundos entram em «Por facturar».
- Credenciais: plataforma, ligação, utilizador e palavra-passe sempre visíveis na ficha; segredos cifrados no Vault, histórico de versões e auditoria. Criação, alteração e histórico real foram provados com segredos sintéticos e limpos do cofre.
- Edição: fichas abrem editáveis; «Guardar alterações» só activa após mudança, incluindo acções programáticas como adicionar/remover contactos, identificações, contas bancárias e logótipo. Paula/Operadores deixam de ser bloqueados por ausência de justificação, mantendo auditoria e autoria.
- Tabelas: XLSX, impressão e PDF usam exactamente o universo filtrado, incluindo filtros de atenção. Impressão em A4 horizontal, uma página de largura, com todas as linhas filtradas e sem virtualização/paginação truncada.
- Supabase: migrations `20260824170000`, `20260824183000` e `20260824184500` ensaiadas com rollback e depois aplicadas isoladamente; nunca foi usado `db push`. A divergência do histórico remoto permanece e deve continuar a ser tratada explicitamente.
- Prova real: cliente sintético com avença de 1 200 €, mensalidade liquidada, 2 h cobertas (600 €/h efectivo) e 1 h extra. «Por facturar» devolveu só o extra e «Cobertos por avença» só as 2 h. Limpeza final: zero clientes, movimentos, avenças, mensalidades e credenciais sintéticas.
- Gates: segurança, lint, TypeScript, 112/112 unitários, build e 58/58 E2E aplicáveis; 2 cenários exclusivos de preview/produção omitidos. PDFs reais, matrizes iPhone/Windows/zoom e desempenho também aprovados.
- Frontend 0.6.0 publicado após ordem explícita `publica`.

## Publicação exclusivamente manual — 2026-08-22

- `CONFIRMADO`: a integração Git da Cloudflare foi desligada e o token
  `legal-carina build token` foi revogado. PRs, Dependabot e pushes deixaram de
  ter um caminho automático para o Worker de produção.
- A branch predefinida do GitHub é agora `codex/reconcile-full-import`, que
  contém o commit funcional publicado `480135e` e o handover corrente.
- Produção só pode mudar por deploy manual depois da ordem explícita `publica`.
  Worker, versões, deployments, Supabase e dados foram preservados.
- `tmp/` de QA foi enviado para a Reciclagem após confirmação do utilizador.

## Incidente Cloudflare de 2026-08-22 — resolvido

- **CONFIRMADO:** seis PRs Dependabot foram construídos pela integração Git da Cloudflare entre 09:13:33 e 09:14:43 UTC. Como o comando configurado era `npx wrangler deploy`, cada build de branch substituiu o Worker de produção; a última deixou online o frontend 0.2.5. Não existiu `git revert`, force-push ou alteração do Supabase.
- **CONTENÇÃO CONFIRMADA:** a opção Cloudflare «Compilações para ramificações de não produção» foi desactivada e continuou desactivada após recarregar o painel. A integração conserva `main` como branch de produção, mas PRs e restantes branches deixam de criar deployments neste Worker.
- **PRODUÇÃO RESTAURADA:** 0.5.7 reconstruída a partir de `480135e`; Version ID activa a 100% `15485d53-a045-4f1f-bbca-8998eba30bd1`, criada em 2026-08-22 às 09:59 UTC. HTTP 200, bundle `/assets/index-B_aNRE0x.js` e cache `carina-legal-shell-0.5.7` confirmados directamente sem cache.
- Gates: segurança de ficheiros, lint, TypeScript, 107/107 unitários, build e dry-run aprovados. A tentativa E2E desta sessão ficou bloqueada antes da aplicação por `ERR_ABORTED` no `page.goto` ao servidor local; o commit/artefacto reposto é exactamente o que já tinha a matriz E2E integral aprovada.

## Versão 0.5.7 — acessos ao retomar o PWA publicada

- Regista como acesso o retorno do PWA/separador autenticado ao estado visível, mesmo quando React permanece montado e o utilizador não volta a introduzir o PIN. Reentradas em menos de 60 segundos são deduplicadas.
- A identidade apresentada prefere `auth.users.raw_user_meta_data.display_name`, depois a credencial e finalmente o username.
- A consulta dos logs Auth de produção confirmou que os acessos omitidos eram reativações por token de sessões PWA, que não actualizam `last_sign_in_at`. Foram recuperadas sete reativações comprovadas de 2026-08-21, entre 12:54:20 e 18:41:56 UTC, incluindo a sessão da Carina às 14:17:11 UTC. Os eventos preservam a hora original e estão identificados por `auth_method=pwa_session_recovered` e `source=supabase_auth_log`; a verificação posterior confirmou sete eventos e uma ocorrência da Carina.
- A recuperação histórica está limitada à retenção disponível dos logs técnicos Auth (últimas 24 horas); `auth.audit_log_entries` encontra-se vazio, pelo que não se devem inventar sessões anteriores sem prova. A versão 0.5.7 passa a persistir futuras restaurações e reaberturas directamente em `security_events`.
- Lint, TypeScript e 107/107 testes unitários aprovados. Publicada com Cloudflare Version ID `c5135902-610c-4d70-82d4-064c98fdb7c2`, bundle `index-B_aNRE0x.js`, service worker `0.5.7`, HTTP 200 e `admin-users` v8 activa com JWT obrigatório.

## Versão 0.5.6 — cobertura integral dos acessos publicada

- Corrigida a lacuna dos logs quando o PWA restaura uma sessão já válida: essas entradas passam a ser registadas com `auth_method=session_restore`.
- A Edge Function dos Utilizadores complementa eventos em falta com o `last_sign_in_at` do Supabase Auth, usando uma janela de um minuto para não duplicar logins já auditados.
- Nome apresentado: `display_name` da credencial, metadados autenticados e username, por esta ordem, ignorando valores vazios.
- Publicada a partir do commit `9b8f9aa`. Cloudflare Version ID `d00e6567-9e53-4d79-a211-33e69f236b71`, bundle `index-B6E1XSJM.js`, service worker `0.5.6` e HTTP 200 confirmados. Edge Function `admin-users` v7 activa com JWT obrigatório.

## Versão 0.5.5 — registos de acesso em preparação

- Nova rota e entrada «Registos de acesso» sob Administração, exclusiva do proprietário tanto na navegação como na protecção da rota e na Edge Function.
- A gestão de Utilizadores fica separada do histórico de entradas. Administradores continuam com Utilizadores, importações e dados-base, sem conseguirem ver ou abrir os logs; Operadores permanecem fora da Administração.
- Validação local: TypeScript, lint, 107/107 testes unitários, 9/9 fluxos de permissões e desempenho isolado aprovado (72 amostras/4,10 s, desvio 0 px, pesquisa 0,75 s).
- Ainda não publicada; produção permanece em `0.5.4`, commit `559a3d9`, Version ID Cloudflare `0ff8b0fa-f6ae-4891-b282-7cca6b5f7689`.

## Versão 0.5.4 — correcção definitiva do alinhamento sticky em preparação

- O modo fixo do cabeçalho congela simultaneamente as larguras das células e do `colgroup`, usando a geometria real da tabela para posição e recorte. Isto elimina a divergência que só surgia com larguras guardadas no PWA/produção.
- Prova geométrica automatizada em zoom 80%, 100%, 125%, 150% e 200%, acrescida da matriz sticky existente: 19/19 cenários aprovados, incluindo seis dimensões de iPhone.
- Matriz de perfis aprovada: Administrador com Administração, Utilizadores e dados-base integrais; Operador com criação/edição de Clientes, Sociedades e Responsáveis e sem acesso administrativo.
- Gates: segurança, lint, TypeScript, build, 105/105 testes unitários, 9/9 fluxos de permissões e 7/7 testes de navegação.

## Versão 0.5.3 — validação reforçada em preparação

- Código local na branch `codex/reconcile-full-import`; produção permanece em `0.5.2` (`d6f8417`, Deployment `21efbce5-cd22-4c3c-9550-d4e30a11796d`). Este lote não está publicado.
- Cliente: Administrador e Operador podem editar e persistir os dados usados nos documentos. Nota de Honorários e Cobrança permitem alterar destinatário e idioma no próprio documento.
- Despesas: tradução integral PT/EN/FR na tabela informativa da Nota, anexos privados abertos através de URL assinado sem perder o gesto do utilizador e selector reutilizável após upload.
- Prova autenticada: o movimento sintético do Operador mantém 180,00 € facturáveis, tem 2 despesas/18,00 € e 1 documento no bucket privado; a pré-visualização francesa associa as duas despesas ao movimento sem as incluir nos totais.
- Base de dados: 34/34 contratos pgTAP aprovados no projecto `vtvvqyebigflgqccbqsw`, em transacção terminada por rollback. Inclui outsider negado, Operador com motivo auditado e Administrador sem motivo obrigatório.
- Gates: segurança, lint, TypeScript, 105 testes unitários, build e 57 E2E aplicáveis aprovados; 2 omitidos por dependerem de preview/produção. Não publicar sem ordem explícita.

## Versão 0.5.2 — protecção contra edição acidental

- Nas tabelas com edição directa, o primeiro clique numa célula interactiva apenas selecciona a linha; só o segundo clique na linha já activa abre o editor dessa célula.
- O comportamento é uma opção do componente comum de tabelas e está activo nos Registos; as fichas de Clientes, Sociedades e Responsáveis já mantêm a abertura por duplo clique.
- Todas as tabelas abrem o universo completo por defeito, sem selector 10/20/50/100 nem paginação. Universos grandes continuam virtualizados para não desenhar milhares de linhas simultaneamente.
- Todos os títulos de colunas ficam centrados; o conteúdo de Actividade permanece alinhado à esquerda e valores mantêm alinhamento numérico à direita.
- As Sociedades admitem várias contas bancárias sob pedido através de «Adicionar dados bancários»; a primeira é principal e mantém compatibilidade com os documentos anteriores. Nota de Honorários e Cobrança permitem seleccionar uma ou várias contas a apresentar.
- O IVA da Nota de Honorários começa no valor predefinido da Sociedade, pode ser alterado no próprio documento e recalcula IVA/total sem alterar movimentos ou facturação.
- Migration Supabase `20260821124055_add_multiple_billing_entity_bank_accounts` aplicada isoladamente. Ensaio prévio com `ROLLBACK`, zero tipos inválidos/divergências e prova real do Operador com dois blocos bancários sem guardar dados.
- Validação: segurança de ficheiros, lint, TypeScript, build, 99/99 unitários e 55/55 E2E aplicáveis (2 exclusivos de preview omitidos). A tabela real carregou 7 233/7 233 movimentos; 1 000 linhas/72 posições de scroll mantiveram desvio sticky de 0 px.
- Publicada em 2026-08-21 a partir do commit funcional `d6f8417`. Deployment activo a 100% `21efbce5-cd22-4c3c-9550-d4e30a11796d`, Version ID `dd1d69d0-72cd-4b13-b7a7-d34b113d0b01`. HTTP 200, bundle `/assets/index-CBtzDRk4.js` e actualização PWA para `Versão 0.5.2` confirmados directamente.

## Versão 0.5.1 — alinhamento sticky publicado

- A grelha fixa agora as larguras num `colgroup`, preservando o centro exacto entre cabeçalho e células quando o cabeçalho entra em modo sticky.
- Medição local real antes/depois do sticky: desvio horizontal de `0 px` nas primeiras 10 colunas. Gates verdes: 96/96 unitários e 55/55 E2E aplicáveis (2 exclusivos de preview omitidos); o cenário de Operador mediu 72 posições de scroll em 1,19 s, desvio `0 px` e pesquisa em 0,79 s.

## Versão 0.5.0 — despesas persistentes publicadas

- Cada movimento pode ter várias despesas informativas, com montante, observações e anexos privados PDF/JPG/PNG/DOCX/XLSX. A criação do movimento e dos metadados das despesas é atómica; falhas de transferência de anexos podem ser repetidas na edição sem duplicar o movimento.
- Administrador/Proprietário cria, altera e remove despesas sem justificação; Operador tem as mesmas operações, exigindo motivo nas alterações e remoções para auditoria.
- A coluna `Despesas`, imediatamente depois de `Valor`, apresenta montante agregado, quantidade, primeira nota e legenda completa. O carregamento é feito em lotes e também cobre a exportação integral.
- As despesas vivem em tabelas próprias e nunca alteram `effective_amount`, IVA, facturação, pagamento ou dashboards. A Nota de Honorários inclui-as numa tabela informativa associada aos movimentos seleccionados; a Cobrança não as inclui.
- Backend promovido isoladamente: migration remota/local `20260821115454_add_work_entry_expenses.sql` e Edge Function `expense-documents` v1, activa com JWT obrigatório. Não foi usado `db push` nem `migration repair`; a divergência histórica pré-existente foi preservada.
- Validação: segurança, lint, TypeScript, build, 95/95 unitários, 55/55 E2E aplicáveis (2 exclusivos de preview de produção omitidos) e 30/30 contratos pgTAP no schema persistente. A execução transaccional deixou zero movimentos/despesas sintéticos.
- Desempenho E2E isolado: 5 000 clientes em 1,0 s e pesquisa em 0,21 s; 1 000 movimentos, 72 posições de scroll em 1,18 s, desvio do cabeçalho 0 px e pesquisa em 0,82–1,09 s.

## Versão 0.4.18 — em preparação local

- Corrigida uma rejeição não tratada na navegação quando uma resposta parcial do Supabase para Sociedades, Responsáveis ou perfis de Cliente não é uma lista. A sidebar passa a degradar de forma segura para menus vazios, sem bloquear a restante aplicação.
- O modo QA pode ser incluído explicitamente num build de teste através de `VITE_APP_ENV=test`, mantendo-se removido do build normal de produção. A matriz `/iphone-preview`, exclusiva do servidor Vite, é omitida apenas no preview compilado e executada separadamente no desenvolvimento.
- Gates confirmados: segurança, lint, TypeScript, 88/88 unitários e build. No build final de QA, 56/57 E2E passaram e 1 exclusivo do Vite foi omitido; esse cenário passou separadamente, totalizando 57/57 cenários aplicáveis.
- Desempenho no build: 5 000 Clientes abriram em 0,56–0,88 s, pesquisa em 0,11–0,22 s e maior tarefa longa em 89–170 ms. Em 1 000 movimentos, 72 amostras de scroll demoraram 1,17–1,18 s, pesquisa 0,51–0,84 s e o cabeçalho teve desvio vertical de 0 px.
- Provas transaccionais remotas com `ROLLBACK`: edição completa/recálculo 11, operações em massa 12, dados mestres 11 e financeiro/consolidações 30; auditoria posterior confirmou zero resíduos sintéticos.
- Nota de Honorários e Cobrança reais, ambas com 90 movimentos e 5 páginas, foram renderizadas integralmente e revistas visualmente: datas/tempos centrados, sem Responsável nem valor por linha, cabeçalhos/rodapés repetidos e totais dentro das margens.
- Divergência preservada: as quatro funções finais de edição/massa/dados mestres existem no schema remoto, mas as migrations locais de 21/08 não aparecem no histórico remoto. Não executar `db push` nem `migration repair` por suposição.

## Versão 0.4.17 — publicada em 2026-08-21

- A 0.4.16 publicou o novo build, mas a verificação de comprimentos HTTP provou que os URLs antigos dos ícones continuavam a devolver os bytes da 0.4.15. A 0.4.17 referencia nomes novos para o favicon e para 192/512 px, forçando a Cloudflare e os browsers a recolher os ficheiros brilhantes.
- `apple-touch-icon` 180 px também recebe o dourado de contraste reforçado e um URL novo para contornar a cache do iOS.
- Publicada a partir do commit funcional `2cc1c41`. Deployment activo a 100% `b57716d2-34d4-495e-948e-8af8647776a7`, Version `0b7f4c9d-04ac-40f2-a1c4-f7258b22add8`. HTTP confirmou os novos ficheiros pelos comprimentos exactos: favicon 1 604 bytes, iPhone 29 446, Windows 192 px 39 623 e Windows 512 px 213 653; service worker `0.4.17` activo.

## Versão 0.4.16 — contraste Windows/browser local

- Variante Windows/browser da Justiça Cega com dourado mais luminoso, traço aproximadamente 25% mais espesso e figura ligeiramente ampliada. O ícone iPhone de 180 px permanece inalterado.
- Actualizados favicon 32 px, manifest 192/512 px e ficheiros antigos equivalentes para compatibilidade. Ainda não publicada; produção permanece `0.4.15`.

## Versão 0.4.15 — publicada em 2026-08-21

- Novo ícone comum: busto da Justiça Cega dourado sobre azul-escuro no favicon, manifest PWA e `apple-touch-icon`. Assets PNG específicos: 32, 180, 192 e 512 px; os URLs versionados por nome evitam depender dos caminhos antigos em cache.
- Limitação iOS: não existe API web para obrigar um Web Clip já instalado a trocar o ícone. A nova referência pode ser recolhida pelo sistema, mas a substituição garantida continua a exigir remover e adicionar novamente o atalho.
- Publicada a partir do commit funcional `fd66f66`. Deployment activo a 100% `568e73b9-429d-4137-8827-f0b96b96a3c1`, Version `86727e94-d8d9-4c70-b297-26d4e87e1d74`. Página, service worker `carina-legal-shell-0.4.15`, manifest e os quatro ficheiros de ícone responderam HTTP 200 com os tipos correctos.

## Versão 0.4.14 — publicada em 2026-08-21

- Sidebar de iPhone: busto da Justiça Cega reduzido para 50% da altura e aproximadamente 50% da largura máxima usadas no desktop, com ligeiro deslocamento descendente. A área rolável dos menus recupera 128 px; desktop inalterado.
- Validação aprovada: captura real do iPhone 13 mini revista, 15/15 cenários móveis em onze modelos, 88/88 unitários, segurança, lint, TypeScript, build e dry-run Cloudflare.
- Publicada a partir do commit funcional `1d6923a`. Deployment activo a 100% `c5f53186-4cfc-4509-b3f6-686c22ff3a1e`, Version `8e277618-1449-4660-84e6-80c2ab1cb324`. Produção confirmou HTTP 200, service worker `carina-legal-shell-0.4.14` e bundle `/assets/index-lwUZNh0J.js`.

## Versão 0.4.13 — publicada em 2026-08-21

- Substituído o deslocamento vertical contínuo do `thead`, que podia ficar um frame atrás do scroll real e provocar o soluço visível, por estado fixo estável enquanto a tabela atravessa o viewport.
- O cabeçalho acompanha o scroll horizontal, é recortado à área da tabela e regressa ao fluxo natural nos limites; a barra de ferramentas e os filtros por coluna mantêm-se acessíveis.
- Validação: captura visual revista, lint sem avisos, TypeScript, 88/88 unitários, build, dry-run Cloudflare e 18/18 E2E focados em scroll, zoom 80–200% e seis dimensões de iPhone.
- Publicada a partir do commit funcional `9775923`. Deploy manual `76f40895-b74d-47d7-b1b7-c170f015821a` / `ca987268-e904-4cab-8ffb-fb33eeaa0083`; a integração Git do mesmo commit criou depois `6f5a9f4c-ba0b-4cad-bb33-de915d5fbcd2` / `2cbe8222-d0da-4a89-a65c-a4991a8cac1c`. Produção confirmou HTTP 200, service worker `carina-legal-shell-0.4.13` e bundle `/assets/index-BEj8OOMe.js`.

## Versão 0.4.12 — publicada em 2026-08-21

- Publicação confirmada em `https://legal-carina.dabranches.workers.dev` a partir do commit funcional `0d9eb98`, branch `codex/reconcile-full-import`. O deploy manual actual recebe 100% do tráfego: Deployment ID `c6f91020-c3de-49b3-9550-ccf0ceb35f2d`, Version ID `fed44c92-2b2d-4b5f-83dd-424c90817f69`, criado em 2026-08-21 às 08:23 UTC.
- Estado funcional local: Administrador edita e elimina sem justificação; Operador executa as operações equivalentes nos movimentos com motivo obrigatório mas não bloqueante. Duração, valor/hora, desconto e dimensões de preço recalculam o total; o valor final não altera os restantes critérios ao contrário.
- Dados mestres: Operador pode consultar, criar e editar Clientes, Sociedades e Responsáveis; Administração de utilizadores e importações continua exclusiva de Proprietário/Administrador.
- Prova ligada exclusivamente transaccional: edição completa 16 invariantes, massa 12, dados mestres 11 e financeiro/consolidações 30. Todos terminaram em `ROLLBACK`; auditorias de resíduos devolveram zero. Nunca executar estas migrations por `db push` global.
- A matriz financeira cobre seis estados, mesmo Cliente em duas Sociedades, dois Responsáveis, movimento sem Sociedade, totais globais e por entidade, listas Por facturar/Não pagos/Incobráveis, pagamento sem factura, incobrável facturado sem data, factura→pago e remoção de factura com reposição dependente.
- PDF real: Nota de Honorários e Cobrança com 90 movimentos/5 páginas, Cliente/data no nome, cabeçalhos de continuação, datas/tempos centrados, sem Responsável/valor por linha e total contido na margem.
- Desempenho/sticky: 5 000 Clientes abriram em 0,8–2,2 s e filtraram em 0,2–0,6 s; 1 000 movimentos, 72 amostras de scroll em ~1,17 s no contexto do browser, desvio vertical `0 px`; pesquisa 0,99 s isolada/1,55 s sob sete workers.
- Gates finais: segurança aprovada; lint sem avisos; TypeScript; 88/88 unitários; build; 55 E2E aprovados e 2 exclusivos de produção omitidos. Cobertura visual automatizada de zoom 80–200%, iPhones, Windows, rotação, modo escuro, texto ampliado e safe areas.
- Backend publicado por aplicação individual e revista das migrations `20260821000808_make_full_work_edit_rls_independent.sql`, `20260821011500_order_same_day_work_entries_by_creation.sql`, `20260821013000_fix_bulk_work_entry_permissions_and_recalculation.sql` e `20260821014500_allow_operator_master_data_management.sql`. Não foi usado `db push` nem `migration repair`. Os testes ligados pós-migration de edição/recálculo, operações em massa, dados mestres e consolidação financeira passaram integralmente com `ROLLBACK`.
- Verificação pós-publicação: HTTP 200, service worker `carina-legal-shell-0.4.12`, bundle e CSS activos e recurso `lady-justice-bust-a.png` acessível. A integração Git criou antes um deploy automático do mesmo commit, mas o deploy manual acima é o actual e autoritativo.

## Versão 0.4.11 — estabilidade da tabela e documentos financeiros

- Corrigida a oscilação do cabeçalho/filtros dos Registos: o deslocamento passa a ser medido no próprio cabeçalho, sem arredondamento por frame nem atraso de animação.
- Nota de Honorários e Cobrança deixam de oferecer ou renderizar as colunas Responsável e Valor. As linhas ficam limitadas a período, descrição e tempo; período e tempo são centrados horizontalmente e os montantes aparecem apenas nos totais.
- Mantém-se a Sociedade seleccionada como emitente e os respectivos dados legais e bancários no documento.
- Gates aprovados: segurança de ficheiros, lint, TypeScript, 81 testes, build, dry-run Cloudflare e 30 E2E Chromium aplicáveis; 2 cenários exclusivos de produção omitidos. O teste de scroll inclui estabilidade da posição em movimento descendente e ascendente.
- Publicada em 2026-08-21 a partir do commit funcional `9d98ad9`. Deploy manual: `5f80941d-fcfd-4a7f-93fc-2f5536b4cb7d` / `fec6a83f-3092-4583-83c8-509373b7b39e`. A integração automática do mesmo commit ficou depois activa a 100%: Deployment ID `7e08c564-2f37-4de0-b2a8-cab9e1788a7a`, Version ID `fae41e0b-1bd1-4963-8561-143fd5228a88`. URL pública com HTTP 200 e bundle `0.4.11` confirmados directamente.

## Lote local 0.4.10 — matriz operacional e recálculos em linha

- Registos abrem por defeito do mais recente para o mais antigo, tanto na consulta visível como na exportação correspondente.
- Todas as edições em linha passam por um RPC auditado; o Operador indica um motivo real e o Administrador não fica condicionado por justificação.
- Duração e valor/hora recalculam o total; data, Cliente, Responsável e Sociedade voltam a executar o motor de preços. Os RPC antigos deixam de estar executáveis directamente por utilizadores autenticados.
- Matriz transaccional Administrador/Operador aprovada com rollback: duração, valor/hora, Sociedade, data, actividade, observações, arquivo, facturação, número de factura, pagamento, incobrável, Nota de Honorários e Cobrança.
- Gates: segurança, lint, TypeScript, 81/81 testes, build e 30/30 E2E Chromium aplicáveis aprovados; 2 cenários exclusivos de produção omitidos.
- Publicação automática do frontend confirmada em 2026-08-20, commit funcional `36dbe35`, Cloudflare Deployment ID `9089632c-3a3f-48d9-aba4-0cafab690ae3` e Version ID `aafb55c6-f638-47a9-8082-01764f1baa11`.
- Backend alinhado após autorização: migrations `audit_and_recalculate_inline_work_entry_edits` e `repair_stale_manual_hourly_amounts` aplicadas. Dois movimentos horários incoerentes foram corrigidos selectivamente; verificação final devolveu zero incoerências.
- Prevenção confirmada: apenas o novo RPC auditado é executável por `authenticated`; quatro RPC antigos estão revogados. Smoke pós-publicação Administrador/Operador aprovou duração, valor/hora, Sociedade e motivo obrigatório, com rollback.

## Correcção 0.4.9 — recálculo integral dos movimentos

- Alterações de duração, valor/hora e desconto recalculam imediatamente o total na ficha e voltam a ser calculadas no servidor ao guardar.
- Alterar data, Cliente/vertente, processo, Responsável ou Sociedade volta a executar o motor de preços; a mudança de Sociedade actualiza a regra e todos os totais dependentes.
- Administradores continuam a editar, mudar Sociedade e eliminar sem justificação. Operadores executam as mesmas operações após fornecerem um motivo auditável.
- A primeira mudança obrigatória de PIN passa a entregar uma sessão nova, evitando a espera causada pela invalidação da sessão anterior; falhas de telemetria não transformam uma mudança já concluída num falso erro.
- Teste transaccional intensivo no Supabase de produção correcto validou Administrador e Operador, incluindo duração, valor/hora, desconto, Sociedade, motivo e eliminação; toda a escrita de teste foi revertida.
- Gates locais: segurança, lint, TypeScript, 81 testes, build e 30 E2E Chromium aplicáveis aprovados; 2 cenários exclusivos de preview de produção omitidos.
- Publicado em 2026-08-20 a partir do commit funcional `0bbea29`; Cloudflare Deployment ID `551cd5ff-140c-4678-bd23-5a524b2d3e05`, Version ID `bcb82b5a-dcd3-4569-934f-f6214865cdc1`, 100% do tráfego em `https://legal-carina.dabranches.workers.dev`.
- Pós-publicação: bundle confirmou `0.4.9`, resposta HTTP 200 e smoke transaccional Administrador/Operador aprovado com rollback.

## Correcção 0.4.8 — permissões auditadas dos movimentos

- A Carina, enquanto administradora, pode editar, mudar a Sociedade facturante e apagar movimentos sem indicar uma justificação; a auditoria técnica mantém actor e dados anteriores.
- O perfil Operador pode igualmente mudar a Sociedade e apagar movimentos, mas tem de indicar um motivo. Depois de preenchido, o motivo não bloqueia a operação.
- O selector passa a apresentar ao Operador todas as Sociedades activas do escritório sem lhe expor valores financeiros protegidos.
- Migrations isoladas aplicadas: `fix_role_based_work_entry_audit` e `require_operator_reason_for_all_work_edits`. Teste transaccional real confirmou os fluxos Operador/administrador e foi integralmente revertido.
- Gates: segurança, lint, TypeScript, 79/79 testes, build, dry-run Cloudflare e 30/30 E2E aplicáveis aprovados; 2 E2E exclusivos de produção omitidos.
- Publicado em 2026-08-20 a partir do commit `e6b8677`; Cloudflare Version ID `19b81fd5-25aa-4658-b974-4060c8f1f9f3`, URL `https://legal-carina.dabranches.workers.dev`.

## Correcção 0.4.7 — criação e ordenação de movimentos

- O formulário de criação apresenta `Valor/hora` e `Valor total`, calcula imediatamente nos dois sentidos com a duração e envia o valor/hora resultante para a RPC protegida.
- Novos movimentos passam a guardar o valor/hora e o total calculado; a vista por defeito usa data crescente para que o movimento mais recente apareça no fim.
- Refresh no browser e no PWA preserva o menu/submenu expresso no URL.
- Alterações financeiras sem motivo são permitidas a proprietários e administradores; o motivo continua obrigatório para o perfil Operador. A auditoria por campo mantém-se para todos.
- Migrations isoladas aplicadas ao projecto confirmado `vtvvqyebigflgqccbqsw`: `allow_hourly_rate_on_work_entry_creation` e `require_financial_override_reason_only_for_operators`. Não foi executado `db push` global.
- Gates: segurança, lint, TypeScript, 79/79 testes, build e dry-run Cloudflare aprovados. E2E focado aprovou refresh browser/PWA e formulário iPhone; mantém-se o encerramento tardio conhecido do runner.
- O browser integrado não abriu por falha interna de confiança do plugin; não foi substituído por outro browser porque o utilizador pediu explicitamente o integrado.
- Publicado em 2026-08-19 a partir do commit `f9bad23`; Cloudflare Version ID `5412939b-d0b7-4e2a-9617-8db71510a93c`, URL `https://legal-carina.dabranches.workers.dev`.
- Correcção de dados posterior autorizada explicitamente: 7 movimentos manuais criados antes da publicação tinham valor/hora mas total nulo. A migration `backfill_today_manual_work_entry_amounts` reconstruiu os totais por `duração × valor/hora ÷ 60`, sem descontos, criou 7 auditorias técnicas e reactivou o trigger financeiro na mesma transacção. Verificação final: 8/8 movimentos manuais do dia com total, zero pendentes, total agregado 930,00 €.

## Lote local 0.4.0 — preparação de Notas de Honorários

- Estado: implementado e validado localmente, sem publicação. Produção continua confirmada em `0.3.3`.
- Documentos de Cliente: carregamento múltiplo, validação por assinatura real, recusa de macros, mensagens por ficheiro, SHA-256 contra duplicados, validade e remoção lógica recuperável preparados localmente. Não promover a Edge Function nem `20260819020000_prevent_duplicate_client_documents.sql` antes de reconciliar o histórico remoto.
- Desempenho: `HonorariumNoteModal` passou a carregamento tardio; `MasterDataPage` caiu de aproximadamente 458 kB para 38 kB brutos no build. O utilizador vê `A preparar o documento…` durante o carregamento sob procura.
- Gates mais recentes: TypeScript, build, 13 ficheiros/69 testes aprovados e `git diff --check` sem erros. Browser integrado sem separador disponível nesta passagem; validação visual deste sublote continua pendente.
- A ficha de Cliente permite preparar uma Nota de Honorários a partir dos seus movimentos não facturados. A selecção múltipla existe apenas nesta tabela própria e a impressão/PDF inclui Cliente, `mm-aaaa`, descrição, duração e total de tempo.
- Cliente e Sociedade incluem os campos necessários para evoluir da actual folha de apoio para uma Nota de Honorários completa. A referência à Sociedade emissora é protegida por chave composta no Supabase para não atravessar escritórios.
- Migrations remotas isoladas: `add_honorarium_note_fields` e `secure_honorarium_default_society_scope`. Migration local de referência: `20260818201935_add_honorarium_note_fields.sql`. Nunca executar `db push` indiscriminadamente devido à divergência histórica.
- Removido o gráfico anual duplicado no fim dos dashboards de Responsáveis.
- Gates: segurança de ficheiros, oxlint, TypeScript, 58 testes e build aprovados; dry-run Cloudflare aprovado sobre 31 assets. A matriz E2E percorreu 24 testes locais e omitiu 2 de produção, conservando o hang conhecido após o último resultado.
- Supabase Advisors: nenhum erro crítico novo. Permanecem avisos de revisão sobre RPCs `SECURITY DEFINER`, protecção de passwords comprometidas, FKs sem índice, índices não usados e políticas permissivas múltiplas; avaliar individualmente, sem correcções automáticas.
- Permissões do Operador decididas e aplicadas: consulta, criação e actualização de todos os Clientes e respectivas vertentes do próprio escritório, independentemente da Sociedade. Não inclui eliminação nem Definições. A migration isolada `allow_operator_all_client_management` passou um teste RLS transaccional completo e não deixou dados sintéticos; o Operador activo ainda tem de concluir a mudança obrigatória do PIN no primeiro acesso.
- Nas listas de Clientes, `Emitir Nota de Honorários` abre o mesmo selector de movimentos não facturados da ficha. O botão permanece visível: azul quando há movimentos e neutro/desactivado quando não há. A migration isolada `add_uninvoiced_client_shortcuts` criou a RPC de indicador e a cache PostgREST foi recarregada.
- Não fazer push desta branch sem nova ordem: historicamente, o push pode activar publicação automática na Cloudflare.

## Hotfix 0.3.3 — gráficos da Visão Geral

- Corrigida a grelha de `Análise e tendências`: `Valor por ano` e `Valor por mês` ocupam agora 50% cada e preenchem 100% da largura disponível.
- Validado visualmente em claro e escuro; publicação urgente autorizada pelo utilizador.
- Publicado a partir do commit `e03f6e77411fc00a77b88dfb49c8bba27febe01d`; Cloudflare Version ID `c74b9fb3-5614-4cb8-bdfa-fa74e317295d`. Assets, service worker e fluxo `Actualizar aplicação` confirmados em `0.3.3`.

## Lote local 0.3.2 — correcções pós-publicação

- A versão `0.3.2` foi publicada em 2026-08-18 a partir do commit `25fc7cee980badadb9ece6a2930ae6c1238be345` da branch `codex/reconcile-full-import`.
- Produção confirmada visualmente em `https://legal-carina.dabranches.workers.dev/`, versão Cloudflare `c34073d9-d160-43c2-8ba1-d40f1e066621`, com `Versão 0.3.2` visível e aviso de actualização PWA apresentado.
- Registos optimizados no Supabase com controlo de âmbito explícito, índices de paginação/estado/factura e carregamento integral numa única chamada; medição autenticada da primeira página melhorou de cerca de 7 s para 1,7 s.
- Tabelas usam apenas o scroll vertical da página, oferecem 100 linhas e mantêm a vista `Todas` virtualizada sobre 7 198 movimentos; filtros e ordenações continuam a usar o universo integral em cache de memória, invalidado após qualquer escrita.
- A coluna técnica `Alteração manual` foi retirada. `N.º factura` passou a ser editável na linha através de endpoint protegido; o nome do Cliente já não repete código nem vertente.
- Os 24 clientes anteriormente mistos foram resolvidos na base: Juan Cartaya, Fred Schaner e Donovan ficaram Particulares; os restantes 21 ficaram Empresas; zero perfis mistos activos.
- `Criar movimento` deixa de aceitar silenciosamente uma RPC de opções vazia: recorre às tabelas protegidas por RLS e volta a apresentar clientes/vertentes, responsáveis, Sociedades e processos.
- Verificação autenticada local: 225 opções de cliente/vertente; formulário habilitado com dados sintéticos e fechado sem gravar.
- Atalhos internos dos cartões/listas usam navegação SPA comum: validado `Particulares > Por facturar`, preservando a sessão e conciliando o cartão de 559 com `1–559 de 559` na tabela após progresso explícito.
- Criação/edição de clientes deixa de tentar inserir uma vertente desactivada com código vazio; valida prefixos e códigos repetidos antes da gravação.
- Auditoria autenticada adicional: Sociedade 243/243, Responsável 39/39, Sem sociedade 127/127 e universo integral 7 198/7 198; filtros usam as 201 opções de cliente e o estado só fica activo quando a selecção diverge de todas.
- Edição directa da duração confirmada visualmente com Dias/Horas/Minutos dentro do viewport; balões mensal agregado/por Sociedade e anual empilhado confirmados com total e decomposição completa.
- Gates finais do lote: ficheiros sensíveis, lint, TypeScript, 52/52 testes, build, dry-run Cloudflare e E2E sintético com 24 aprovados/2 exclusivos de produção omitidos; matriz inclui 11 iPhones, 7 resoluções Windows, modo escuro, rotação e safe areas.
- Último fecho antes da publicação: 56/56 testes unitários e 22/22 cenários locais iPhone/Windows aprovados; testes E2E alinhados com o título movido para a barra superior. O runner mantém a anomalia de não terminar depois do último resultado, tendo sido interrompido apenas depois de todos os cenários passarem.
- Gráficos foram inspeccionados visualmente no modo escuro em Visão Geral, Clientes, Sociedades e Responsáveis; as séries usam tokens claros próprios do tema escuro. Definições ficaram exclusivas de proprietário/administrador, sem retirar ao Operador a criação operacional de clientes.

## Publicação 0.3.0 — preparada em 2026-08-18

- Branch: `codex/reconcile-full-import`; lote local validado antes do commit e deploy.
- Navegação reorganizada com dashboards de entrada de Clientes, Sociedades e Responsáveis; nas categorias de cliente, o dashboard abre no próprio item e apenas `Lista` surge como submenu.
- Tabelas compactas, filtros/ordenação sobre o universo integral, opção `Todas`, zebra, selecção de linha, Cliente sticky, impressão isolada e edição individual de movimentos.
- Dashboards apresentam estrutura imediatamente e valores em processamento; a RPC de Responsáveis foi optimizada isoladamente no remoto.
- Ficha de cliente responsiva, com vários correios electrónicos, vários telefones, identificadores e documentos. Criação exige vertente Particular/Empresa e sugere códigos contínuos `02.xxxx`/`01.xxxx`; clientes Mistos recebem as duas vertentes.
- Validação: segurança de ficheiros, lint, TypeScript, 52/52 testes, build e E2E (24 aprovados, 2 exclusivos de produção omitidos). Dry-run Wrangler 4.123.0 aprovado sobre 30 assets.
- Histórico Supabase continua divergente; não executar `db push`. As migrations `20260818132714`, `20260818132947` e `20260818133428` foram tratadas isoladamente e exigem reconciliação documental posterior.
- Commit funcional publicado: `72906a06ead13ae7896c3b7d5ad810fa6a698b45`, enviado para `origin/codex/reconcile-full-import`.
- Produção confirmada visualmente em `https://legal-carina.dabranches.workers.dev/`: `Versão 0.3.0`.
- Cloudflare Version ID: `6c8c8099-0169-4a92-a9c5-0777b91cc3fe`, 100% do tráfego, mensagem `Release 0.3.0: plataforma operacional`.
- `sw.js` público confirmado com cache `carina-legal-shell-0.3.0`; uma instalação PWA antiga mostrou `Actualização disponível`, actualizou e deixou de apresentar o aviso após activar a nova versão.

Data: 17/08/2026

> Estado actual para retoma noutro computador. As secções históricas abaixo deste bloco são apenas memória de lotes anteriores; em caso de conflito prevalece este bloco.

## Retoma actual — 0.2.8

### Hotfix 0.2.8

- O PWA Windows abre e reabre na Visão geral: `start_url` explícito, identidade estável e `launch_handler` que navega a janela existente.
- Os atalhos de acompanhamento passaram a navegar dentro da SPA, sem recarregar a aplicação nem reinicializar a sessão.
- Foram repostas no Supabase as permissões de `get_dashboard_overview`, `search_work_entries` e a função ausente `get_my_access_status`; refresh e atalho `Sem sociedade` foram confirmados numa sessão autenticada.
- Validação local: `pnpm check` verde, 51/51 testes. Dez cenários Windows/smoke percorreram a matriz, incluindo o novo arranque standalone; mantém-se a anomalia conhecida do runner Playwright não encerrar depois do último cenário.

- Branch reconciliada: `codex/reconcile-full-import`; inclui por merge o lote documental 0.2.6 que já estava em produção.
- Versão preparada para publicação: `0.2.7`.
- A nova linha de base do ficheiro `20260817 HORAS ESCRITÓRIO.xlsx` está no Supabase: 7 198 movimentos activos e validação idempotente de 7 198 inalterados.
- Visão geral e dashboards de clientes foram reorganizados com cartões de acompanhamento e atalhos explícitos para as tabelas subjacentes, incluindo `Sem sociedade`.
- Gráficos usam os 12 meses terminados no movimento mais recente, permitem comparação por sociedade e mostram no hover do período o total e a decomposição por sociedade.
- Registos de trabalho mostram linhas compactas, número/data de factura, ordenação em todas as colunas e carregam o universo integral autorizado para filtros, pesquisa, ordenação e opção `Todas` — não apenas a página inicial.
- RPC integral `export_visible_work_entries` foi estendida isoladamente com os mesmos filtros da tabela, incluindo cliente, tipo, sem preço e sem sociedade. Não foi executado `db push`.
- Validação: `pnpm check` aprovado com 51/51 testes; build e dry-run Cloudflare aprovados. Os 24 cenários Playwright foram iniciados e percorreram a matriz, mas o processo de teste não terminou após o último cenário e foi interrompido; investigar o encerramento do runner/servidor, não uma falha funcional reportada.

- Repositório: `https://github.com/dabranches-collab/legal-carina`
- Directório obrigatório: `C:\Projetos\legal-carina`, fora do OneDrive.
- Branch: `codex/client-identifiers-documents-0.2.6`
- Commit funcional: `1f05f59 feat: activar identificadores e documentos de clientes`
- Versão local e publicada/Cloudflare: `0.2.6`.
- A Cloudflare publicou automaticamente o push da branch, apesar de não existir PR nem merge em `main`. O endereço público foi verificado directamente e apresenta `Versão 0.2.6`.
- O código está na branch de desenvolvimento no GitHub, mas `main` ainda não contém este lote. Prioridade: não deixar produção à frente de `main`; abrir PR, obter CI verde e fundir antes de novos lotes.
- Supabase `vtvvqyebigflgqccbqsw`: identificadores, documentos, bucket privado e Edge Function `client-documents` já estão activos remotamente.

## O que ficou implementado

- Identificadores: consultar, criar, editar e eliminar CC/BI, passaporte, título de residência, registo comercial, fiscal ou outro.
- Documentos: carregar, consultar, arquivar, reactivar e eliminar.
- Bucket `client-documents` privado, limite 20 MB, PDF/JPG/PNG/DOCX/XLSX e ligações assinadas de 60 segundos.
- Upload e mutações passam pela Edge Function autenticada; a service role não entra no frontend.
- RLS activa e privilégios directos reduzidos ao mínimo.
- Migrations remotas isoladas: `20260817095147`, `20260817095157`, `20260817095206` e `20260817095316`. Não foi executado `db push`.
- Edge Function `client-documents` versão 1 activa com `verify_jwt=true`.

## Validação deste lote

- `pnpm security:files`, lint, typecheck e build aprovados.
- 49/49 testes aprovados.
- Browser integrado confirmado na versão local 0.2.6, mas a sessão autenticada expirou. Falta validar visualmente a ficha depois de iniciar sessão; não pedir, inventar ou expor PINs.
- Produção verificada em `https://legal-carina.dabranches.workers.dev/`: versão 0.2.6. O PWA apresentou a actualização correspondente.
- O erro transitório `permission denied for table clients` foi investigado: `authenticated` mantém os privilégios e políticas RLS da tabela, e a lista voltou a carregar na sessão local sem alteração correctiva à base.
- Servidor local: `pnpm dev --host 127.0.0.1 --port 5173`.

## Importação e base de dados

- A base não foi limpa nem reiniciada.
- O ficheiro documentado `20260407 HORAS ESCRITÓRIO.xlsx` é antigo e não deve ser assumido como o mais recente.
- Antes de limpar: localizar o ficheiro mais recente, confirmar data/tamanho/SHA-256/linhas, comparar alterações e duplicados, verificar backup/PITR e simular a importação.
- A limpeza é destrutiva e exige autorização específica depois dessa verificação.
- Depois da importação inicial validada, o fluxo normal deverá ser incremental por hash e detecção de duplicados.
- Nunca usar dados reais em testes ou preview.

## Próximo trabalho recomendado

1. Iniciar sessão localmente e testar identificadores e documentos com ficheiros sintéticos.
2. Validar desktop, tablet, iPhone/PWA, claro/escuro, contraste e safe areas.
3. Localizar e analisar o ficheiro mais recente e preparar backup, limpeza e importação.
4. Executar pgTAP das políticas de RLS, Storage e importação num ambiente autorizado.
5. Reconciliar as migrations locais antigas `20260816180000` a `20260816198000`; nunca executar `supabase db push` indiscriminadamente.
6. Rever os avisos antigos do Supabase e testar passkeys/Windows Hello/Face ID em equipamento real.
7. Abrir PR deste lote com prioridade, executar CI e fundir em `main`, porque a Cloudflare já publicou automaticamente a branch. Não iniciar nova publicação sem pedido explícito “publica”.

## Comandos para retomar

1. Confirmar o repositório e executar os comandos de diagnóstico exigidos em `AGENTS.md`.
2. Se estiver limpo: `git pull --ff-only`.
3. `git switch codex/client-identifiers-documents-0.2.6`.
4. Criar `.env.local` apenas com URL e chave publicável do Supabase; não transportar segredos nem `node_modules`.
5. `pnpm install --frozen-lockfile`.
6. `pnpm dev --host 127.0.0.1 --port 5173`.
7. Abrir `http://127.0.0.1:5173/` e confirmar a versão 0.2.6.

---

## Histórico anterior

## Estado confirmado

- Repositório oficial: `https://github.com/dabranches-collab/legal-carina`
- Branch: `main`
- Directório obrigatório em Windows: `C:\Projetos\legal-carina`
- Versão publicada: `0.2.4`
- Produção: `https://legal-carina.dabranches.workers.dev`
- Supabase: projecto `vtvvqyebigflgqccbqsw`
- Cloudflare: Worker `legal-carina`
- CI do commit funcional `3a665b7`: verde, incluindo lint, typecheck, testes, build, Playwright e auditoria de dependências.
- Produção confirmada: versão `0.2.4`, deployment `9b96ae8c-7216-4836-93c5-0ac184a0b20c`, version ID `9e949710-24bc-40bc-92bb-5a7ff58a6d23`.

## Lote 0.2.4 publicado automaticamente

- Branch: `codex/prepare-0.2.4-continuity-export`.
- Versão publicada: `0.2.4`.
- Exportação XLSX integral dos Registos de trabalho implementada e validada; é executada apenas após pedido do utilizador.
- Regras permanentes de continuidade e protocolo de computador novo acrescentados ao repositório.
- `pnpm check`: aprovado, 47/47 testes; E2E local: 23 aprovados e 1 teste de preview de produção omitido como previsto.
- GitHub: PR rascunho `#5`; `CI` e `Secret scan` do commit `67797f9` concluídos com sucesso.
- Advisors Supabase consultados apenas em leitura; os avisos de RLS sem políticas directas, funções `SECURITY DEFINER`, passwords comprometidas e desempenho estão registados em `PROJECT_STATE.md`.
- A Cloudflare publicou automaticamente os pushes da branch; manter `0.2.4` foi autorizado. Nenhuma Edge Function ou migration remota foi publicada neste lote.

## Lote local seguinte

- Produção confirmada entretanto em `0.2.4` por build automático da Cloudflare associado ao push da branch; manter esta versão foi autorizado.
- Versão local seguinte: `0.2.5`.
- Registos de trabalho: duplo clique numa linha abre a edição; para teclado, `Enter` na linha oferece o mesmo acesso.
- A abertura/edição de movimentos tem compatibilidade temporária com o esquema remoto actual: tenta primeiro as RPC protegidas e, quando estas ainda não existem (`PGRST202`), usa as tabelas com as políticas RLS existentes. Validado no browser integrado sem gravar dados.
- A ficha de movimento passou a apresentar todos os campos de negócio editáveis: identificação, cliente/vertente, processo, responsável, sociedade, actividade, observações, duração, preço/hora, valor, moeda, cobrança, descontos, estado, facturação, pagamento e arquivo. Origem e metadados técnicos continuam apenas para consulta.
- As migrações isoladas `20260817091517_add_full_work_entry_edit.sql` e `20260817091927_simplify_work_entry_deletion.sql` foram aplicadas ao Supabase remoto. A edição completa está activa. Qualquer utilizador com acesso de edição pode apagar qualquer movimento após confirmação; ligações a facturas, importações e descontos são retiradas sem apagar esses registos.
- Clientes: duplo clique abre a ficha em modo de consulta; a própria ficha permite entrar em edição e guardar nome, estado, vertentes, denominação legal, NIF, contactos, morada e notas.
- A ficha mantém os documentos disponíveis para consulta e só mostra o carregamento em modo de edição.
- Foi preparada localmente a migração `20260817081315_add_client_identifiers.sql` para vários identificadores por cliente (CC/BI, passaporte, título de residência, registo comercial, fiscal ou outro). Não foi aplicada ao Supabase remoto devido à divergência conhecida no histórico de migrações.
- Este lote `0.2.5` não deve ser enviado ao GitHub enquanto o deployment automático não estiver controlado.

## Correcção 0.2.6 em preparação

- Branch local: `codex/reconcile-full-import`.
- A importação compara todas as linhas efectivas com o último lote concluído e classifica-as como novas, inalteradas, alteradas ou em conflito.
- Movimentos existentes mantêm o mesmo `id`; linhas alteradas actualizam o movimento e ficam auditadas. Linhas ausentes são apenas sinalizadas e nunca eliminadas automaticamente.
- Alterações manuais protegidas bloqueiam a importação para revisão.
- As funções `analyze_import_candidates`, `commit_validated_import` e o comparador privado foram aplicados isoladamente ao Supabase remoto em 2026-08-17, sem `db push` das restantes migrations e sem publicação Cloudflare. Após um timeout com o ficheiro real, `analyze_import_candidates` foi substituída pela versão em bloco de `20260817162500_optimize_import_candidate_analysis.sql`; o catálogo remoto confirma essa definição. O histórico remoto ainda não contém os carimbos locais `20260816181000`, `20260817143340` e `20260817162500`.
- O ficheiro `20260817 HORAS ESCRITÓRIO.xlsx` foi reconciliado como nova linha de base: hash `f829e86f...ae44`, 7 204 linhas analisadas, 7 198 movimentos activos e 6 linhas inválidas mantidas apenas para revisão. A comparação canónica posterior devolve 7 198 inalteradas e 0 alteradas. As migrations locais `20260817152746`, `20260817153057`, `20260817153246`, `20260817154129` e `20260817154256` documentam as correções aplicadas isoladamente ao remoto e também não constam do histórico remoto.

## Correcções incluídas em 0.2.3

- Registos de trabalho deixam de executar a exportação completa no carregamento; usam a pesquisa paginada e mostram até 100 movimentos na vista inicial.
- RPC de exportação restaurado e permissões autenticadas dos RPCs de movimentos e dashboards reafirmadas.
- Dashboards de Sociedades usam os 12 meses terminados no último registo da Sociedade.
- Janelas verificadas: Carina Santos 04/25–03/26; Legal Team 05/25–04/26; Massive Search 04/25–03/26.
- Gráficos mensais cabem sem scroll horizontal em desktop; ecrãs pequenos mantêm scroll seguro.
- Em desenvolvimento, service workers antigos são removidos para a versão local corresponder ao `package.json`.

## Supabase

Foram aplicadas directamente e estão versionadas as migrações:

- `20260816231514_repair_work_export_and_entity_months.sql`
- `20260816232758_refresh_dashboard_rpc_permissions.sql`

Nota: a base remota contém migrações locais anteriores ainda não registadas no histórico remoto. Não executar `supabase db push` indiscriminadamente. Comparar primeiro `supabase migration list --linked` e aplicar apenas migrações revistas.

## Arranque noutro computador

1. Instalar Git, Node.js compatível e pnpm indicado em `package.json`.
2. Criar `C:\Projetos` fora do OneDrive.
3. Clonar o repositório para `C:\Projetos\legal-carina`.
4. Copiar apenas as variáveis autorizadas para `.env.local`; nunca copiar `node_modules`, credenciais para Git ou ficheiros reais de clientes.
5. Executar `pnpm install --frozen-lockfile` e `pnpm dev --host 127.0.0.1 --port 5173`.
6. Abrir `http://127.0.0.1:5173/`.
7. Antes de alterar: `git status --short`, `git pull --ff-only`, criar branch `codex/<funcionalidade>` quando aplicável.

## Próximo trabalho recomendado

- Implementar exportação XLSX integral sob pedido sem bloquear a abertura dos Registos de trabalho.
- Continuar validação visual das tabelas e dashboards nas matrizes Windows/iPhone.
- Manter o incremento SemVer visível na versão local antes de cada lote e publicar apenas quando solicitado.

## Validação local 0.4.0 — 2026-08-19

- A versão `0.4.0` foi publicada a partir do commit funcional `ec0541a` da branch `codex/reconcile-full-import`; URL `https://legal-carina.dabranches.workers.dev`, Version ID Cloudflare `7a560053-0951-421f-989d-519d3ef9d2c4`.
- Os Registos paginam identificadores antes de hidratar as linhas, reduzindo o trabalho da consulta. O pré-filtro histórico deixou de incluir avisos genéricos de importação e considera apenas facturados sem data ou excepções históricas reais. As migrations correspondentes permanecem apenas locais.
- Formulários de criar/editar movimento usam rodapé móvel fixo e scroll interno; a matriz visual confirmou os botões dentro do ecrã em iPhone.
- A grelha final da Visão Geral passou a admitir encolhimento dos filhos. Corrigido overflow horizontal de 172 px num iPhone 430×932; após a correcção `scrollWidth <= innerWidth` em claro e escuro.
- Browser integrado validado em 1920×1080 a 100%, equivalentes a 125% e 150%, tablet 1024×768, iPhone 375×667 e 430×932. Sticky, scroll horizontal e contraste ficaram estáveis.
- Validação automática final: segurança de ficheiros, lint, TypeScript, 75/75 testes unitários, build, dry-run Cloudflare e E2E completo com 29 aprovados e 2 cenários exclusivos de preview/produção omitidos. O subconjunto responsivo aprovou 19/19.
- `supabase db lint --linked --schema public` devolveu `No schema errors found`. A listagem ligada confirma as cinco migrations remotas documentais recentes alinhadas; a divergência histórica local/remoto mantém o bloqueio a `supabase db push` global.
- Sessão autenticada de PAULA CHAVES (`Operador`) revalidada: Administração/Definições/Importações/Auditoria não são navegáveis pelo perfil; criação e edição individual de movimentos funcionam e produzem confirmação de auditoria.
- Sociedades e Responsáveis foram percorridos no browser integrado com totais e séries diferentes. Os atalhos Por facturar/Facturados não pagos/Sem preço coincidem com as contagens das respectivas tabelas. O dashboard de CARINA mantém latência repetível próxima de 6 segundos; não introduzir cache potencialmente obsoleta sem obter primeiro um plano SQL autenticado.
- O selector de Nota de Honorários do cliente `TESTE PARTICULAR` foi confirmado em iPhone 390×844 e modo escuro: largura contida, rodapé visível, três idiomas, selecção por Sociedade, escolha/ordenação de colunas, totais e despesas. O movimento QA temporário foi eliminado com motivo de auditoria; o universo regressou a 7 220.
- Registos frios medidos em cerca de 1,29 s para obter o universo de 7 221 movimentos. A selecção `Todas` conserva 1–7 221 no rodapé e virtualiza a tabela em janelas de 40 linhas; foi acrescentado teste automático com 7 200 resultados.
- A preparação documental pagina movimentos para além das primeiras 10 000 linhas por Cliente e verifica a completude antes de permitir o PDF; o teste simula duas páginas e confirma os três movimentos.
- O painel documental deixou de criar HTML inválido com um `<form>` dentro do formulário da ficha. O upload tem botão explícito e o browser integrado confirmou o editor estável, sem submissão automática, após 3,2 segundos.
- O Chrome isolado revelou que o clique em `Editar` ainda podia submeter a ficha porque o mesmo nó era reconciliado como botão de guardar durante a activação. Foi acrescentado `preventDefault()` à transição e `type="submit"` explícito ao botão final; revalidação visual em 1920×1200, claro/escuro, manteve o editor e o selector de ficheiros abertos após 4 segundos.
- O cliente sintético confirmou separação funcional: Nota de Honorários = 1 movimento não facturado/15 min; Cobrança = 1 movimento facturado não pago/1 h. O Chrome aceitou o PDF sintético depois de activar `Allow access to file URLs`.
- No projecto correcto `vtvvqyebigflgqccbqsw`, todas as migrations aditivas 0.4.0 foram aplicadas isoladamente e a Edge Function `client-documents` versão 2 está activa com `verify_jwt=true`. O projecto está saudável e não foi usado `db push` global.
- Página, manifesto e service worker publicados respondem por HTTPS 200. O manifesto arranca em `/?view=overview`, o cache é `carina-legal-shell-0.4.0` e os 2 testes específicos de produção/preview passaram.

## Correcção 0.3.2 em preparação — dimensões dos dashboards

- Corrigida a inversão conceptual: Sociedade seleccionada é analisada por Responsável; Responsável seleccionado é analisado por Sociedade. Visão geral continua por Sociedade e Clientes não recebe uma dimensão artificial.
- `20260818190000_correct_entity_dashboard_breakdowns.sql` foi aplicado isoladamente ao Supabase remoto depois de rever a lista de migrations. A divergência histórica permanece; não usar `supabase db push`.
- Atalhos e tabelas já não recuperam filtros, pesquisa, ordenação ou página antigos. Preferências puramente visuais de colunas continuam persistentes por utilizador.
- Contagem e paginação foram corrigidas para o universo remoto. Verificação autenticada: Sem sociedade mostra 127/127, depois 1–100 e 101–127.
- Alertas com zero ocorrências são ocultados. A abertura de dashboards por nome evita a consulta integral preliminar e faz apenas uma resolução leve do identificador.
- Verificação visual autenticada: MASSIVE SEARCH apresenta CARINA/PAULA e botões Por responsável; PAULA apresenta as três Sociedades e botões Por sociedade; Visão geral mantém Por sociedade; Particulares não mostra comparação indevida.
- Validação: `pnpm lint`, `pnpm typecheck`, 55/55 testes e `pnpm build` aprovados. Não publicado por instrução expressa do utilizador.
- Após detectar que a navegação entre submenus conservava o `selectedId` anterior, `App.tsx` passou a identificar cada dashboard pela Sociedade/Responsável seleccionado. Teste visual por cliques sucessivos confirmou totais distintos: CARINA SANTOS 149 227,50 €, LEGAL TEAM 417 509,50 € e MASSIVE SEARCH 127 337,50 €; widgets e séries mudam em conjunto.
# Publicação 0.2.9

- Branch de origem: `codex/reconcile-full-import`.
- Perfil Operador acrescentado ao frontend, função administrativa e modelo de autorização por Sociedade.
- Dashboards: mini-barras anuais verticais por Sociedade, linha Total anual, detalhe mensal por Sociedade e widgets agrupados com subtotais.
- Ajustes finais confirmados visualmente: alertas de Acompanhamento vermelhos; Evolução anual larga à esquerda e os dois gráficos curtos empilhados à direita; células não monetárias centradas e monetárias à direita.
- O scroll horizontal dos Registos de trabalho fixa apenas Cliente; Data e selecção deixam de ficar presas à margem.
- A coluna Cliente fixa tem fundo opaco, validado visualmente depois de deslocar a tabela até às últimas colunas.
- Print/PDF oculta o resto da página e ajusta apenas a tabela a uma página de largura em landscape.
- As caixas e acções de edição em massa foram removidas; a edição dos movimentos é exclusivamente individual.
- Os Registos de trabalho apresentam pré-filtros vermelhos de pendências por cima dos filtros normais; o teste autenticado de “Sem sociedade” devolveu as 127 linhas do universo completo.
- A sessão local mostra `Versão 0.2.9`; o Vite observa agora o `package.json` e reinicia quando a versão é alterada.
- Validação anterior à publicação: segurança de ficheiros, lint, TypeScript, 51 testes unitários, build e E2E (24 aprovados, 2 opcionais omitidos).
- Aplicar remotamente apenas `20260818105352_add_operator_role.sql` e `20260818111659_add_dashboard_metric_breakdowns.sql`; publicar a Edge Function `admin-users` e o Worker. Não usar `supabase db push`.
- Versão `0.2.9` publicada em 2026-08-18 a partir do commit funcional `4d6729bc455aabdb7da745613b784679da01dbe7`.
- Cloudflare Worker confirmado em `https://legal-carina.dabranches.workers.dev`, Version ID `e6931985-c3b5-4c6b-86bf-a5daf4507fc4`, resposta HTTPS `200 OK`.

## Correcção 0.4.1 em preparação — dashboards de Clientes

- `get_client_category_dashboard` devolve agora os 12 meses contínuos terminados no último movimento acessível para Particulares e Empresas. A migration isolada `make_client_dashboards_rolling_12_months` está aplicada no Supabase correcto.
- Prova visual autenticada como Operador: ambos os dashboards mostram 09/25–08/26, em claro e escuro, sem meses futuros vazios e sem erros de consola.
- `align_client_dashboard_attention_counts` alinha os contadores de pendências com os respectivos atalhos, sem contar incobráveis como pendências normais. Prova autenticada: Particulares 484 não facturados e 294 facturados não pagos; Empresas 281 e 193, sempre com correspondência exacta entre caixa e tabela.
- Gates aprovados: segurança, lint, TypeScript, 75/75 testes, build e 29 E2E aprovados/2 omitidos. Código local em `0.4.1`; produção Cloudflare ainda em `0.4.0` até ordem explícita.

## Lote 0.4.2 — incobráveis nos dashboards

- Clientes, Sociedades e Responsáveis apresentam Incobráveis como alerta autónomo com atalho filtrado.
- A métrica `Por receber` dos Clientes exclui agora `uncollectible_invoiced`, sem retirar esse movimento do total histórico facturado.
- Prova autenticada contador/tabela: Particulares 2/2, Empresas 4/4, CARINA SANTOS 3/3 e CARINA 4/4; claro e escuro revistos visualmente.
- Publicado em 2026-08-19: commit funcional `537bc4a`, URL `https://legal-carina.dabranches.workers.dev`, Cloudflare Version ID `57434d1c-d171-46c6-8183-8127d95e4a95`. HTTPS, manifesto, versão visível e cache PWA `carina-legal-shell-0.4.2` confirmados depois do deploy.
- Hotfix Supabase de segurança após o deploy: `secure_and_optimize_entity_dashboard` elimina a reutilização de métricas e movimentos recentes não mascarados da função antiga. A prova como Operador manteve horas/clientes, mas reduziu os valores ao âmbito financeiro autorizado. CARINA passou de 6,4 s para 8,1 s; optimizar a lista interna de opções sem remover o mascaramento é o próximo trabalho prioritário.

## Lote 0.4.3 — optimização segura dos dashboards

- Projecto Supabase confirmado por `.env.local`, documentação e histórico remoto: `vtvvqyebigflgqccbqsw`. A migration isolada `optimize_secure_entity_dashboard` está aplicada; nunca usar o identificador antigo referido num relato intermédio.
- A função segura deixou de repetir milhares de verificações de perfil/âmbito para perfis globais. O caminho restritivo permanece para utilizadores limitados e os valores do Operador continuam filtrados pelas permissões financeiras por Sociedade.
- CARINA: três carregamentos completos em 1,295 s, 1,277 s e 1,274 s, mantendo exactamente 660 818,25 € trabalhados, 602 835,00 € facturados e 553 103,75 € recebidos.
- Validação visual autenticada em claro/escuro: Sociedade e Responsável sem erros, com gráficos e alertas; sessão local recuperada após reconstrução de dependências e versão 0.4.3 visível.
- Gates aprovados: ficheiros sensíveis, lint, TypeScript, 75/75 testes, build e 31 cenários E2E apresentados como concluídos. O runner E2E conserva o bloqueio conhecido no encerramento após o último resultado.
- Advisors Supabase: 0 `ERROR` de segurança e 0 `ERROR` de desempenho. Permanecem avisos existentes de RPCs `SECURITY DEFINER` intencionais, protecção Auth de passwords vazadas e três grupos de políticas permissivas duplicadas.
- Publicado a partir do commit funcional `cd06d3d`: `https://legal-carina.dabranches.workers.dev`, Cloudflare Version ID `b95932a2-0a46-466b-9cd8-2de5936e28ea`.
- Pós-publicação confirmado: página pública sem ecrã branco e com versão 0.4.3; manifesto HTTPS 200 com arranque na Visão Geral; service worker/cache `carina-legal-shell-0.4.3`.

## Lote 0.4.4 — estabilidade do arranque PWA

- Eliminada a recarga automática provocada pela primeira activação do service worker, possível origem de flashes/ecrãs brancos e contextos destruídos.
- O botão «Actualizar aplicação» continua a activar a versão em espera e só então recarrega a página.
- Testado em claro/escuro e na matriz automatizada de Windows/iPhone; 75/75 unitários, 29 E2E de interface e 2/2 E2E PWA aprovados; dry-run Cloudflare aprovado.
- Publicação confirmada em `https://legal-carina.dabranches.workers.dev`, Cloudflare Version ID `7c577650-c8eb-44c3-ac1f-c5b843a0bd84`; Chrome actualizado para 0.4.4 sem ecrã branco nem ciclo de reload.

## Lote 0.4.5 — consistência entre Nota de Honorários e Cobrança

- O gerador documental foi revisto na produção 0.4.4: Nota e Cobrança abrem a partir da lista de cliente, filtram respectivamente não facturados e facturados não pagos, separam por Sociedade e alternam correctamente entre PT/EN/FR.
- Corrigida localmente a ausência, na Cobrança, do aviso sobre dados legais/bancários incompletos da Sociedade emissora. Foi acrescentado teste de regressão específico.
- Gates aprovados antes da publicação: ficheiros sensíveis, lint, TypeScript, 76/76 unitários, build, 29 E2E de interface/2 omitidos e dry-run Cloudflare.
- Publicação final feita a partir do commit `e359402`: `https://legal-carina.dabranches.workers.dev`, Cloudflare Version ID `49fdc0e8-6d2b-430b-9360-528998edf161`.
- A expectativa da cache PWA passou a usar dinamicamente a versão de `package.json`; 2/2 testes de preview de produção confirmaram o manifesto, o service worker e `carina-legal-shell-0.4.5`.
- Pós-publicação autenticado: versão 0.4.5 sem ecrã branco; Nota e Cobrança devolvem os universos esperados e ambas avisam quando a Sociedade emissora tem dados legais/bancários incompletos.

## Lote 0.4.6 — ensaio do Operador em curso

- Testes de Nota/Cobrança cobrem agora despesas, IVA, totais e a ausência intencional de despesas nas Cobranças.
- Novo E2E distingue correctamente PWA (arranque na Visão Geral) de browser normal (refresh preserva o submenu profundo).
- Produção 0.4.5: Registos completos em cerca de 3,2 s; pesquisa global em cerca de 1,2 s; `Todas` usa virtualização e não coloca 7 220 linhas simultaneamente no DOM.
- `client-documents` está activa e protegida por JWT no projecto `vtvvqyebigflgqccbqsw`. Matriz RLS documentada com o papel Operador.
- A ficha completa do movimento inclui agora os dois estados Incobrável e sincroniza-os com Facturado/Pago. A sessão real de PAULA CHAVES (`Operador`) confirmou 7 220/7 220 movimentos, edição completa em claro/escuro, menus administrativos ausentes e Nota de Honorários/Cobrança com universos correctos no cliente sintético.
- Gates locais aprovados: ficheiros sensíveis, lint, TypeScript, 78/78 testes unitários, build, dry-run Cloudflare e 30 E2E aprovados; 2 cenários exclusivos de preview/produção omitidos como previsto.
- Código funcional publicado a partir do commit `d0f0f77`: versão 0.4.6 em `https://legal-carina.dabranches.workers.dev`, Cloudflare Version ID `e02609ff-527d-4e84-97d7-7de3df1b612e`. Confirmação visual pública: login íntegro, versão correcta e nenhum erro de consola.

## Lote 0.6.1 local — avenças e fichas compactas

- Movimentos cobertos por avença foram excluídos de «Sem preço», por facturar, não pagos e estados históricos, tanto nos contadores como nos detalhes. COCKTAIL TEAM confirma 0 sem preço e 91 cobertos.
- Fichas de dados base abrem em consulta compacta; «Editar» expande os campos, «Guardar alterações» só activa com mudanças e «Cancelar alterações» repõe os dados sem gravar.
- Facturação da avença controla período, número/data de factura, vencimento e data de liquidação. O dashboard identifica as 172 h como histórico global de COCKTAIL TEAM e INFANTÁRIO DO POVO.
- EBO: condição activa inicia em 2021-01-01. A auditoria recuperou 4 movimentos de 2026 com preço explícito de 120 €/h e 150 € no total; foram preservados como trabalho à peça. Permanecem 48 movimentos de avença (36 h), sem estados financeiros inválidos.
- Supabase remoto recebeu `exclude_retainers_from_financial_attention` e `add_retainer_charge_due_date`. Frontend continua apenas local; produção permanece 0.6.0.
- Gates locais aprovados: ficheiros sensíveis, lint, TypeScript, 114/114 testes e build.
- A tabela de avenças distingue horas utilizadas no período actual, horas contratadas e horas utilizadas no histórico total. O valor/hora efectivo passou a usar valor contratual acumulado / horas utilizadas, em vez de facturas já registadas.
- Valores reconciliados: COCKTAIL TEAM 221,40 €/h; EBO 528,89 €/h; INFANTÁRIO DO POVO 182,33 €/h. O bloco «Facturação da avença — estado e datas» fica visível na ficha; nenhuma mensalidade retroactiva foi criada por suposição.
- A ficha do cliente foi dividida em páginas visíveis: Geral, Contactos, Facturação, Avença, Credenciais e Documentos. Geral reúne nome, denominação, NIF, tipo e códigos; em consulta oculta vertentes não atribuídas e o campo redundante «Entidade activa».
- A criação de movimentos apresenta estados cumulativos Facturável → Facturado → Pago e a alternativa exclusiva Avença. Avença só activa com contrato vigente, elimina preço/valor individual e contabiliza a duração nos mapas e no consumo do período. A função nova `create_work_entry_with_treatment` foi aplicada sem substituir o circuito anterior.
- Validação actualizada: 115/115 testes unitários; 26/26 E2E focados nas fichas e criação móvel, incluindo ausência de overflow horizontal em seis larguras iPhone e acções acessíveis por scroll vertical.
- Notas de trabalho acrescentadas imediatamente depois de Registos: texto, imagens, áudio/gravação de voz, listas com conclusão e urgência visual. Cada utilizador vê as suas notas e as que lhe forem partilhadas; o Dono vê todas. A partilha distingue Consulta e Edição por utilizador e é protegida por RLS no Supabase.
- As notas usam cartões de altura variável numa grelha tipo mosaico; no iPhone passam para uma coluna sem overflow horizontal. Os 2 E2E específicos de notas passaram. O gate global aprovou segurança, lint, TypeScript, 115/115 unitários e build; numa execução limpa do E2E passaram 59 cenários, 2 foram omitidos por condição e o caso iPhone 13 mini sofreu uma anomalia de arranque do Chromium depois de os outros dez modelos passarem.
- Versão 0.6.1 publicada em 2026-08-30 a partir do commit funcional `9880081`, branch `codex/reconcile-full-import`, em `https://legal-carina.dabranches.workers.dev`. Cloudflare Version ID `e243f1e8-7017-4e7d-8772-e728b306a928`; HTTPS 200, bundle `index-CzuQpdVx.js` e cache `carina-legal-shell-0.6.1` confirmados após o deploy.

## Versão 0.6.2 — notas e protótipo isolado

- Notas têm cartões de altura variável, texto, listas, imagem/áudio, urgência e partilha por Consulta/Edição. O título repetido foi removido e «+ Nova nota» passou a acção principal visível em desktop e iPhone.
- `qa-demo` está isolado do Supabase real em todos os menus. A marca `TESTE` fica exclusivamente nos quatro títulos das notas demonstrativas; as avenças mantêm os nomes reais sem sufixos artificiais.
- Gates: segurança, lint, TypeScript, 115/115 unitários e build aprovados. E2E completo: 61 aprovados, 2 omitidos e uma sobreposição detectada no iPhone 13 mini; após a correcção, toda a matriz iPhone passou 15/15.
- Publicada em 2026-08-30 a partir do commit funcional `daa6cdd2f67dde5974e71260e70e9ba9cb0d5a16`, branch `codex/reconcile-full-import`, em `https://legal-carina.dabranches.workers.dev`. Cloudflare Version ID `3f2dc508-7df5-4d60-b9aa-50b571a9a767`; HTTPS 200, bundle `index-D-GNWpSl.js` e cache PWA `carina-legal-shell-0.6.2` confirmados directamente.
- Verificação visual pós-publicação no browser integrado confirmou «Versão 0.6.2», o menu Notas depois de Registos e a acção destacada «+ Nova nota» correctamente renderizados.

## Versão 0.6.3 — exemplos de notas em produção

- Os quatro exemplos solicitados foram criados na base real como notas de CARINA SANTOS e partilhados com `dabranches`: Lembrete e Documento para Consulta; Preparar reunião e Mensagem de voz para Edição.
- A lista contém três itens; as notas Documento e Mensagem incluem, respectivamente, um recurso demonstrativo de imagem e áudio servido pelo frontend. A inserção é idempotente e a auditoria confirmou 4 notas, 3 itens, 2 recursos e 4 partilhas, sem alterar avenças.
- Segurança de ficheiros, lint, TypeScript, 115/115 testes unitários e build aprovados para a versão 0.6.3.
- Publicada em 2026-08-30 a partir do commit funcional `4a94ff6`, Cloudflare Version ID `91d12e25-f890-43e9-a8ca-179f78994685`. Produção confirmou HTTP 200, bundle `index-Dp9eifQ2.js`, cache `carina-legal-shell-0.6.3`, imagem com 1 338 479 bytes, áudio com 44 bytes e versão 0.6.3 visível no browser integrado.

## Versão 0.6.4 — edição do nome do Proprietário

- Corrigido localmente o bloqueio que devolvia 403 ao Administrador ao corrigir o nome visível do Proprietário. O login do Proprietário continua protegido e só pode ser alterado pelo próprio.
- A ficha desactiva explicitamente o campo de login neste caso e explica a restrição. Erros não-2xx das Edge Functions passam a apresentar a mensagem funcional devolvida pelo backend em vez de «Edge Function returned a non-2xx status code».
- Segurança, lint, TypeScript, 115/115 testes unitários e build aprovados. Frontend e `admin-users` ainda não publicados; produção permanece 0.6.3 até nova ordem explícita `publica`.
- Diagnóstico adicional: a Administração mostrava `DIOGO ABRANCHES` a partir dos metadados da sessão, mas o selector de partilhas lia `dabranches` de `user_login_credentials`. O registo interno foi sincronizado com o perfil real e a verificação visual em produção confirmou «DIOGO ABRANCHES» nas partilhas, sem a etiqueta antiga.
- Publicada em 2026-08-30 a partir do commit funcional `6fea593`: frontend Cloudflare Version ID `9988876c-ef87-4ae5-9a69-ac2f6609aa71`, bundle `index-CchSpcbr.js`, cache `carina-legal-shell-0.6.4`; Edge Function `admin-users` v9 activa com JWT obrigatório.
- Teste funcional pós-publicação na sessão Administrador abriu `DIOGO ABRANCHES`, manteve o login `dabranches` desactivado e guardou o nome sem erro; a confirmação «Acesso de DIOGO ABRANCHES actualizado.» apareceu e o diálogo fechou.
