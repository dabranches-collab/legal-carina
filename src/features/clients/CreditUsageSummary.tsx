import { EditWorkEntryModal } from '../work-entries/EditWorkEntryModal'
import { useState } from 'react'
import { CreditHistoryExportDialog } from './CreditHistoryExportDialog'
import { creditDate, creditMoney, type CreditMovement, type CreditAccount } from './credit'
import type { CreditUsage } from './creditUsage'


export function CreditUsageSummary({account,usage,movements=[],onSaved}:{account:CreditAccount;usage:CreditUsage;movements?:CreditMovement[];onSaved?:()=>void}){
 const [editing,setEditing]=useState<string|null>(null)
 const [exportFormat,setExportFormat]=useState<'pdf'|'xlsx'|null>(null)
 return <section aria-label="Consumo da provisão nos registos" className="space-y-3 rounded-xl border border-border bg-surface-subtle p-4">
  <h4 className="font-semibold">Estimativa pelos registos{usage.startsOn?` · desde ${creditDate(usage.startsOn)}`:''}</h4>
  <p className="text-sm">Projecção do saldo se todos os registos abaixo forem incluídos em notas. Recalcula quando as horas ou os preços mudam; não altera o saldo disponível nem anula o efeito de um estorno.</p>
  <div className="grid gap-3 sm:grid-cols-3">{[['Provisões recebidas',account.received],['Utilização estimada',usage.consumed],['Saldo estimado após registos',usage.balance]].map(([label,value])=><div key={label}><p className="text-xs text-text-secondary">{label}</p><p className="financial-value text-xl font-semibold">{creditMoney(Number(value),account.currency)}</p></div>)}</div>
  <p className="text-sm">{usage.rows.length} registos · {Math.floor(usage.minutes/60)} h {usage.minutes%60} min · Honorários: {creditMoney(usage.subtotal,account.currency)} · IVA: {creditMoney(usage.vat,account.currency)}</p>
  {usage.excess>0&&<p className="text-sm text-danger">Valor dos registos sem cobertura da provisão: <strong>{creditMoney(usage.excess,account.currency)}</strong></p>}
  {usage.missingPrice>0&&<p role="status" className="text-sm text-warning-strong">Saldo por apurar: {usage.missingPrice} registos sem preço. O valor apresentado considera apenas os registos valorizados.</p>}
  <details><summary className="min-h-11 cursor-pointer py-2 font-semibold">Ver os registos considerados no saldo</summary><div className="space-y-2">{usage.rows.map(row=><article key={row.id} tabIndex={0} onDoubleClick={()=>setEditing(row.id)} onKeyDown={event=>{if(event.key==='Enter'&&event.target===event.currentTarget){event.preventDefault();setEditing(row.id)}}} className="rounded-lg border border-border bg-surface p-3 text-sm"><strong>{creditDate(row.work_date)} · {row.duration_minutes} min · {row.effective_amount===null?'Sem preço':creditMoney(row.effective_amount,account.currency)}</strong><p className="mt-1 break-words">{row.activity_description}</p></article>)}</div></details>
  <button type="button" className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm font-semibold" onClick={()=>setExportFormat('pdf')}>Guardar mapa de consumo PDF</button>
  <button type="button" className="ml-2 min-h-11 rounded-lg border border-border bg-surface px-3 text-sm font-semibold" onClick={()=>setExportFormat('xlsx')}>Guardar histórico XLSX</button>
  {exportFormat&&<CreditHistoryExportDialog account={account} usage={usage} movements={movements} format={exportFormat} onClose={()=>setExportFormat(null)}/>}
  {editing&&<EditWorkEntryModal entryId={editing} canDelete={false} requiresReason={false} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);onSaved?.()}}/>}
 </section>
}
