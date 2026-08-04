# Motor de preços e regras comerciais

## Princípio de preservação

O motor nunca recalcula um movimento apenas porque uma regra foi criada ou alterada. Um import mantém `imported_duration_minutes`, `imported_hourly_rate` e `imported_amount`; a proposta atual fica em campos `calculated_*`; o valor em uso fica em `effective_*`; um valor imposto por uma pessoa fica também em `manual_amount` e cria `manual_overrides`.

O recálculo é uma ação explícita em duas etapas: primeiro `previewRecalculation` apresenta quantidade, totais e diferença; depois de confirmação, o RPC `private.recalculate_work_entries` bloqueia e atualiza apenas as linhas elegíveis. Por omissão, exclui overrides, movimentos faturados e movimentos cancelados.

## Cálculo

Para cobrança horária:

```text
valor = preço_hora_efetivo × duração_minutos / 60
```

O resultado monetário é arredondado a duas casas decimais. Preço zero é válido; ausência de preço é `null` e impede o recálculo dessa linha. `fixed`, `retainer`, `hour_package`, `per_act` e `manual_negotiated` usam o montante fixo configurado. `free` e `non_billable` produzem zero. Avenças e pacotes estão modelados, mas o consumo de períodos/saldos fica fora deste MVP.

## Precedência

É selecionada a regra ativa e válida na data do serviço com maior especificidade:

1. preço do próprio movimento (`specific_hourly_rate`);
2. processo + profissional;
3. cliente + profissional;
4. cliente;
5. sociedade faturante;
6. profissional;
7. tipo de serviço;
8. padrão.

`priority`, data de criação e UUID apenas desempatem regras do mesmo nível. Uma regra nunca substitui automaticamente um override.

## Descontos

`discounts` suporta percentual ou montante fixo, com âmbito movimento, cliente ou período. Movimento vence cliente, que vence período; prioridade desempata no mesmo âmbito. O desconto fixo é limitado ao valor base para nunca gerar montante negativo. Cada regra guarda motivo, autor da autorização, vigência e criação.

## Override manual

O modal apresenta valor original, valor calculado e exige novo valor, motivo e confirmação. A aplicação deve chamar exclusivamente `private.apply_work_entry_override`, que numa única transação:

- verifica autenticação e papel owner/admin/billing;
- bloqueia o movimento;
- cria `manual_overrides`;
- aplica o valor;
- atualiza `has_manual_override`;
- alimenta `audit_log` através dos triggers existentes.

Pode alterar duração, preço/hora, desconto efetivo, valor, sociedade faturante e estados de faturação/pagamento. Marcar como faturado exige `invoice_date`; marcar como pago exige que já esteja faturado.

## Faturação histórica

`√` em FACTURADO/PAGO é importado para `is_invoiced`/`is_paid`; DATA FACT para `invoice_date`; SOCIEDADE FACTURA para `billing_entity_id`. Estes dados representam estados históricos, não números nem entidades de fatura. O agrupamento posterior em `invoices` é uma operação distinta.
