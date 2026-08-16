import { SSF } from 'xlsx'
import type { CellSnapshot, ImportIssue, ImportRow, ImportSummary } from './types'
import type { CanonicalField } from './types'

const yes = (value?: CellSnapshot) => ['√', 'SIM', 'S', 'TRUE', '1'].includes(value?.text.trim().toUpperCase() ?? '')
const numberValue = (cell?: CellSnapshot) => typeof cell?.raw === 'number' && Number.isFinite(cell.raw) ? cell.raw : Number(String(cell?.raw ?? '').replace(',', '.'))
const normalizedPartyType = (cell?: CellSnapshot):'individual'|'company'|undefined => {
  const value=cell?.text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase()
  if (value==='PARTICULAR'||value==='INDIVIDUAL') return 'individual'
  if (value==='SOCIEDADE'||value==='EMPRESA'||value==='COMPANY') return 'company'
  return undefined
}

function excelDate(cell?: CellSnapshot): string | undefined {
  if (!cell || cell.raw === null || cell.raw === '') return undefined
  if (cell.raw instanceof Date && !Number.isNaN(cell.raw.valueOf())) return cell.raw.toISOString().slice(0, 10)
  if (typeof cell.raw === 'number') {
    const parsed = SSF.parse_date_code(cell.raw)
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
  }
  const match = cell.text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  const date = new Date(cell.text)
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString().slice(0, 10)
}

const fingerprint = (cells: Partial<Record<CanonicalField, CellSnapshot>>) => [cells.date?.text, cells.clientName?.text, cells.activity?.text, cells.duration?.text, cells.responsible?.text].map((v) => v?.trim().toUpperCase() ?? '').join('|')

export function validateRow(sourceRow: number, cells: Partial<Record<CanonicalField, CellSnapshot>>, knownClientCodes = new Set<string>()): ImportRow {
  const issues: ImportIssue[] = []
  const date = excelDate(cells.date)
  if (!date) issues.push({ severity: 'error', code: 'invalid_date', message: 'Data ausente ou inválida.' })
  if (!cells.clientName?.text.trim()) issues.push({ severity: 'error', code: 'missing_client', message: 'Cliente em falta.' })
  if (!cells.activity?.text.trim()) issues.push({ severity: 'error', code: 'missing_activity', message: 'Atividade em falta.' })
  const clientType=normalizedPartyType(cells.partyType)
  if (!clientType) issues.push({ severity: 'warning', code: 'unknown_client_type', message: 'Tipo de cliente desconhecido; deve ser Particular ou Empresa.' })
  const durationFraction = numberValue(cells.duration)
  const durationMinutes = Number.isFinite(durationFraction) ? Math.round(durationFraction * 24 * 60) : undefined
  if (!durationMinutes || durationMinutes < 1) issues.push({ severity: 'error', code: 'invalid_duration', message: 'Duração inválida; deve resultar em minutos positivos.' })
  const hourlyRate = numberValue(cells.hourlyRate)
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) issues.push({ severity: 'warning', code: 'invalid_price', message: 'Valor hora ausente ou inválido.' })
  const amount = numberValue(cells.amount)
  const calculated = Number.isFinite(hourlyRate) && durationMinutes ? hourlyRate * durationMinutes / 60 : undefined
  if (Number.isFinite(amount) && calculated !== undefined && Math.abs(amount - calculated) > 0.02) issues.push({ severity: 'warning', code: 'amount_mismatch', message: 'Valor difere de valor hora × duração.' })
  if (cells.amount?.raw !== null && cells.amount?.raw !== '' && !cells.amount?.formula) issues.push({ severity: 'warning', code: 'manual_amount', message: 'Valor aparenta ter sido introduzido manualmente.' })
  const code = cells.clientCode?.text.trim()
  if (code && knownClientCodes.size && !knownClientCodes.has(code)) issues.push({ severity: 'warning', code: 'unknown_client_code', message: 'Código não consta da folha CLIENTES.' })
  return { sourceRow, cells, normalized: { date, clientType, durationMinutes, hourlyRate: Number.isFinite(hourlyRate) ? hourlyRate : undefined, amount: Number.isFinite(amount) ? amount : calculated, invoiced: yes(cells.invoiced), paid: yes(cells.paid), archived: Boolean(cells.archive?.text.trim()) }, issues, fingerprint: fingerprint(cells) }
}

export function summarizeRows(rows: ImportRow[]): ImportSummary {
  const counts = new Map<string, number>()
  rows.forEach((row) => counts.set(row.fingerprint, (counts.get(row.fingerprint) ?? 0) + 1))
  const hasError = (row: ImportRow) => row.issues.some((issue) => issue.severity === 'error')
  const hasWarning = (row: ImportRow) => row.issues.some((issue) => issue.severity === 'warning')
  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => !hasError(row) && !hasWarning(row)).length,
    warningRows: rows.filter((row) => !hasError(row) && hasWarning(row)).length,
    invalidRows: rows.filter(hasError).length,
    newClients: new Set(rows.filter((row) => row.issues.some((issue) => issue.code === 'unknown_client_code')).map((row) => row.cells.clientName?.text)).size,
    existingClients: new Set(rows.filter((row) => !row.issues.some((issue) => issue.code === 'unknown_client_code')).map((row) => row.cells.clientName?.text).filter(Boolean)).size,
    possibleDuplicates: rows.filter((row) => (counts.get(row.fingerprint) ?? 0) > 1).length,
    withoutPrice: rows.filter((row) => row.issues.some((issue) => issue.code === 'invalid_price')).length,
    invoicedRows: rows.filter((row) => row.normalized.invoiced).length,
    paidRows: rows.filter((row) => row.normalized.paid).length,
    archivedRows: rows.filter((row) => row.normalized.archived).length,
    financialImpact: rows.reduce((sum, row) => sum + (row.normalized.amount ?? 0), 0),
  }
}
