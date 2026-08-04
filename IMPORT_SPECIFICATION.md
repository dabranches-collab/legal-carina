# Especificação de importação

## Estado

O ficheiro-base foi analisado localmente e o importador de análise está implementado no browser. A gravação no Supabase permanece deliberadamente desativada até existirem schema, RLS, bucket privado e operação transacional aprovados.

## Regras mínimas

1. Ficheiros reais permanecem fora do Git e numa área local protegida.
2. Validar cabeçalhos, tipos, encoding, datas, moedas e duplicados antes de persistir.
3. Produzir relatório de erros sem reproduzir dados pessoais desnecessários.
4. Usar identificadores de lote e operações idempotentes.
5. Encriptar trânsito/armazenamento e apagar temporários segundo a política de retenção.

Mapeamentos por origem deverão ser documentados em `docs/imports/` usando exemplos sintéticos claramente marcados.

Consulte `docs/imports/excel-analysis.md`, `column-mapping.md`, `validation-rules.md` e `duplicate-strategy.md`.
