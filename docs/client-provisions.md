# Provisões para honorários — 0.7.0

## Funcionamento

- A ficha do cliente tem o separador **Provisões** para registar saldo inicial e reforços: sociedade, montante em EUR, data de entrada e origem/referência.
- **Clientes > Provisões**, imediatamente depois de Avenças, mostra todas as contas que já tiveram provisões, incluindo saldos esgotados. Não existe filtro inicial de saldo positivo. Linhas verdes identificam saldo disponível e vermelhas saldo esgotado, acompanhadas por rótulos de estado. Cada linha apresenta recebimentos líquidos de estornos, descontos nas notas, barra/percentagem de consumo e saldo. O botão **Histórico** e o duplo clique abrem a conta da linha para consultar movimentos, registos das notas e extracto PDF. Pesquisa, filtros de coluna, XLSX e impressão usam a tabela comum. Os clientes continuam nas categorias Particulares/Empresas.
- A provisão é descontada **na emissão da Nota de Honorários**, não na criação/edição de cada registo. O desconto é `mínimo(saldo disponível, honorários + IVA arredondado ao cêntimo)`. Despesas informativas continuam excluídas.
- A nota apresenta total, provisão descontada, montante a pagar e saldo remanescente. Mantém as opções PT/EN/FR e o formato existente. Quando totalmente coberta, o texto não pede novo pagamento.
- A nota fica persistida com referência `NH-P-*`, valores e cópia dos registos. Guardar novamente não desconta outra vez. O separador disponibiliza uma cópia discriminativa e o extracto por período de lançamento, com saldo inicial/final, entradas, notas, serviços e estornos.
- Notas de Honorários continuam separadas da facturação fiscal: não são alterados automaticamente `is_invoiced`, `is_paid`, facturas ou pagamentos de facturas. Registos abrangidos por uma nota activa com provisão são excluídos de uma nova Nota de Honorários ou Cobrança, evitando voltar a exigir o total. O remanescente é consultado na nota guardada em Provisões; os indicadores fiscais continuam baseados nos estados de facturação existentes.

## Consistência e acesso

- Contas separadas por cliente, sociedade e moeda; interface inicial em EUR.
- Montantes positivos com até duas casas decimais; não se aceitam datas futuras, consumos superiores ao saldo ou pedidos de emissão com totais/saldo desactualizados.
- Os pedidos usam UUID idempotente. A emissão bloqueia a conta e os registos na transacção. Um registo não pode integrar duas notas activas com provisão; os já utilizados deixam de aparecer na nova selecção.
- Alterações aos dados do serviço abrangido exigem primeiro o estorno da nota. O estorno conserva a nota original e restitui o saldo. Um pagamento não pode ser estornado quando deixar saldo negativo.
- As quatro tabelas têm RLS e apenas SELECT directo para `authenticated`; escritas passam por RPCs com verificação de âmbito e permissão financeira. Anónimo, utilizadores externos e utilizadores sem acesso financeiro não consultam nem movimentam o saldo.

## Preparação e validação

Migration candidata: `supabase/migrations/20260902180905_add_client_credit_ledger.sql`. **Não aplicada ao Supabase.** O histórico remoto foi consultado com `supabase migration list --linked`; a divergência histórica já documentada permanece. Não executar `db push` global.

O ensaio SQL usa PostgreSQL em memória (PGlite 0.5.8), dados sintéticos e um esquema mínimo que representa os contratos usados pela migration. Executar `node scripts/test-provisions-db.mjs <caminho-do-modulo-pglite>`; a biblioteca de ensaio não é uma dependência da aplicação. Este teste não substitui o ensaio contra o esquema completo e as políticas reais em staging antes de publicar.

Browser integrado: demonstração sintética em `http://127.0.0.1:4193/?qa-iphone=1&qa-demo=1&qa-provisions=1&view=provisions`. O estado demonstrativo é apenas em memória e é reposto ao recarregar; não consulta dados reais. A compilação de produção não permite activar este modo.

## Edição das fichas

Um clique apenas selecciona a linha. Duplo clique (ou Enter na linha) abre a ficha. Clientes, Sociedades e Responsáveis abrem directamente em edição, com Guardar desactivado até existir alteração. Os editores dentro das células dos Registos foram removidos.
