# Mapeamento de colunas

| Excel | Campo canónico | Tipo normalizado | Observação |
| --- | --- | --- | --- |
| DATA | `date` | data ISO | obrigatório |
| PART / SOC | `partyType` | enum futuro | PARTICULAR/SOCIEDADE |
| CLIENTE | `clientName` | texto | obrigatório |
| CÓDIGO CLIENTE | `clientCode` | texto | validar com CLIENTES |
| ACTIVIDADE | `activity` | texto | obrigatório |
| RESPONSÁVEL | `owner` | referência futura | não inferir identidade |
| DURAÇÃO | `durationMinutes` | inteiro | fração de dia × 1.440 |
| VALOR HORA | `hourlyRate` | decimal | moeda a definir |
| VALOR | `amount` | decimal | comparar com preço × minutos / 60 |
| SOCIEDADE FACTURA | `billingEntity` | texto/referência | lista histórica |
| STATUS | `status` | texto | normalização futura |
| FACTURADO | `invoiced` | booleano | `√` significa Sim |
| DATA FACT | `invoiceDate` | data ISO | opcional |
| ARQUIVADO | `archive` | texto/enum | GAVETA/DOSSIER/FINDOS |
| PAGO | `paid` | booleano | `√` significa Sim |
| OBSERVAÇÕES | `notes` | texto confidencial | preservar original |
| ANO | `year` | inteiro derivado | conferir com DATA |
| TEMPO TABELA | `tableDuration` | legado | não persistir como duração principal |

Cada célula relevante preserva `raw`, `text` e, quando existe, `formula`. O mapeamento automático pode ser revisto na interface antes da validação.
