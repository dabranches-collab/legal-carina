import type {ProvisionNote} from './credit'
import type {Entry,EntryExpense,DocumentLanguage} from './formalDocumentPdf'
import {formalCopy,moneyInWords} from './formalDocumentCopy'

const round=(value:number)=>Math.round((value+Number.EPSILON)*100)/100

export function formalDocumentMoney(value:number,language:DocumentLanguage,currency:string){
 if(language==='pt'&&currency==='EUR'){
  const [whole,cents]=round(value).toFixed(2).split('.')
  return `€${whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.')},${cents}`
 }
 const locale=language==='fr'?'fr-FR':'en-GB'
 return `${value.toLocaleString(locale,{minimumFractionDigits:2,maximumFractionDigits:2})} ${currency}`
}

export function formalDocumentAmounts(rows:Entry[],expenses:EntryExpense[],note:ProvisionNote|null,vatRate:number,isCollection=false){
 const subtotal=note?Number(note.subtotal):round(rows.reduce((sum,row)=>sum+Number(row.effective_amount??0),0))
 const vat=note?Number(note.vat):round(subtotal*vatRate/100)
 // Historical notes used expenses as information only. Their saved amount must stay unchanged.
 const expensesIncluded=!isCollection&&(!note||note.document_options?.expenses_included===true)
 const expenseTotal=expensesIncluded?round(expenses.reduce((sum,expense)=>sum+Number(expense.amount),0)):0
 const total=note?Number(note.total):round(subtotal+vat+expenseTotal)
 return {subtotal,vat,expenseTotal,total,expensesIncluded}
}

export function formalDocumentNarrative(language:DocumentLanguage,amounts:ReturnType<typeof formalDocumentAmounts>,note:ProvisionNote|null,money:(value:number)=>string){
 const copy=formalCopy[language]
 let intro=copy.intro(money(amounts.subtotal),moneyInWords(amounts.subtotal,language),money(amounts.vat),moneyInWords(amounts.vat,language),amounts.expenseTotal?money(amounts.expenseTotal):'',amounts.expenseTotal?moneyInWords(amounts.expenseTotal,language):'',money(amounts.total),moneyInWords(amounts.total,language))
 if(note&&Number(note.deducted)>0){
  const paid=Number(note.deducted),remaining=Number(note.remaining)
  const external=Number(note.document_options?.fixed_fee_payment?.external??0)>0
  intro+=language==='pt'?` ${external?'Já foi recebido o valor de':'Foi descontada a provisão de'} ${money(paid)}. ${remaining>0?`O valor remanescente a pagar é de ${money(remaining)}.`:'Não existe valor adicional a pagar nesta nota.'}`:language==='en'?` ${external?'An amount of':'An advance of'} ${money(paid)} ${external?'has already been received':'has been deducted'}. ${remaining>0?`The remaining amount due is ${money(remaining)}.`:'No additional payment is due for this note.'}`:` ${external?'Un montant de':'Une provision de'} ${money(paid)} ${external?'a déjà été reçu':'a été déduite'}. ${remaining>0?`Le montant restant à payer est de ${money(remaining)}.`:'Aucun paiement supplémentaire n’est dû pour cette note.'}`
 }
 return intro
}

export function formalDocumentTotalLine(language:DocumentLanguage,amounts:ReturnType<typeof formalDocumentAmounts>,money:(value:number)=>string){
 const tax=language==='en'?'VAT':language==='fr'?'TVA':'IVA'
 const expenses=amounts.expenseTotal?` + ${language==='en'?'Expenses':language==='fr'?'Frais':'Despesas'}`:''
 return `${formalCopy[language].total}: ${money(amounts.subtotal)} + ${tax}${expenses} = ${money(amounts.total)} (${moneyInWords(amounts.total,language)}).`
}

export function formalDocumentExpenseHeading(language:DocumentLanguage,expensesIncluded:boolean){
 const heading={pt:'Despesas suportadas',en:'Expenses incurred',fr:'Frais engagés'}[language]
 if(expensesIncluded)return heading
 const note={pt:'informativas; não incluídas no total',en:'for information; not included in total',fr:'à titre informatif ; non inclus dans le total'}[language]
 return `${heading} (${note})`
}
