# Estratégia de duplicados

## Reconciliação integral

Todas as linhas efectivas da folha seleccionada são comparadas com a linhagem do último lote concluído. A linha de origem identifica o movimento preservado e a comparação cobre data, cliente, código, vertente, actividade, responsável, duração, preço, valor, Sociedade, facturação, pagamento, arquivo e observações.

Cada linha recebe uma decisão explícita antes da gravação:

- `new`: não possui movimento anterior e será criada;
- `unchanged`: corresponde integralmente ao movimento anterior e mantém o mesmo identificador;
- `update`: possui diferenças e actualizará o movimento existente, com auditoria;
- `conflict`: contém alterações manuais protegidas e bloqueia o lote para revisão.

Movimentos do lote anterior que não aparecem no novo ficheiro são apenas contabilizados como ausentes. Nunca são apagados automaticamente.

## Confirmação e importação

1. Associar cada execução ao SHA-256 do ficheiro e a um identificador de lote.
2. Rejeitar o reprocessamento do mesmo hash; uma nova tentativa exige um ficheiro/lote deliberadamente distinto.
3. Preservar o identificador do movimento quando a linha já existe.
4. Comparar todos os campos de negócio com o movimento da mesma linha de origem no último lote concluído.
5. Actualizar apenas campos alterados; o trigger de auditoria conserva o estado anterior e o novo.
6. Bloquear conflitos manuais antes da gravação e apresentar linhas ausentes sem as eliminar.

Nunca deduplicar apenas por valor financeiro ou nome do cliente. `commit_validated_import` serializa importações por escritório e grava lote, linhas, entidades, criações e actualizações numa única transacção PostgreSQL; qualquer erro faz rollback integral.
