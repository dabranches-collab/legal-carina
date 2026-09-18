# Reconciliação dos trabalhos a preço fixo

Estado: preparação local 0.12.0. Esta funcionalidade não pode ser publicada antes de os pontos abaixo passarem num ambiente de base de dados de teste com dados sintéticos.

## Regra contabilística

- Um trabalho tem um preço acordado que entra uma única vez nos totais do cliente e da sociedade. Os registos associados continuam a contribuir com tempo, sem montante facturável individual.
- Valor médio/hora do trabalho = preço acordado ÷ soma das horas dos registos associados. Sem horas, o valor médio/hora fica indefinido.
- Por responsável, repartir o preço pelos minutos de cada registo. A soma das parcelas em cêntimos tem de igualar exactamente o preço do trabalho. Antes de existir tempo registado, o preço ainda não é atribuível a responsáveis.
- A facturação e o pagamento pertencem ao trabalho e podem anteceder ou seguir a execução. A classificação por receber/por facturar depende dos estados do trabalho, sem inferir pagamento a partir da emissão de uma nota.
- A provisão é uma entrada de dinheiro separada do preço acordado. Ao registá-la, mesmo que os trabalhos já existam, perguntar ao operador se quer aplicá-la a algum trabalho deste cliente e sociedade. Permitir escolher zero, um ou vários trabalhos e indicar o montante para cada um; nunca repartir automaticamente.
- A soma aplicada não pode exceder a provisão disponível nem o saldo por liquidar de cada trabalho. O valor médio/hora usa sempre o preço acordado bruto; o valor por receber usa o remanescente depois dos abates confirmados. A parcela não aplicada mantém-se disponível na conta de provisões.
- A afectação e a entrada da provisão precisam de ser gravadas numa única transacção, com histórico e estorno. A emissão posterior de nota/factura tem de reconhecer o abate já efectuado e impedir consumo duplo da mesma provisão. Sem esta integração, nenhuma escolha visual deve marcar o trabalho como pago nem reduzir o saldo.
- A fase operacional começa «Por iniciar» e muda automaticamente para «Em curso» ao associar o primeiro registo; «Terminado» é assinalado pelo operador. Retirar o último registo não desfaz o início. A fase é independente de facturação e pagamento. Pode haver trabalho terminado por facturar ou trabalho em curso já pago.
- Decisão confirmada pelo utilizador em 18-09-2026: o preço acordado é honorário **antes de IVA**. A factura acrescenta o IVA da sociedade; as provisões são dinheiro recebido e o abatimento é ao total com IVA da factura. Os painéis de honorários e o valor médio/hora usam a base antes de IVA; o saldo da provisão e o valor efectivamente a pagar usam montantes com IVA. Não subtrair euros de provisão directamente de um total de honorários sem converter a parcela correspondente.
- A taxa de IVA fica fixada no trabalho quando se atribui a sociedade, a partir da taxa predefinida nessa data. Uma alteração posterior da taxa predefinida não recalcula trabalhos já criados. Não se pode marcar um trabalho como facturado sem sociedade.
- «Por facturar» representa o valor contratual que ainda requer documento. «Por receber» representa o remanescente após pagamentos aplicados. Se houver uma provisão aplicada antes da factura, estes números deixam de ser somáveis entre si sem ajuste; o ecrã deve mostrar claramente a provisão já recebida.

- Ao associar um registo que tinha preço, esse preço deixa de entrar nos totais avulsos. Ao desassociar, o registo volta à facturação normal e tem de ser recalculado ou revisto antes de entrar nos totais.
- `fixedFeeAnalytics.ts` calcula a repartição em cêntimos por responsável e conserva o preço no cliente/sociedade quando ainda não há horas. Alimenta localmente os dashboards, incluindo a parcela de provisão aplicada; falta reconciliar as consultas e permissões numa base de teste com o esquema actual.

### Pergunta ao registar uma provisão

Apresentar a pergunta depois de o operador indicar cliente, sociedade e montante, quando existirem trabalhos a preço fixo elegíveis. O texto proposto é:

> **Quer usar esta provisão para abater trabalhos a preço fixo deste cliente?**
>
> A provisão recebida é de **[montante]**. Pode escolher um ou vários trabalhos da mesma sociedade e indicar quanto pretende atribuir a cada um. O valor atribuído reduz o montante ainda por receber desse trabalho. **Não altera o preço acordado nem o valor médio por hora.** O que não atribuir fica disponível na conta de provisões para utilizar mais tarde.

Acções: **Escolher trabalhos e montantes** e **Não aplicar agora**. Na primeira opção, mostrar uma linha por trabalho com nome, preço acordado, provisão já aplicada, ainda por receber e campo «Abater agora». Antes de confirmar, mostrar «Total a atribuir», «Fica disponível na provisão» e «Fica por receber nos trabalhos». Se não houver trabalhos elegíveis, registar a provisão sem esta pergunta. A decisão negativa não é definitiva: deve existir uma acção posterior «Aplicar provisão a trabalhos» na ficha do cliente.

## Superfícies a reconciliar

| Superfície | Valores de trabalhos a preço fixo | Estado no código local |
| --- | --- | --- |
| Ficha do cliente: trabalho, horas, valor médio/hora e registos | Preço único e divisão pelas horas | Pré-visualização local; SQL por activar |
| Registos: tratamento, preço/hora e montante | Tratamento «Preço fixo»; montante individual vazio | Preparado |
| Por receber e Visão Geral | Somar o preço uma vez, segundo factura/pagamento | Preparado; falta reconciliação em BD |
| Dashboards do cliente e por categoria | Total, facturado, pago, pendente, preço médio e séries temporais | Integração local por parcelas preparada; falta validação SQL e visual com dados sintéticos |
| Dashboards da sociedade e lista de sociedades | Mesmos valores, atribuídos à sociedade do trabalho | Integração local dos resumos e gráficos preparada; falta reconciliação na base |
| Dashboards do responsável | Parcela proporcional às horas e preço médio ponderado | Integração local dos resumos e gráficos preparada; falta reconciliação na base |
| Repartição LEGALTEAM | Base do preço fixo por responsável/angariador conforme horas e regras comerciais | Integração local preparada: distribui o preço por registo, conserva horas e usa os angariadores existentes. Falta reconciliação em BD de ensaio. |
| Pré-filtros e listas de registos | Contar os registos para horas, sem duplicar preço | A verificar com a migration activa |
| Notas de honorários e facturas | Emitir o preço do trabalho uma vez, podendo anteceder a execução | Pendente: os fluxos actuais seleccionam registos avulsos |
| Provisões e créditos de cliente | Perguntar na entrada da provisão, escolher os trabalhos existentes e o montante para cada um; conciliar abates, notas e estornos | Fluxo e SQL preparados localmente, com afectação imediata ou posterior; pgTAP ainda não executado. `loadCreditUsage` continua a seleccionar os registos avulsos para notas, enquanto os trabalhos a preço fixo entram como movimentos separados do mesmo livro. |
| Documentos e exportações | Não lançar o preço por cada registo; apresentar o trabalho como item próprio | Pendente |

## Casos de teste mínimos

1. Trabalho de 1 200 € sem horas, facturado e pago antes da execução: cliente/sociedade mostram 1 200 € uma vez; responsável sem imputação; por receber zero.
2. Registos de 30 e 90 minutos de dois responsáveis: 300 € e 900 € analíticos; valor médio 600 €/h; cliente/sociedade continuam 1 200 €.
3. Associar um registo avulso de 150 €: o valor avulso desaparece dos totais; o preço do trabalho não aumenta.
4. Acrescentar/remover tempo: actualizar parcelas por responsável e valor médio/hora, sem alterar o preço acordado.
5. Facturar sem pagar, pagar depois e cancelar: verificar todos os totais, pré-filtros e documentos em cada estado.
6. Testar cliente sem sociedade, vários clientes/sociedades, registos sem preço, permissões financeiras parciais e arredondamentos em cêntimos.
7. Testar a emissão de nota/factura antes da execução, o pagamento por provisão e a repartição LEGALTEAM, sem duplicação em nenhum relatório.
8. Receber provisão depois de criar dois trabalhos: perguntar se há afectação; escolher só um ou repartir manualmente pelos dois; verificar saldo disponível e remanescente de cada trabalho.
9. Escolher «não aplicar agora»: manter a provisão disponível e os dois trabalhos por liquidar; permitir afectação posterior explícita, sem abate implícito.
10. Estornar uma provisão afectada: impedir saldo negativo ou exigir o estorno das aplicações; não alterar o preço acordado nem o valor médio/hora.

Cada conta deve ser comparada com uma consulta de reconciliação à base de dados antes do deploy. Nenhuma migration de preço fixo foi aplicada à produção nesta fase.
