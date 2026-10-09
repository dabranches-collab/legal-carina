export type ClientPage = 'general' | 'contacts' | 'billing' | 'retainer' | 'fixedFees' | 'provisions' | 'invoices' | 'honorariumNotes' | 'credentials' | 'documents'
export type ClientGroup = 'summary' | 'data' | 'work' | 'contracts' | 'finance'
export const clientGroups: {id:ClientGroup;label:string}[] = [{id:'summary',label:'Resumo'},{id:'data',label:'Dados'},{id:'work',label:'Trabalho'},{id:'contracts',label:'Contratos'},{id:'finance',label:'Financeiro e documentos'}]
export const clientPages: {id:ClientPage;label:string;group:ClientGroup}[] = [
 {id:'general',label:'Geral',group:'data'},{id:'contacts',label:'Contactos',group:'data'},{id:'billing',label:'Facturação',group:'data'},
 {id:'retainer',label:'Avença',group:'contracts'},{id:'fixedFees',label:'Preço fixo',group:'contracts'},
 {id:'provisions',label:'Provisões',group:'finance'},{id:'credentials',label:'Credenciais',group:'finance'},{id:'documents',label:'Documentos',group:'finance'},{id:'invoices',label:'Facturas',group:'finance'},{id:'honorariumNotes',label:'Notas de Honorários',group:'finance'}]
export function groupForClientPage(page:ClientPage):ClientGroup { return clientPages.find(item=>item.id===page)!.group }
export function restoreClientGroup(saved:string|null,page:ClientPage,hasPage:boolean,hasWorkFilter:boolean):ClientGroup {
 if(hasWorkFilter)return 'work'
 if(saved==='summary'||saved==='work')return saved
 return hasPage?groupForClientPage(page):'summary'
}
