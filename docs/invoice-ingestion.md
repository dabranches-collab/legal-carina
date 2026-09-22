# Entrada e afectação de facturas

## Decisões funcionais confirmadas

- A ficha do cliente tem um separador próprio **Facturas**, distinto do arquivo geral **Documentos** e das **Notas de Honorários** emitidas pela plataforma.
- A entrada aceita PDF, JPG e PNG por selecção ou arrastar e largar. A leitura propõe os dados; o operador confirma ou corrige antes de guardar.
- Uma factura pode ter várias afectações, com montantes próprios: provisão, trabalho a preço fixo, Nota de Honorários, avença, registos de trabalho ou outro valor.
- Confirmar uma factura marca automaticamente como facturados os elementos escolhidos, guardando o número e a data da factura.
- Se o operador confirmar que a factura está paga, a mesma transacção regista o recebimento e marca como pagos os elementos abrangidos.
- Factura, recebimento e afectações são entidades distintas. Uma factura pode existir sem pagamento, e um pagamento parcial não equivale a uma factura totalmente paga.
- A correcção ou anulação recalcula os estados a partir das ligações activas; não exige editar cada registo e não deixa estados sem documento de suporte.

## Regra por tipo de afectação

- **Registos normais:** cada registo seleccionado fica ligado à linha da factura e recebe os estados Facturado/Pago conforme a factura e os recebimentos.
- **Nota de Honorários:** a factura liga-se à versão actual escolhida e expande a rastreabilidade aos registos dessa nota. A nota mantém o seu histórico.
- **Trabalho a preço fixo:** a factura altera o estado de facturação/pagamento do trabalho. As horas associadas permanecem analíticas e não voltam a somar honorários.
- **Avença:** a factura liga-se às prestações escolhidas e actualiza o estado dessas prestações; os registos cobertos continuam apenas como horas.
- **Provisão:** o recebimento da factura alimenta a conta de provisões pelo valor efectivamente recebido, incluindo a decomposição de IVA confirmada. Uma factura emitida e ainda não paga não cria saldo disponível.

## Transacção a implementar

Uma função transaccional e idempotente deve validar permissões, duplicados, sociedade, cliente, moeda e soma das afectações; guardar a factura e o ficheiro privado; criar as ligações; criar o recebimento quando indicado; actualizar os estados derivados; e registar auditoria. Qualquer falha anula toda a operação.

Os campos exactos a extrair e as regras de correspondência automática serão acrescentados após indicação do utilizador.
