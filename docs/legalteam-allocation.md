# Distribuição LEGALTEAM e histórico de provisões — 0.8.0

Versão preparada para revisão local. Frontend publicado permanece em 0.7.1. O utilizador autorizou a ligação local à base original e a limpeza dos dados sintéticos em 03-09-2026.

## Revisão solicitada

As datas predefinidas abrangem o primeiro e último trabalho elegível da LEGALTEAM, sem limitar ao ano actual. A consulta carrega todas as páginas autorizadas e aplica de imediato datas, selecção múltipla de clientes e pagamento. A lista de clientes apresenta apenas quem tem trabalho no período. A selecção de clientes é preservada ao mudar datas; se nenhum dos escolhidos tiver registos, o resultado fica vazio.

As quatro percentagens são editáveis na própria consulta, com até duas casas decimais, entre 0 e 100, e devem somar 100%. Enquanto a soma for inválida, os montantes da repartição e a exportação ficam suspensos, sem reutilizar resultados antigos. Ao reabrir, os valores predefinidos são 10/10/50/30; não altera movimentos ou acordos na base de dados.

Os pré-filtros usam o período, clientes e pagamento seleccionados, independentemente de haver preço ou avença. O filtro de clientes sem angariador mostra clientes únicos e o número de movimentos afectados, com acesso à ficha. Os outros dois mostram movimentos sem angariador da tarefa ou sem executor. Os cartões financeiros resumem o universo seleccionado; clicar num cartão ou pendência apenas restringe a lista de detalhe.

«Exportar resumo PDF» guarda os totais financeiros do período/clientes/pagamento e as taxas actualmente escolhidas, incluindo as horas por pessoa, parcelas de cada função, escritório e valores por atribuir. Os gráficos mostram a composição dos mesmos totais nos cartões. O PDF não emite notas nem pagamentos.

## Distribuição

O período usa a data dos trabalhos, incluindo o primeiro e último dia. A opção «Só pagos» considera o estado actual de pagamento, não a data de recebimento. Calcula-se sobre honorários efectivos em EUR, depois dos descontos e sem IVA ou despesas. As percentagens são 10% angariação do cliente, 10% angariação da tarefa, 50% executor e 30% escritório. Os cêntimos são repartidos sem diferença entre total e soma das parcelas. O mapa é informativo e não lança pagamentos ou dividendos contabilísticos.

As horas pertencem ao executor. As avenças e trabalho não facturável contribuem horas, sem honorários individuais. Registos anulados/incobráveis ficam excluídos. Registos sem preço são sinalizados e não recebem valor presumido. O mesmo nome acumula as várias funções; os nomes Carina/Hugo/Paula são apresentados por extenso sem mudar identificadores.

O angariador do cliente está no separador Geral de todas as fichas. Os clientes históricos conservam a opção «Por preencher» até serem corrigidos. A angariação da tarefa é obrigatória na criação e edição de trabalhos LEGALTEAM; «Outro» exige nome. As parcelas sem atribuição histórica ficam separadas no mapa. Alterar o angariador do cliente recalcula a respectiva parcela nos mapas históricos; não se guarda uma atribuição presumida.

## Provisões e exportação

O histórico normal omite movimentos estornados e os respectivos estornos. A auditoria permanece intacta; apenas a provisão válida e os consumos são apresentados. Não se eliminam registos remotos nem se emitem notas neste lote.

«Guardar mapa de consumo PDF» e «Guardar histórico XLSX» abrem a mesma escolha de apresentação em cada pedido: tempos e valores por registo, ou apenas tempos com provisões/consumo/saldo no resumo final. O formato detalhado mostra IVA e saldo corrente. O formato de tempos não apresenta preços por serviço. O cálculo de acompanhamento mantém o critério vigente de IVA das provisões.

## Base de dados e validação

A migration aditiva `20260902235343_add_legalteam_allocation.sql` acrescenta campos opcionais históricos, validações e RPCs que preservam as funções existentes. A consulta do mapa exige acesso ao âmbito e permissão de consulta financeira. As novas gravações usam wrappers transaccionais; erro de angariador não deixa trabalho parcialmente criado. As RPCs anteriores continuam compatíveis enquanto o frontend publicado não disponibiliza o campo.

O utilizador autorizou em 03-09-2026 o ensaio na base original. `scripts/test-allocation-original.sql` foi executado numa transacção com rollback integral, usando triggers e permissões reais e identidades temporárias; confirmou também a compatibilidade com a versão publicada. Os ensaios não deixam utilizadores/dados sintéticos. Não executar `db push` global nem reparar o histórico divergente por suposição.

O ensaio local `scripts/test-allocation-db.mjs` usa PGlite com funções anteriores e permissões simuladas. Aceita como argumento o caminho absoluto do módulo PGlite instalado; por omissão usa a instalação temporária local `.tmp/provision-db/package/dist/index.js`. As 22 verificações cobrem transacções, campos obrigatórios, históricos, filtros, paginação e recusas de acesso. Não substitui o gate Supabase/staging. Unitários e E2E usam exclusivamente dados sintéticos.

## Activação autorizada e fichas — 03-09-2026

O utilizador autorizou expressamente aplicar os campos e funções à base original depois do ensaio com rollback, substituindo neste lote o staging separado. Aplicada isoladamente como `20260903011816_add_legalteam_allocation`; frontend 0.8.0 ainda não publicado. Mapa real, limites do período e permissões das RPCs verificados.

Duplo clique na repartição ou lista inferior abre a ficha do próprio movimento. Guardar actualiza o mapa e a lista sem perder o período/taxas; clique simples continua a seleccionar. Os clientes da lista de pendências abrem a ficha de cliente. Prestações de avença usam uma caixa com gravação explícita e cancelamento sem escrita.

## Consulta e continuidade

As fichas de clientes abertas pelos pré-filtros são sobrepostas ao painel, mantendo URL, menu, filtros e posição. Depois de guardar e fechar, o mapa é actualizado sem substituir a tabela. Resumos operacionais precedem a repartição.

A consulta inicial carrega a primeira página e depois até três páginas em paralelo. Confirma total, comprimento e ausência de IDs repetidos antes de publicar o resultado na interface. Pedidos são cancelados ao desmontar o painel. Os quatro pré-filtros partilham o âmbito da LEGALTEAM, período, clientes e pagamento; os serviços sem montante contribuem horas mas ficam fora dos totais financeiros.

Campos editáveis têm destaque próprio, contagens de pendências positivas aparecem a vermelho. O PDF dispõe os clientes em até quatro colunas segundo as larguras dos nomes, quebra nomes longos e continua em novas páginas.

Os pré-filtros e cartões pessoais deslocam para o início dos resultados, depois de actualizar a tabela, preservando o menu e o URL. O cabeçalho fixo não tapa os resultados; o foco acompanha a tabela.

## Sociedade-mãe, cadastro de angariadores e desempenho

A sociedade-mãe encontra-se na página Geral do cliente. A criação de um movimento preenche-a ao seleccionar o cliente; a sociedade desse movimento pode ser alterada, sem mudar a ficha do cliente. A sociedade emissora predefinida dos documentos mantém o seu campo independente. Não existe atribuição automática aos clientes históricos.

Outro angariador de cliente exige nome e fica no cadastro por firma, reutilizável nas restantes fichas. Espaços e capitalização não duplicam o cadastro. O nome participa na repartição e pode acumular a parcela de angariação da tarefa. A criação do cadastro é atómica com a gravação do cliente; não cria utilizadores de autenticação.

A consulta usa páginas até 5000 registos; o volume actual de 4424 exige apenas um pedido. O indicador animado e o progresso permanecem visíveis durante recargas. Depois da primeira página, volumes maiores usam até três pedidos simultâneos, validando total e IDs antes de apresentar resultados completos.

As fichas abrem logo editáveis, com Guardar verde e Cancelar vermelho activos após alteração. Vertentes de cliente ausentes podem ser acrescentadas explicitamente; a simples abertura não as cria. Acompanhamento de clientes, sociedades e responsáveis apresenta a tabela no próprio menu, enquanto Visão Geral conserva a navegação para Registos.
