# Especificação de importação

## Estado

Nenhum formato real foi recebido ou analisado. Não há importador implementado.

## Regras mínimas

1. Ficheiros reais permanecem fora do Git e numa área local protegida.
2. Validar cabeçalhos, tipos, encoding, datas, moedas e duplicados antes de persistir.
3. Produzir relatório de erros sem reproduzir dados pessoais desnecessários.
4. Usar identificadores de lote e operações idempotentes.
5. Encriptar trânsito/armazenamento e apagar temporários segundo a política de retenção.

Mapeamentos por origem deverão ser documentados em `docs/imports/` usando exemplos sintéticos claramente marcados.
