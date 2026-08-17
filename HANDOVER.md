# Legal Carina — handover

Data: 17/08/2026

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
- As funções `analyze_import_candidates`, `commit_validated_import` e o comparador privado foram aplicados isoladamente ao Supabase remoto em 2026-08-17, sem `db push` das restantes migrations e sem publicação Cloudflare. O histórico remoto ainda não contém os carimbos locais `20260816181000` e `20260817143340`.

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
