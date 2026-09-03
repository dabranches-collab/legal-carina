# Distribuição LEGALTEAM e histórico de provisões — 0.8.0

Versão preparada para revisão local. Produção e dados reais permanecem em 0.7.1.

## Distribuição

O período usa a data dos trabalhos, incluindo o primeiro e último dia. A opção «Só pagos» considera o estado actual de pagamento, não a data de recebimento. Calcula-se sobre honorários efectivos em EUR, depois dos descontos e sem IVA ou despesas. As percentagens são 10% angariação do cliente, 10% angariação da tarefa, 50% executor e 30% escritório. Os cêntimos são repartidos sem diferença entre total e soma das parcelas. O mapa é informativo e não lança pagamentos ou dividendos contabilísticos.

As horas pertencem ao executor. As avenças e trabalho não facturável contribuem horas, sem honorários individuais. Registos anulados/incobráveis ficam excluídos. Registos sem preço são sinalizados e não recebem valor presumido. O mesmo nome acumula as várias funções; os nomes Carina/Hugo/Paula são apresentados por extenso sem mudar identificadores.

O angariador do cliente está no separador Geral de todas as fichas. Os clientes históricos conservam a opção «Por preencher» até serem corrigidos. A angariação da tarefa é obrigatória na criação e edição de trabalhos LEGALTEAM; «Outro» exige nome. As parcelas sem atribuição histórica ficam separadas no mapa. Alterar o angariador do cliente recalcula a respectiva parcela nos mapas históricos; não se guarda uma atribuição presumida.

## Provisões e exportação

O histórico normal omite movimentos estornados e os respectivos estornos. A auditoria permanece intacta; apenas a provisão válida e os consumos são apresentados. Não se eliminam registos remotos nem se emitem notas neste lote.

«Guardar mapa de consumo PDF» e «Guardar histórico XLSX» abrem a mesma escolha de apresentação em cada pedido: tempos e valores por registo, ou apenas tempos com provisões/consumo/saldo no resumo final. O formato detalhado mostra IVA e saldo corrente. O formato de tempos não apresenta preços por serviço. O cálculo de acompanhamento mantém o critério vigente de IVA das provisões.

## Base de dados e validação

A migration aditiva `20260902235343_add_legalteam_allocation.sql` acrescenta campos opcionais históricos, validações e RPCs que preservam as funções existentes. A consulta do mapa exige acesso ao âmbito e permissão de consulta financeira. As novas gravações usam wrappers transaccionais; erro de angariador não deixa trabalho parcialmente criado. Um trigger diferido verifica a atribuição final de novos trabalhos LEGALTEAM.

Antes de publicar, ensaiar no esquema real de staging, incluindo importações antigas que criem trabalho LEGALTEAM sem angariador: esses novos trabalhos são rejeitados até serem preenchidos. Alterações históricas que não mudem a sociedade/angariação mantêm a atribuição vazia. Não executar `db push` global nem reparar o histórico divergente por suposição.

O ensaio local `scripts/test-allocation-db.mjs` usa PGlite com funções anteriores e permissões simuladas. Aceita como argumento o caminho absoluto do módulo PGlite instalado; por omissão usa a instalação temporária local `.tmp/provision-db/package/dist/index.js`. As 20 verificações cobrem transacções, campos obrigatórios, históricos, filtros, paginação e recusas de acesso. Não substitui o gate Supabase/staging. Unitários e E2E usam exclusivamente dados sintéticos.
