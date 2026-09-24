import {expect,test} from 'vitest'
import {noteCreditPreview,documentIsVoided,type HonorariumDocument} from './honorariumDocuments'
const credit={id:'credit',deducted:200,subtotal:300,items:[{id:'a',effective_amount:100},{id:'b',effective_amount:200}]}
const note={id:'v1',document_id:'doc',revision:1,total:300,vat_rate:0,deducted:200,items:credit.items,credit_note_id:'credit',credit_note:credit,credit_active:true,billing_entity_id:'society'} as HonorariumDocument
const account={id:'account',client_id:'client',client_name:'Synthetic',billing_entity_id:'society',society_name:'Synthetic',currency:'EUR',balance:0,received:200,consumed:200}
test('reemissão igual conserva o abate sem novo movimento',()=>{
 const result=noteCreditPreview([{id:'a',effective_amount:100},{id:'b',effective_amount:200}],0,account,[note],note,true)
 expect(result).toMatchObject({deducted:200,balance_after:0,newDeduction:0,returned:0})
})
test('despesas aumentam o valor da nota sem aumentar a provisão aplicada aos honorários',()=>{
 const result=noteCreditPreview([{id:'nova',effective_amount:6600}],23,{...account,balance:10000},[],null,true,399)
 expect(result).toMatchObject({subtotal:6600,vat:1518,total:8517,deducted:8118,remaining:399,newDeduction:8118})
})
test('revisão inclui IVA de uma provisão já recebida quando o crédito foi corrigido',()=>{
 const original={...note,total:5166,vat_rate:23,deducted:1600,items:[{id:'a',effective_amount:4200}],credit_note:{...credit,deducted:1600,subtotal:4200,items:[{id:'a',effective_amount:4200}]}} as HonorariumDocument
 const result=noteCreditPreview([{id:'a',effective_amount:4200}],23,{...account,balance:368,received:1968,consumed:1600},[original],original,true)
 expect(result).toMatchObject({subtotal:4200,vat:966,total:5166,deducted:1968,remaining:3198,newDeduction:1968,balance_after:0,returned:1600})
})
test('retirar linhas da própria nota devolve excesso e recalcula a aplicação',()=>{
 expect(noteCreditPreview([{id:'a',effective_amount:100}],0,account,[note],note,true)).toMatchObject({deducted:100,balance_after:100})
})
test('novo documento pode repetir trabalho já abrangido sem novo débito',()=>{
 expect(noteCreditPreview([{id:'a',effective_amount:100},{id:'b',effective_amount:200}],0,account,[note],null,true)).toMatchObject({deducted:200,balance_after:0,newDeduction:0})
})
test('após estorno as linhas deixam de consumir saldo e podem integrar outra nota',()=>{
 const reversed={...note,credit_active:false}
 expect(documentIsVoided(reversed)).toBe(true)
 expect(noteCreditPreview([{id:'a',effective_amount:100}],0,{...account,balance:200,consumed:0},[reversed],null,true)).toMatchObject({deducted:100,balance_after:100,newDeduction:100})
})
test('revisão recalcula quando foi estornada uma aplicação partilhada por outra nota',()=>{
 const own={...credit,deducted:100,subtotal:100,items:[{id:'a',effective_amount:100}]},revision={...note,deducted:300,credit_note:own} as HonorariumDocument
 const result=noteCreditPreview([{id:'a',effective_amount:100},{id:'b',effective_amount:200}],0,{...account,balance:200},[revision],revision,true)
 expect(result).toMatchObject({deducted:300,newDeduction:300,returned:100,balance_after:0})
})
