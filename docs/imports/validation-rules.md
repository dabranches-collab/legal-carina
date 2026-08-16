# Regras de validação

## Linha efectiva

Uma linha só entra na análise quando tem simultaneamente data, cliente e actividade. Fórmulas vazias isoladas são ignoradas.

## Preservação de valores

A análise mantém três valores distintos: `importedAmount` corresponde exclusivamente à célula VALOR original, `calculatedAmount` resulta de preço × minutos / 60 e `effectiveAmount` prefere o valor importado quando este existe. Uma célula vazia nunca é apresentada nem gravada como valor original importado.

## Erros

- Data ausente ou inválida.
- Cliente ausente.
- Código do cliente ausente.
- Actividade ausente.
- Responsável ausente.
- Duração que não produz um inteiro positivo em minutos.

## Avisos

- Valor hora ausente, negativo ou inválido.
- Valor calculado difere mais de 0,02 de `valor hora × minutos / 60`.
- Valor presente sem fórmula na célula original (possível introdução manual).
- Código não encontrado na referência `CLIENTES`.

Datas Excel são convertidas para ISO e verificadas contra o calendário. A duração usa `Math.round(fração × 1.440)`; em CSV também é aceite `HH:MM`. O valor textual permanece disponível para auditoria. A validação no browser não substitui a comparação e validação transaccional no servidor.

Linhas inválidas são preservadas em `import_rows` com os respectivos erros, mas não originam movimentos. Linhas com avisos, incluindo valores manuais e possíveis duplicados, só entram depois da confirmação explícita do administrador.
