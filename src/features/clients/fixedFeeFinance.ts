export type FixedFeeFinancialInput={
 agreedAmount:number
 isInvoiced:boolean
 isPaid:boolean
 /** Montante da provisão em dinheiro, com IVA. */
 provisionApplied:number
 /** Taxa da sociedade; obrigatória quando há provisão aplicada. */
 vatRate?:number
}

export type FixedFeeFinancialPosition={
 agreed:number
 invoiced:number
 toInvoice:number
 received:number
 toReceive:number
 invoicedOutstanding:number
 receivedBeforeInvoice:number
 vat:number
 totalWithVat:number
 provisionAppliedGross:number
 receivedGross:number
 toReceiveGross:number
}

const moneyCents=(value:number)=>{
 if(!Number.isFinite(value)||value<0||Math.abs(value*100-Math.round(value*100))>0.00001)throw new Error('Os valores do trabalho devem ser positivos e expressos em cêntimos.')
 return Math.round(value*100)
}

/** Honorários e indicadores analíticos são antes de IVA; a provisão é dinheiro com IVA. */
export function fixedFeeFinancialPosition(input:FixedFeeFinancialInput):FixedFeeFinancialPosition{
 const agreed=moneyCents(input.agreedAmount),applied=moneyCents(input.provisionApplied),rate=input.vatRate
 if(rate!==undefined&&(!Number.isFinite(rate)||rate<0||rate>100||Math.abs(rate*100-Math.round(rate*100))>0.00001))throw new Error('Taxa de IVA inválida.')
 if(applied>0&&rate===undefined)throw new Error('Indique a taxa de IVA para aplicar uma provisão.')
 const vat=Math.round(agreed*(rate??0)/100),gross=agreed+vat
 if(applied>gross)throw new Error('A provisão aplicada excede o total com IVA do trabalho.')
 if(input.isPaid&&!input.isInvoiced)throw new Error('Um trabalho pago tem de estar facturado.')
 const receivedGross=input.isPaid?gross:applied
 const received=input.isPaid?agreed:gross?Math.round(applied*agreed/gross):0
 return {
  agreed:agreed/100,
  invoiced:input.isInvoiced?agreed/100:0,
  toInvoice:input.isInvoiced?0:agreed/100,
  received:received/100,
  toReceive:(agreed-received)/100,
  invoicedOutstanding:input.isInvoiced?(agreed-received)/100:0,
  receivedBeforeInvoice:input.isInvoiced?0:received/100,
  vat:vat/100,
  totalWithVat:gross/100,
  provisionAppliedGross:applied/100,
  receivedGross:receivedGross/100,
  toReceiveGross:(gross-receivedGross)/100,
 }
}
