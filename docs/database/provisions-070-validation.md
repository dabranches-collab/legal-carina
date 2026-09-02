# Provisões 0.7.0 — ensaio de publicação

Em 02-09-2026, publicação autorizada pelo utilizador. Commit funcional aprovado pelo CI e secret scan: `acc7b2ac671e433add7f24e8d1a2cb392f91cff3`, PR #13, branch `codex/client-credit`. CI #47: segurança de ficheiros, lint, tipos, testes, build, E2E e auditoria de dependências aprovados. jsPDF 4.2.1 sem vulnerabilidades conhecidas na auditoria executada.

## Ensaio remoto

Branch temporária `provisions-070-validation`, projecto `bwgpjlmewtdwmpmaixhz`, criada sem dados após autorização do custo horário 0,01344 indicado pelo Supabase (moeda não indicada). Nunca promover esta branch: inclui apenas reparações de pré-requisitos para reconstruir o esquema de ensaio.

O histórico de produção não é auto-suficiente. Para executar as migrations registadas foi necessário restaurar, apenas em staging, os pré-requisitos de username/PIN, visible_financial_value, quatro RPCs antigas e tabelas de avenças. Usou-se SQL existente no repositório ou definições consultadas directamente em produção. A função has_firm_role e a restrição de funções dos membros foram alinhadas com produção. Nenhuma regra de autorização foi substituída por um simulador. A branch terminou em FUNCTIONS_DEPLOYED.

Migration candidata `20260902180905_add_client_credit_ledger.sql` aplicada integralmente em staging como `20260902192029_add_client_credit_ledger`. `supabase migration list --linked` executado antes das operações; sem db push global, reset ou migration repair.

`scripts/test-provisions-staging.sql`: 20/20 pgTAP aprovados com identidades sintéticas, papéis reais authenticated/anon, funções reais de âmbito e acesso financeiro e triggers activos. Cobertura: preço por hora, saldo inicial, repetição idempotente, IVA, dupla emissão, proibição de alteração directa do livro, protecção de registos mesmo com escrita privilegiada, estorno, saldo parcial, histórico e recusas a operador sem acesso financeiro, utilizador externo e anónimo. Rollback confirmado: zero contas, movimentos e utilizadores sintéticos restantes.

Advisors de segurança: zero ERROR/críticos, dois INFO e 28 WARN; avisos de funções SECURITY DEFINER revistos, com autenticação/âmbito e permissão financeira nas novas mutações. Novas tabelas têm RLS, SELECT condicionado e nenhuma permissão de escrita directa. O ensaio PGlite complementar passou 24 verificações.

## Recuperação

Backup de produção confirmado por consulta Supabase: físico `1552463078`, COMPLETED, 02-09-2026 05:45:01.512 UTC. WALG activo e backups diários; PITR não activo no plano actual.

A migration é aditiva. Em falha do frontend, repor a versão Cloudflare anterior `ac433c71-5464-4bb1-8894-ec490d41c740` (0.6.5), conservando o livro de provisões. Depois de existirem movimentos, não remover tabelas/notas nem repor um backup por rotina: corrigir por migration aditiva/estorno auditável. Não publicar reparações de reconstrução de staging em produção.

Produção recebe exclusivamente a migration candidata após os gates; o carimbo remoto deve ser registado na entrega. A branch temporária deve ser eliminada no fim conforme autorizado.
