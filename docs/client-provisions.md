# Provisões para honorários — 0.10.0 em preparação

A versão publicada continua 0.9.0. O comportamento abaixo descreve a candidata 0.10.0; a migration de revisões aguarda autorização específica. Ver HANDOVER.md.

## Funcionamento

- A ficha do cliente tem o separador **Provisões** para registar saldo inicial e reforços: sociedade, montante em EUR, data de entrada e origem/referência.
- **Clientes > Provisões**, imediatamente depois de Avenças, mostra todas as contas que já tiveram provisões, incluindo saldos esgotados. Não existe filtro inicial de saldo positivo. Linhas verdes identificam saldo disponível e vermelhas saldo esgotado, acompanhadas por rótulos de estado. Cada linha apresenta recebimentos líquidos de estornos, descontos nas notas, barra/percentagem de consumo e saldo. O botão **Histórico** e o duplo clique abrem a conta da linha para consultar movimentos, registos das notas e extracto PDF. Pesquisa, filtros de coluna, XLSX e impressão usam a tabela comum. Os clientes continuam nas categorias Particulares/Empresas.
- A linha mostra **saldo disponível**, calculado pelos recebimentos, abates em notas e estornos. O estorno devolve o abate e pode fazer a linha passar novamente a verde. A estimativa de consumo pelas horas fica identificada separadamente na ficha e nos resumos PDF/XLSX.
- Este acompanhamento é calculado na leitura, pelo que alterações de horas/preços se reflectem ao actualizar a lista ou reabrir o histórico. Não cria movimentos de desconto, notas, facturas ou pagamentos. O livro de recebimentos e notas fica preservado e identificado separadamente. Na emissão expressa de uma nota, o sistema continua a usar o saldo do livro; os serviços dessa nota passam a estar excluídos do cálculo de acompanhamento, evitando dupla contagem.
- A nota apresenta total, provisão descontada, montante a pagar e saldo remanescente. Mantém as opções PT/EN/FR e o formato existente. Quando totalmente coberta, o texto não pede novo pagamento.
- Todas as notas ficam persistidas e versionadas. Notas anteriores NH-P-* continuam consultáveis. Guardar novamente descarrega a versão já emitida; Rever e reemitir cria nova versão da mesma nota com a selecção corrigida.
- Notas de Honorários continuam separadas da facturação fiscal: não alteram automaticamente is_invoiced/is_paid, facturas nem pagamentos. Todos os registos elegíveis da sociedade podem integrar documentos, mesmo que já tenham nota. Os filtros Com nota, Sem nota e Estornada tornam essa distinção consultável.

## Consistência e acesso

- Contas separadas por cliente, sociedade e moeda; interface inicial em EUR.
- Montantes positivos com até duas casas decimais; não se aceitam datas futuras, consumos superiores ao saldo ou pedidos de emissão com totais/saldo desactualizados.
- Os pedidos usam UUID idempotente e revisão esperada. A gravação bloqueia cliente, conta e serviços. Reemitir o mesmo documento preserva o abate; corrigir a sua selecção recalcula a aplicação própria numa única transacção. Outros documentos podem referir serviços já abrangidos sem os debitar novamente.
- O estorno conserva as versões anteriores, restitui o saldo e liberta os serviços para nova aplicação de provisão. A alteração de cliente, sociedade ou moeda de serviços com abate activo exige estornar primeiro; correcções de descrição/tempo/preço não reescrevem versões já emitidas. Um recebimento não pode ser estornado se deixar saldo negativo.
- As tabelas têm RLS; gravações de documentos e provisões passam por funções que verificam âmbito, permissão financeira, valores e concorrência. Anónimo e utilizadores sem acesso não consultam nem movimentam saldos/documentos.

## Preparação e validação

Migration: `supabase/migrations/20260902180905_add_client_credit_ledger.sql`, publicada isoladamente em 02-09-2026 como `20260902192704_add_client_credit_ledger`, após ensaio de staging com 20/20 pgTAP e CI verde. O histórico remoto foi consultado com `supabase migration list --linked`; a divergência histórica já documentada permanece. Não executar `db push` global. Evidências em `docs/database/provisions-070-validation.md`.

O ensaio SQL usa PostgreSQL em memória (PGlite 0.5.8), dados sintéticos e um esquema mínimo que representa os contratos usados pela migration. Executar `node scripts/test-provisions-db.mjs <caminho-do-modulo-pglite>`; a biblioteca de ensaio não é uma dependência da aplicação. Este teste não substitui o ensaio contra o esquema completo e as políticas reais em staging antes de publicar.

Browser integrado: demonstração sintética em `http://127.0.0.1:4193/?qa-iphone=1&qa-demo=1&qa-provisions=1&view=provisions`. O estado demonstrativo é apenas em memória e é reposto ao recarregar; não consulta dados reais. A compilação de produção não permite activar este modo.

## Edição das fichas

Um clique apenas selecciona a linha. Duplo clique (ou Enter na linha) abre a ficha. Clientes, Sociedades e Responsáveis abrem directamente em edição, com Guardar desactivado até existir alteração. Os editores dentro das células dos Registos foram removidos.
