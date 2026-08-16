# Estratégia de duplicados

## Detecção na análise

O fingerprint inicial combina data, cliente, actividade, duração e responsável, normalizados em maiúsculas e sem espaços marginais. Correspondências são avisos, não eliminações automáticas.

## Confirmação e importação

1. Associar cada execução ao SHA-256 do ficheiro e a um identificador de lote.
2. Rejeitar o reprocessamento do mesmo hash; uma nova tentativa exige um ficheiro/lote deliberadamente distinto.
3. Calcular uma chave idempotente por movimento com os campos canónicos e a linha de origem.
4. Comparar com movimentos já existentes dentro do mesmo escritório/tenant.
5. Apresentar os conflitos antes da gravação. No fluxo actual, a confirmação importa a linha como novo movimento e mantém o aviso; nunca substitui ou elimina um movimento anterior.

Nunca deduplicar apenas por valor financeiro ou nome do cliente. `commit_validated_import` grava lote, linhas, entidades e movimentos numa única transacção PostgreSQL; qualquer erro faz rollback integral.
