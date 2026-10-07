# Avença + horas — 0.15.0 em preparação

Modalidade optativa nas condições da avença: horas incluídas por período, período de controlo independente da facturação e preço/hora do excedente. Para um pacote de 32 horas anuais, guardar `included_hours=32`, `hours_interval_months=12`, `billing_mode=retainer_plus_hours` e o preço acordado em `excess_hourly_rate`. A modalidade simples continua a ser o valor por defeito.

O período renova na data de aniversário do início das condições, sem transportar saldo. Os movimentos contam por data, criação e ID; cancelados não consomem o pacote. Uma hora de trabalho com 15 minutos disponíveis mantém 60 minutos de duração, consome 15 e cobra 45. A 150 €/hora, o valor é 112,50 €.

Os movimentos abrangidos guardam `retainer_id`, minutos incluídos e minutos excedentes. Sem excedente mantêm `billing_scope=retainer`, sem valor individual. Com excedente entram na facturação habitual com `billing_scope=standard` e apenas o valor dos minutos excedentes. Os mapas de avença contam a duração completa de ambos. O editor identifica a modalidade e deixa o preço sob cálculo do servidor.

Alterar a duração ou cancelar um movimento redistribui o consumo dos movimentos ainda por facturar. Facturas, recebimentos e notas já emitidas conservam os valores emitidos; corrigir esses documentos continua a exigir o respectivo fluxo de revisão/estorno existente. Não se refaz silenciosamente um documento para acompanhar alterações posteriores das horas.

A gravação completa e a mudança entre facturação normal e avença são uma só transacção. Não dependem de novos registos em `manual_overrides` nem de um motivo escrito. Mantêm autenticação, autorização de edição/valores financeiros, auditoria automática geral e guardas de documentos/recebimentos. A comparação de overrides legados também normaliza valores SQL NULL para JSON null.

O consumo é calculado por funções privadas, com `search_path` vazio e sem EXECUTE público. O vínculo valida cliente, firma e sociedade; os campos de consumo não aceitam edição directa. Um bloqueio concorrente faz rollback com `40001`; a criação/edição repete apenas erros que confirmam rollback, nunca uma falha de rede com resultado desconhecido.

## Validação local

- 303 testes unitários e 34 contratos SQL; segurança de ficheiros, lint e tipos.
- 15 cenários PostgreSQL com esquema da aplicação, utilizadores e dados exclusivamente sintéticos: fronteira anual, parcial do movimento, renovação, correcção sem override, rollback da associação, cancelamento, campos protegidos e duas ligações concorrentes.
- 16 cenários de pagamentos/RLS e quatro de concorrência entre gravação financeira e recebimento.
- Oito E2E específicos: avença em 1440/768/390, claro/escuro; Administrador/Operador sem motivo. Suite E2E completa em validação na entrega.
- Build de produção e dry-run aprovados. Auditoria de dependências sem vulnerabilidades high/critical; correcção pré-existente de sharp/Miniflare reaproveitada do commit `4531456`.

O PostgreSQL QA usa Auth e políticas da aplicação, com tabelas Storage mínimas e reconciliação das permissões de work_entries apenas no QA. Não valida o serviço HTTP Auth/Storage nem Safari/iPhone físico. O ensaio de interface usa intercepções sintéticas. O bootstrap local precisou de normalização de aliases reservados e policies históricas duplicadas; não há reescrita das migrations históricas para produção.

## Publicação pendente

Aplicar isoladamente, depois de ordem «publica», `20261007163156_simplify_work_entry_corrections.sql` e `20261007163200_add_retainer_extra_hours.sql`; publicar o frontend 0.15.0 e activar a modalidade apenas no contrato expressamente autorizado. Não fazer db push global. A instalação não converte todos os contratos existentes.

A migration `20261006154806_fix_work_payment_lock_order.sql` pertence ao patch de pagamentos anteriormente instalado (registo remoto `20261006161821`); foi recuperada da branch local anterior para manter a fonte coerente com produção. Não a aplicar novamente.

Até à publicação, produção continua 0.14.0, Worker legal-carina, Version ID `7f91ce33-407c-4a0c-93fd-8dc594fb96a1`, deployment `d0d2b9e4-4770-48b1-ad83-45fb19e4098a`. As correcções operacionais expressamente pedidas foram executadas separadamente; não equivalem à instalação desta funcionalidade. Nenhum ficheiro de cliente foi usado nos testes ou guardado no repositório.
