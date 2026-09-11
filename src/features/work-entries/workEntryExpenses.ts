import {supabase} from '../../lib/supabase'
import {validateClientDocument} from '../clients/documentValidation'

export type ExpenseDraft={key:string;amount:string;observations:string;files:File[]}
const maxSize=20*1024*1024
export const emptyExpense=():ExpenseDraft=>({key:crypto.randomUUID(),amount:'',observations:'',files:[]})
export type CreatedWorkEntryExpenses={workEntryId:string;expenses:{key:string;id:string}[]}

export async function uploadExpenseFiles(expenseId:string,files:File[]){
 if(!supabase)return ['Ligação ao Supabase indisponível.'];const failures:string[]=[]
 for(const file of files){if(file.size<=0||file.size>maxSize){failures.push(`${file.name}: deve ter no máximo 20 MB.`);continue}const bytes=new Uint8Array(await file.arrayBuffer());if(!validateClientDocument(file.name,bytes)){failures.push(`${file.name}: formato inválido ou conteúdo activo.`);continue}const body=new FormData();body.set('file',file);body.set('expenseId',expenseId);const uploaded=await supabase.functions.invoke('expense-documents',{body});if(uploaded.error||uploaded.data?.error)failures.push(`${file.name}: ${uploaded.data?.error??uploaded.error?.message??'não foi possível carregar.'}`)}return failures
}

export async function saveExpenseDrafts(workEntryId:string,drafts:ExpenseDraft[]){
 if(!supabase)return ['Ligação ao Supabase indisponível.'];const failures:string[]=[]
 for(const draft of drafts){const amount=Number(draft.amount.replace(',','.'));if(!Number.isFinite(amount)||amount<=0){failures.push('Uma despesa tem um montante inválido.');continue}const created=await supabase.rpc('create_work_entry_expense',{p_work_entry_id:workEntryId,p_amount:amount,p_observations:draft.observations.trim()||null});if(created.error||!created.data){failures.push(created.error?.message??'Não foi possível guardar uma despesa.');continue}failures.push(...await uploadExpenseFiles(String(created.data),draft.files))}return failures
}

export async function uploadCreatedExpenseFiles(result:CreatedWorkEntryExpenses,drafts:ExpenseDraft[]){
 const failures:string[]=[]
 for(const created of result.expenses){const draft=drafts.find(item=>item.key===created.key);if(draft?.files.length)failures.push(...await uploadExpenseFiles(created.id,draft.files))}
 return failures
}
