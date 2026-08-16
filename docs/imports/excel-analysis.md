# Análise do ficheiro Excel

## Fonte

Ficheiro analisado localmente e sem alterações: `20260407 HORAS ESCRITÓRIO.xlsx`.

- Tamanho: 1.974.664 bytes.
- SHA-256: `2d72dda625ee4a1302298483b0df21e32d50e7597cad77f6027f7dd75dc6548d`.
- Folhas: `DADOS`, `TAB_GRAPHS`, `GRAPHS`, `CONTAS`, `CLIENTES`, `LIST`.
- Intervalo usado em `DADOS`: `A1:R7943`.
- Linhas efectivas (data + cliente + actividade): 6.794.
- Linhas não efectivas abaixo do cabeçalho: 1.148, das quais muitas mantêm fórmulas sem movimento real.

As colunas `CÓDIGO CLIENTE`, `VALOR`, `ANO` e `TEMPO TABELA` apresentam fórmulas até ao fim do intervalo usado. Por isso, a existência de fórmula ou valor calculado não basta para classificar uma linha como movimento.

A fórmula de código usa `VLOOKUP` sobre `CLIENTES!$B$3:$C$401`, confirmando nome na coluna B e código na coluna C. Como a folha não tem cabeçalho explícito reconhecível, o analisador usa essa referência como fallback, sem expor nomes no relatório técnico.

## Uso das folhas

- `DADOS`: fonte de movimentos.
- `CLIENTES`: referência de nome/código e possível categoria.
- `LIST`: vocabulários históricos.
- `TAB_GRAPHS`, `GRAPHS`, `CONTAS`: contexto de relatórios; nunca movimentos.

O parser lê fórmulas como texto e valores como dados. Não executa VBA, macros, ligações externas ou conteúdo ativo.

## Processo implementado

O ficheiro é lido no browser e não é enviado para serviços externos. A aplicação calcula SHA-256, permite escolher folha/mapeamento e faz a validação local. Antes da confirmação, envia apenas candidatos normalizados e respectivos metadados ao Supabase para comparar clientes e duplicados. A confirmação chama uma única operação transaccional. A conservação do ficheiro original é opcional e, se activada posteriormente, só poderá usar Storage privado.
