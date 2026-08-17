# Legal Carina — handover

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
