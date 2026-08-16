# Mapeamento de colunas

| Excel | Campo canónico | Tipo normalizado | Observação |
| --- | --- | --- | --- |
| DATA | `date` | data ISO | obrigatório |
| PART / SOC | `partyType` | enum | PARTICULAR/EMPRESA; o valor histórico SOCIEDADE normaliza para EMPRESA |
| CLIENTE | `clientName` | texto | obrigatório |
| CÓDIGO CLIENTE | `clientCode` | texto | validar com CLIENTES |
| ACTIVIDADE | `activity` | texto | obrigatório |
| RESPONSÁVEL | `responsible` | referência | independente do autor administrativo do movimento |
| DURAÇÃO | `durationMinutes` | inteiro | fração de dia × 1.440 |
| VALOR HORA | `hourlyRate` | decimal | moeda a definir |
| VALOR | `amount` | decimal | comparar com preço × minutos / 60 |
| SOCIEDADE FACTURA | `billingEntity` | texto/referência | lista histórica |
| STATUS | `status` | texto/enum | preservar texto histórico e normalizar apenas estados reconhecidos |
| FACTURADO | `invoiced` | booleano | `√` significa Sim |
| DATA FACT | `invoiceDate` | data ISO | opcional |
| ARQUIVADO | `archive` | texto/enum | GAVETA/DOSSIER/FINDOS |
| PAGO | `paid` | booleano | `√` significa Sim |
| OBSERVAÇÕES | `notes` | texto confidencial | preservar original |
| ANO | `year` | inteiro derivado | conferir com DATA |
| TEMPO TABELA | `tableDuration` | legado | não persistir como duração principal |

Cada célula relevante preserva `raw`, `text` e, quando existe, `formula`. O mapeamento automático pode ser revisto na interface antes da validação.
A folha CLIENTES é analisada separadamente para extrair nome, código e categoria dedutível. Estas entradas acompanham o lote de confirmação, mas nunca são tratadas como movimentos; perfis sem categoria inequívoca permanecem por confirmar e não recebem uma classificação inventada.
