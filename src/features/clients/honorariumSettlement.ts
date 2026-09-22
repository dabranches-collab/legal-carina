export function honorariumSettlement(totalWithVat:number,advance:number,directPayment:number){
 const cents=(value:number)=>Math.round(value*100)
 const due=cents(totalWithVat)-cents(advance)-cents(directPayment)
 return {remaining:Math.max(0,due)/100,excess:Math.max(0,-due)/100}
}
