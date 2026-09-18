export type FixedFeeFinancialInput={
 agreedAmount:number
 isInvoiced:boolean
 isPaid:boolean
 provisionApplied:number
}

export type FixedFeeFinancialPosition={
 agreed:number
 invoiced:number
 toInvoice:number
 received:number
 toReceive:number
 invoicedOutstanding:number
 receivedBeforeInvoice:number
}

const moneyCents=(value:number)=>{
 if(!Number.isFinite(value)||value<0||Math.abs(value*100-Math.round(value*100))>0.00001)throw new Error('Os valores do trabalho devem ser positivos e expressos em cêntimos.')
 return Math.round(value*100)
}

/** O preço contratual mantém-se bruto; uma provisão aplicada reduz só o saldo por receber. */
export function fixedFeeFinancialPosition(input:FixedFeeFinancialInput):FixedFeeFinancialPosition{
 const agreed=moneyCents(input.agreedAmount),applied=moneyCents(input.provisionApplied)
 if(applied>agreed)throw new Error('A provisão aplicada excede o preço acordado.')
 if(input.isPaid&&!input.isInvoiced)throw new Error('Um trabalho pago tem de estar facturado.')
 const received=input.isPaid?agreed:applied
 return {
  agreed:agreed/100,
  invoiced:input.isInvoiced?agreed/100:0,
  toInvoice:input.isInvoiced?0:agreed/100,
  received:received/100,
  toReceive:(agreed-received)/100,
  invoicedOutstanding:input.isInvoiced?(agreed-received)/100:0,
  receivedBeforeInvoice:input.isInvoiced?0:received/100,
 }
}
