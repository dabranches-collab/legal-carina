# Dicionário de dados PostgreSQL

Todas as tabelas de negócio incluem `firm_id`; tabelas mutáveis incluem timestamps quando aplicável. Campos `created_by`, `imported_by` e atores referenciam `auth.users`.

| Tabela | Finalidade | Campos e regras principais |
| --- | --- | --- |
| `law_firms` | Escritório/tenant | nome, ativo, timestamps |
| `firm_members` | Associação utilizador-escritório | papel: owner/admin/billing/professional/viewer; associação única |
| `billing_entities` | Sociedade faturante | nome único por escritório; dados legais e contacto |
| `clients` | Cliente | código único; tipo individual/company; identidade e contacto |
| `client_contacts` | Contactos do cliente | nome obrigatório; email, telefone, papel e notas |
| `professionals` | Profissional histórico/ativo | utilizador Auth opcional; tarifa padrão `numeric(12,2)` |
| `service_types` | Classificação futura de serviço | nome único, descrição, ativo |
| `matters` | Processo/dossier/assunto | cliente obrigatório; profissional/sociedade opcionais; lifecycle e arquivo |
| `work_entries` | Movimento de trabalho | data, cliente, profissional, minutos, preços/montantes, estados e origem |
| `rate_rules` | Resolução de preços | escopos opcionais; tarifa horária ou fixa; vigência e prioridade |
| `manual_overrides` | Justificação de exceções | valores anterior/calculado/override em JSONB; autor e eventual reversão |
| `invoices` | Controlo interno de faturas | número por sociedade; totais `numeric(14,2)` e estado |
| `invoice_lines` | Linhas de fatura | quantidade, preço, desconto e total exato; movimento opcional |
| `payments` | Recebimentos | data, valor positivo, moeda, método e referência |
| `imports` | Lote de importação | nome/hash/tamanho, contagens, estado e timestamps |
| `import_rows` | Linha auditável do ficheiro | bruto/normalizado/erros/avisos JSONB, hash, estado e movimento |
| `audit_log` | Histórico imutável da aplicação | ator, ação, entidade, antes/depois JSONB e timestamp |

## Mapeamentos históricos

- `PARTICULAR` → `clients.client_type = individual`.
- `SOCIEDADE` → `clients.client_type = company`.
- `GAVETA` → `drawer`; `DOSSIER` → `dossier`; `FINDOS` → `closed_files`.
- `√` em FACTURADO/PAGO → booleano verdadeiro.
- Duração Excel × 1.440 → `duration_minutes`.
- CARINA SANTOS, LEGAL TEAM e MASSIVE SEARCH são candidatos a `billing_entities`, não seeds automáticos.
- CARINA, PAULA e HUGO são candidatos a `professionals`, não identidades Auth automáticas.

## Montantes de trabalho

- `imported_hourly_rate`: preço preservado da origem.
- `calculated_hourly_rate`: resultado do motor de regras.
- `effective_hourly_rate`: preço efetivamente usado.
- `calculated_amount`: montante calculado sem override.
- `effective_amount`: montante final, protegido por override auditável.

Valores vazios permanecem `null`; zero significa um valor conhecido igual a zero.
