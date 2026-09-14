# Auditoria de continuidade — 2026-09-14

Esta linha de base foi recolhida apenas por leitura. Não contém nomes, emails, identificadores de utilizador, PINs, tokens, segredos nem conteúdo de clientes.

## Resultado

- Versão funcional mais recente encontrada no GitHub e em produção: `0.10.11`; não foi encontrada versão posterior em nenhuma branch remota.
- Branch funcional: `codex/legalteam-distribution`; HEAD documental `793644c9ca666fe5d1b118468f20296ae438b267`.
- `main` permanece numa linha antiga (`0.2.5`) e não é ainda a fonte funcional de produção.
- Produção Cloudflare: `legal-carina`, deployment `00fe667a-e300-4365-bff4-97c16e87f37f`, version `63ce5b87-ea8b-4ddf-a0b6-78e7276bc387`.
- Supabase central: projecto `vtvvqyebigflgqccbqsw` (`CARINA LEGAL`), `ACTIVE_HEALTHY`, PostgreSQL 17.6, região `eu-west-2`.
- Integrações activas: Supabase, Cloudflare Workers/Static Assets e Azure Translator. GitHub executa CI, auditoria de dependências e pesquisa de segredos; a publicação Cloudflare é manual.

## Linha de base de acessos

| Verificação agregada | Resultado |
| --- | ---: |
| Utilizadores Auth | 5 |
| Utilizadores confirmados | 5 |
| Utilizadores actualmente banidos | 0 |
| Pertenças à firma | 5 |
| Perfis | 1 proprietário, 2 administradores, 2 operadores |
| Atribuições de acesso | 6 |
| Permissões financeiras por sociedade | 6 |
| Pertenças sem utilizador Auth | 0 |
| Utilizadores Auth sem pertença | 0 |
| Credenciais de login sem Auth | 0 |
| Profissionais ligados a Auth inexistente | 0 |

As 46 tabelas públicas têm RLS activa e existem 96 políticas. Estes números são uma sentinela, não uma autorização para corrigir automaticamente diferenças: qualquer alteração exige identificar primeiro a conta e a regra de negócio afectadas sem as expor no GitHub.

## Dados e ficheiros

- 201 clientes, 7 271 movimentos de trabalho e 13 998 linhas de importação constavam da leitura agregada.
- Buckets privados: `billing-entity-logos` (2 objectos), `client-documents` (4 objectos), `legal-imports` (0) e `workspace-notes` (0).
- A base tinha 67 migrations registadas, da `20260805113851_create_legal_carina_data_model` à `20260904101950_add_revisable_honorarium_documents`.
- Seis Edge Functions activas: `admin-users` v9, `security-event` v2, `pin-auth` v3, `change-pin` v2, `client-documents` v2 e `expense-documents` v1.

## Bloqueios de segurança

1. Não alterar utilizadores, perfis, pertenças, atribuições, permissões financeiras, RLS ou funções `SECURITY DEFINER` antes de confirmar um ponto de recuperação actual.
2. Não executar `supabase db push`, `migration repair`, reset, limpeza de dados ou reimportação integral. Os carimbos locais e remotos divergem em vários lotes apesar de os nomes/efeitos estarem aplicados.
3. Não fundir uma dependência antiga ou branch Dependabot directamente na linha funcional. As falhas observadas no PR #16 pertencem a uma base antiga e não demonstram falha da produção 0.10.11.
4. Não publicar Cloudflare sem a palavra explícita `publica` e sem CI/secret scan verdes no commit exacto.
5. Não considerar um backup de PostgreSQL suficiente para documentos: é necessária uma cópia online, cifrada e independente dos objectos privados de Storage.

## Pendências confirmadas

- Confirmar no painel/API de gestão do Supabase o plano, o último backup disponível e se PITR está activo. Esta auditoria não conseguiu obter essa prova de forma independente.
- Criar e testar uma cópia externa cifrada dos quatro buckets privados, com retenção e ensaio de recuperação; não guardar a cópia num checkout nem numa pasta local sincronizada.
- Reconciliar `main` através de PR a partir da linha 0.10.11, preservando todo o histórico e exigindo revisão/CI. Não fazer force-push.
- Rever individualmente os avisos Supabase: 74 chaves estrangeiras sem índice, 2 políticas com `auth` recalculado por linha, 6 grupos de políticas permissivas múltiplas, 22 índices ainda não usados e protecção de passwords comprometidas desactivada. Nenhuma correcção automática foi aplicada.

## Repetição

Executar `scripts/audit-continuity.sql` em modo de leitura e comparar os agregados. Uma diferença pode ser legítima (por exemplo, novo utilizador), mas deve ser explicada e registada antes de qualquer publicação ou migration.

## Referências operacionais

- [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups): backups diários por plano, PITR e exclusão dos objectos do Storage dos backups da base.
- [Cloudflare — GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/): tokens de deploy devem ficar em secrets do CI e limitados à conta/recurso necessário. Este projecto mantém o deploy fora da CI até existir autorização explícita e protecção por ambiente.
