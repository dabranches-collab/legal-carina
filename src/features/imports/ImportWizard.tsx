import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { canonicalFields, type CanonicalField, type WorkbookAnalysis } from './types'
import { fieldLabels } from './mapping'

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

  async function run(nextFile: File, selectedSheet?: string, mappingOverrides?: Partial<Record<CanonicalField, number | null>>) {
    setBusy(true); setError(''); setConfirmed(false); setProgress(15)
    try {
      setProgress(40)
      const { analyzeFile } = await import('./analyzeFile')
      const result = await analyzeFile(nextFile, { selectedSheet, maxFileSizeMb: maxSize, mappingOverrides })
      setProgress(100); setAnalysis(result); setFile(nextFile)
    } catch (reason) {
      setAnalysis(undefined); setProgress(0); setError(reason instanceof Error ? reason.message : 'Não foi possível analisar o ficheiro.')
    } finally { setBusy(false) }
  }

  function selected(event: ChangeEvent<HTMLInputElement>) { const next = event.target.files?.[0]; if (next) void run(next) }
  function dropped(event: DragEvent<HTMLDivElement>) { event.preventDefault(); const next = event.dataTransfer.files[0]; if (next) void run(next) }
  function cancel() { setFile(undefined); setAnalysis(undefined); setProgress(0); setError(''); setConfirmed(false); if (inputRef.current) inputRef.current.value = '' }

  const summary = analysis?.summary
  return (
    <section aria-labelledby="import-title">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">Importação local em duas fases</p>
        <h2 id="import-title" className="mt-3 font-display text-3xl font-semibold">Analisar antes de gravar</h2>
        <p className="mt-3 leading-7 text-text-secondary">O ficheiro é processado neste browser. Nenhum conteúdo é enviado ou importado para o Supabase durante a análise.</p>
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
          <div className="mt-2 flex items-center gap-2"><input id="max-size" type="number" min="1" max="100" value={maxSize} onChange={(event) => setMaxSize(Number(event.target.value))} className="control w-24 px-3 py-2" /><span>MB</span></div>
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
          ['Clientes novos', summary.newClients], ['Clientes existentes', summary.existingClients], ['Possíveis duplicados', summary.possibleDuplicates], ['Sem preço', summary.withoutPrice],
          ['Facturadas', summary.invoicedRows], ['Pagas', summary.paidRows], ['Arquivadas', summary.archivedRows], ['Impacto financeiro', formatCurrency(summary.financialImpact)],
        ].map(([label, value]) => <div key={label} className="card rounded-xl p-4"><p className="text-xs text-text-secondary">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</div><p className="mt-3 text-sm text-text-secondary">{analysis.ignoredRows} linhas sem data, cliente e actividade foram ignoradas.</p></div>

        <div className="card overflow-x-auto"><table className="min-w-full text-left text-xs"><caption className="p-4 text-left font-display text-lg font-semibold">Pré-visualização local (primeiras 8 linhas)</caption><thead className="bg-surface-subtle"><tr>{analysis.preview[0].map((header, index) => <th key={`${header}-${index}`} className="whitespace-nowrap px-3 py-2">{header}</th>)}</tr></thead><tbody>{analysis.preview.slice(1).map((row, rowIndex) => <tr key={rowIndex} className="border-t border-border">{row.map((value, index) => <td key={index} className="max-w-56 truncate px-3 py-2">{value}</td>)}</tr>)}</tbody></table></div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-primary p-6 text-surface"><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" /><span>Confirmei o relatório e compreendo que a gravação remota ainda não está ativada.</span></label><div className="flex gap-3"><button type="button" onClick={cancel} className="rounded-lg border border-surface/40 px-4 py-2">Cancelar</button><button type="button" onClick={() => file && void run(file, analysis.selectedSheet, analysis.mapping)} className="rounded-lg bg-surface px-4 py-2 font-semibold text-primary">Validar</button><button type="button" disabled className="cursor-not-allowed rounded-lg bg-accent px-4 py-2 font-semibold text-primary opacity-50" title="Será ativado após configurar o bucket privado, RLS e a operação transacional">Importar</button></div></div>
      </div>}
    </section>
  )
}
