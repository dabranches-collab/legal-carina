# Estratégia de duplicados

## Deteção na análise

O fingerprint inicial combina data, cliente, atividade, duração e responsável, normalizados em maiúsculas e sem espaços marginais. Correspondências são avisos, não eliminações automáticas.

## Importação futura

1. Associar cada execução ao SHA-256 do ficheiro e a um identificador de lote.
2. Rejeitar reprocessamento acidental do mesmo hash, salvo confirmação administrativa.
3. Calcular uma chave idempotente por movimento com os campos canónicos e a linha de origem.
4. Comparar com movimentos já existentes dentro do mesmo escritório/tenant.
5. Apresentar conflitos e permitir ignorar, substituir ou importar como novo apenas com justificação auditável.

Nunca deduplicar apenas por valor financeiro ou nome do cliente. A operação final deverá ser transacional e manter relatório de linhas aceites/rejeitadas.
