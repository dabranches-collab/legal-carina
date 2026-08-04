# Regras de validação

## Linha efetiva

Uma linha só entra na análise quando tem simultaneamente data, cliente e atividade. Fórmulas vazias isoladas são ignoradas.

## Erros

- Data ausente ou inválida.
- Cliente ausente.
- Atividade ausente.
- Duração que não produz um inteiro positivo em minutos.

## Avisos

- Valor hora ausente, negativo ou inválido.
- Valor calculado difere mais de 0,02 de `valor hora × minutos / 60`.
- Valor presente sem fórmula na célula original (possível introdução manual).
- Código não encontrado na referência `CLIENTES`.

Datas Excel são convertidas para ISO; a duração usa `Math.round(fração × 1.440)`. O valor textual permanece disponível para auditoria. A validação no browser não substitui validação transacional no servidor.
