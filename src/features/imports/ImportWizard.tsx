import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { canonicalFields, type CanonicalField, type ImportRow, type WorkbookAnalysis } from './types'
import { fieldLabels } from './mapping'
import { supabase } from '../../lib/supabase'

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)

export function ImportWizard() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File>()
  const [analysis, setAnalysis] = useState<WorkbookAnalysis>()
  const [maxSize, setMaxSize] = useState(20)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [importResult,setImportResult]=useState<{importId:string;newRows:number;updatedRows:number;unchangedRows:number;invalidRows:number;missingRows:number;status:string}>()
  const [remoteValidated,setRemoteValidated]=useState(false)
  const [importMetrics,setImportMetrics]=useState<{overrides:number;importErrors:number}|null>(null)

  useEffect(()=>{let active=true;void(async()=>{if(!supabase)return;const response=await supabase.rpc('get_dashboard_overview');if(!active||response.error)return;const metrics=(response.data as {metrics?:{overrides?:number;importErrors?:number}})?.metrics;setImportMetrics({overrides:Number(metrics?.overrides??0),importErrors:Number(metrics?.importErrors??0)})})();return()=>{active=false}},[])

  async function run(nextFile: File, selectedSheet?: string, mappingOverrides?: Partial<Record<CanonicalField, number | null>>) {
    setBusy(true); setError(''); setConfirmed(false); setProgress(15)
    try {
      setProgress(40)
      const { analyzeFile } = await import('./analyzeFile')
      const result = await analyzeFile(nextFile, { selectedSheet, maxFileSizeMb: maxSize, mappingOverrides })
      setProgress(70);setRemoteValidated(false)
      if(supabase){
        const {data:remote,error:remoteError}=await supabase.rpc('analyze_import_candidates',{p_rows:result.rows})
        if(remoteError)throw new Error(`A validação local terminou, mas a comparação segura com a base de dados falhou: ${remoteError.message}`)
        const comparison=remote as {rows:{sourceRow:number;action:'new'|'unchanged'|'update'|'conflict';workEntryId?:string;changedFields:string[]}[];existingClients:number;newClients:number;newRows:number;unchangedRows:number;updatedRows:number;conflictRows:number;missingRows:number}
        const reconciliationByRow=new Map(comparison.rows.map(row=>[row.sourceRow,row]))
        const fingerprintCounts=new Map<string,number>();result.rows.forEach(row=>fingerprintCounts.set(row.fingerprint,(fingerprintCounts.get(row.fingerprint)??0)+1))
        result.rows=result.rows.map(row=>{
          const reconciliation=reconciliationByRow.get(row.sourceRow)
          if(!reconciliation)return {...row,issues:[...row.issues,{severity:'error' as const,code:'reconciliation_missing',message:'A linha não recebeu uma decisão segura do servidor.'}]}
          const issue=reconciliation.action==='update'?{severity:'warning' as const,code:'existing_update',message:`O movimento existente será actualizado: ${reconciliation.changedFields.join(', ')}.`}:reconciliation.action==='conflict'?{severity:'error' as const,code:'manual_override_conflict',message:'O movimento tem alterações manuais e exige revisão antes da importação.'}:undefined
          return {...row,reconciliation,issues:issue?[...row.issues,issue]:row.issues}
        })
        const hasError=(row:ImportRow)=>row.issues.some(issue=>issue.severity==='error'),hasWarning=(row:ImportRow)=>row.issues.some(issue=>issue.severity==='warning')
        result.summary={...result.summary,validRows:result.rows.filter(row=>!hasError(row)&&!hasWarning(row)).length,warningRows:result.rows.filter(row=>!hasError(row)&&hasWarning(row)).length,invalidRows:result.rows.filter(hasError).length,possibleDuplicates:result.rows.filter(row=>(fingerprintCounts.get(row.fingerprint)??0)>1).length,existingClients:comparison.existingClients,newClients:comparison.newClients,newRows:comparison.newRows,unchangedRows:comparison.unchangedRows,updatedRows:comparison.updatedRows,conflictRows:comparison.conflictRows,missingRows:comparison.missingRows}
        setRemoteValidated(comparison.conflictRows===0)
      }
      setProgress(100); setAnalysis(result); setFile(nextFile)
    } catch (reason) {
      setAnalysis(undefined); setProgress(0); setError(reason instanceof Error ? reason.message : 'Não foi possível analisar o ficheiro.')
    } finally { setBusy(false) }
  }

  function selected(event: ChangeEvent<HTMLInputElement>) { const next = event.target.files?.[0]; if (next) void run(next) }
  function dropped(event: DragEvent<HTMLDivElement>) { event.preventDefault(); const next = event.dataTransfer.files[0]; if (next) void run(next) }
  function cancel() { setFile(undefined); setAnalysis(undefined); setProgress(0); setError(''); setConfirmed(false); setImportResult(undefined); setRemoteValidated(false); if (inputRef.current) inputRef.current.value = '' }

  async function commit(){
    if(!confirmed||!remoteValidated||!analysis||!file||!supabase)return
    setBusy(true);setError('');setProgress(10)
    try{
      const payload={fileName:analysis.fileName,fileSize:analysis.fileSize,sha256:analysis.sha256,selectedSheet:analysis.selectedSheet,summary:analysis.summary,rows:analysis.rows,clientDirectory:analysis.clientDirectory}
      setProgress(35)
      const {data,error:failure}=await supabase.rpc('commit_validated_import',{p_payload:payload})
      if(failure)throw failure
      setProgress(100);setImportResult(data as {importId:string;newRows:number;updatedRows:number;unchangedRows:number;invalidRows:number;missingRows:number;status:string})
    }catch(reason){
      const message=reason instanceof Error?reason.message:reason&&typeof reason==='object'&&'message' in reason&&typeof reason.message==='string'?reason.message:'Não foi possível concluir a importação.'
      setProgress(0);setError(message)
    }
    finally{setBusy(false)}
  }

  const summary = analysis?.summary
  return (
    <section aria-labelledby="import-title">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">Importação local em duas fases</p>
        <h2 id="import-title" className="mt-3 font-display text-3xl font-semibold">Analisar antes de gravar</h2>
        <p className="mt-3 leading-7 text-text-secondary">O ficheiro é processado primeiro neste browser. Depois da validação local, as linhas normalizadas são comparadas de forma segura com o Supabase; nenhum movimento é gravado antes da confirmação final.</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Indicadores de importação">
        <article className="card p-4"><p className="text-xs text-text-secondary">Importações com erros</p><p className="mt-1 text-xl font-semibold tabular-nums">{importMetrics?.importErrors??'—'}</p><p className="mt-1 text-xs text-text-secondary">Lotes com linhas rejeitadas</p></article>
        <article className="card p-4"><p className="text-xs text-text-secondary">Com override</p><p className="mt-1 text-xl font-semibold tabular-nums">{importMetrics?.overrides??'—'}</p><p className="mt-1 text-xs text-text-secondary">Movimentos com alterações manuais protegidas</p></article>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <div onDragOver={(event) => event.preventDefault()} onDrop={dropped} className="card rounded-2xl border-2 border-dashed border-accent/50 p-8 text-center">
          <p className="font-serif text-xl font-semibold">Arraste o ficheiro para esta zona</p>
          <p className="mt-2 text-sm text-text-secondary">Formatos permitidos: .xlsx e .csv · sem macros ou conteúdo activo</p>
          <button type="button" onClick={() => inputRef.current?.click()} className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-surface hover:bg-primary-hover">Seleccionar ficheiro</button>
          <input ref={inputRef} type="file" accept=".xlsx,.csv" onChange={selected} className="sr-only" aria-label="Seleccionar ficheiro XLSX ou CSV" />
        </div>
        <div className="rounded-2xl border border-border bg-surface-subtle p-6">
          <label htmlFor="max-size" className="text-sm font-semibold">Limite configurável</label>
          <div className="mt-2 flex items-center gap-2"><input id="max-size" type="number" min="1" max="50" value={maxSize} onChange={(event) => setMaxSize(Math.min(50,Math.max(1,Number(event.target.value))))} className="control w-24 px-3 py-2" /><span>MB</span></div>
          <p className="mt-4 break-all text-xs leading-5 text-text-secondary">{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Nenhum ficheiro seleccionado.'}</p>
        </div>
      </div>

      {busy && <div className="mt-6" role="status"><p className="mb-2 text-sm">A analisar localmente… {progress}%</p><progress className="h-2 w-full" max="100" value={progress} /></div>}
      {error && <p role="alert" className="mt-6 rounded-xl border border-danger/30 bg-danger-soft p-4 text-danger">{error}</p>}

      {analysis && summary && <div className="mt-8 space-y-8">
        <div className="card flex flex-wrap items-end gap-5 p-6">
          <label className="text-sm font-semibold">Folha<select value={analysis.selectedSheet} onChange={(event) => file && void run(file, event.target.value)} className="control mt-2 block px-3 py-2 font-normal">{analysis.sheets.map((sheet) => <option key={sheet}>{sheet}</option>)}</select></label>
          <div className="min-w-0 flex-1 text-xs text-text-secondary"><span className="font-semibold">SHA-256</span><code className="mt-2 block break-all rounded-lg bg-surface-subtle p-2">{analysis.sha256}</code></div>
        </div>

        <div><h3 className="font-display text-2xl font-semibold">Mapeamento de colunas</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{canonicalFields.map((field) => <label key={field} className="text-xs font-semibold">{fieldLabels[field]}<select value={analysis.mapping[field] ?? ''} onChange={(event) => file && void run(file, analysis.selectedSheet, { ...analysis.mapping, [field]: event.target.value === '' ? null : Number(event.target.value) })} className="control mt-1 block w-full px-3 py-2 font-normal"><option value="">Não mapear</option>{analysis.headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `Coluna ${index + 1}`}</option>)}</select></label>)}</div></div>

        <div><h3 className="font-serif text-2xl font-semibold">Confirmação</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ['Linhas analisadas', summary.totalRows], ['Válidas', summary.validRows], ['Com avisos', summary.warningRows], ['Inválidas', summary.invalidRows],
          ['Movimentos novos', summary.newRows], ['Sem alterações', summary.unchangedRows], ['A actualizar', summary.updatedRows], ['Conflitos', summary.conflictRows],
          ['Ausentes no ficheiro', summary.missingRows], ['Clientes novos', summary.newClients], ['Clientes existentes', summary.existingClients], ['Possíveis duplicados', summary.possibleDuplicates], ['Sem preço', summary.withoutPrice],
          ['Facturadas', summary.invoicedRows], ['Pagas', summary.paidRows], ['Arquivadas', summary.archivedRows], ['Impacto financeiro', formatCurrency(summary.financialImpact)],
        ].map(([label, value]) => <div key={label} className="card rounded-xl p-4"><p className="text-xs text-text-secondary">{label}</p><p className={`${label==='Impacto financeiro'?'financial-value ':''}mt-1 text-xl font-semibold`}>{value}</p></div>)}</div><p className="mt-3 text-sm text-text-secondary">{analysis.ignoredRows} linhas sem data, cliente e actividade foram ignoradas. A folha CLIENTES contém {analysis.clientDirectory.length} entradas reconhecidas; apenas categorias dedutíveis serão criadas automaticamente.</p></div>

        <div className="card overflow-x-auto"><table className="min-w-full text-left text-xs"><caption className="p-4 text-left font-display text-lg font-semibold">Pré-visualização local (primeiras 8 linhas)</caption><thead className="bg-surface-subtle"><tr>{analysis.preview[0].map((header, index) => <th key={`${header}-${index}`} className="whitespace-nowrap px-3 py-2">{header}</th>)}</tr></thead><tbody>{analysis.preview.slice(1).map((row, rowIndex) => <tr key={rowIndex} className="border-t border-border">{row.map((value, index) => <td key={index} className="max-w-56 truncate px-3 py-2">{value}</td>)}</tr>)}</tbody></table></div>

        {importResult&&<p role="status" className="rounded-xl border border-success/30 bg-success-soft p-4 text-success">Reconciliação concluída: {importResult.newRows} novos, {importResult.updatedRows} actualizados, {importResult.unchangedRows} sem alterações e {importResult.invalidRows} inválidos. {importResult.missingRows} movimentos anteriores ficaram apenas sinalizados como ausentes. Lote: <code>{importResult.importId}</code>.</p>}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-primary p-6 text-surface"><label className="flex items-start gap-3 text-sm"><input type="checkbox" disabled={!remoteValidated} checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" /><span>{remoteValidated?'Confirmei as linhas novas, inalteradas, alteradas, ausentes e o impacto financeiro. Pretendo reconciliar este lote no Supabase.':summary.conflictRows>0?'A importação está bloqueada porque existem alterações manuais em conflito.':'A importação permanece bloqueada até concluir a comparação segura com todos os movimentos existentes.'}</span></label><div className="flex gap-3"><button type="button" onClick={cancel} className="rounded-lg border border-surface/40 px-4 py-2">Cancelar</button><button type="button" disabled={busy} onClick={() => file && void run(file, analysis.selectedSheet, analysis.mapping)} className="rounded-lg bg-surface px-4 py-2 font-semibold text-primary disabled:opacity-50">Validar</button><button type="button" disabled={!confirmed||!remoteValidated||busy||Boolean(importResult)} onClick={()=>void commit()} className="rounded-lg bg-accent px-4 py-2 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50">{busy?'A reconciliar…':'Reconciliar'}</button></div></div>
      </div>}
    </section>
  )
}
