import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { read, SSF, utils } from 'xlsx'

const sourcePath = process.argv[2]
if (!sourcePath) throw new Error('Indique o caminho do ficheiro XLSX.')

const bytes = readFileSync(sourcePath)
const workbook = read(bytes, { type: 'buffer', cellFormula: true, cellText: true, cellDates: false })
const sheet = workbook.Sheets.DADOS
if (!sheet?.['!ref']) throw new Error('A folha DADOS não existe ou está vazia.')

const cell = (row, column) => sheet[utils.encode_cell({ r: row, c: column })]
const text = (value) => value?.w ?? (value?.v === null || value?.v === undefined ? '' : String(value.v))
const numeric = (value) => typeof value?.v === 'number' && Number.isFinite(value.v) ? value.v : Number(String(value?.v ?? '').replace(',', '.'))
const yes = (value) => ['√', 'SIM', 'S', 'TRUE', '1'].includes(text(value).trim().toUpperCase())
const excelDate = (value) => {
  if (typeof value?.v === 'number') {
    const parsed = SSF.parse_date_code(value.v)
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
  }
  const match = text(value).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : undefined
}

const clientSheet = workbook.Sheets.CLIENTES
const knownCodes = new Set()
const clientSheetCategoriesByCode = new Map()
let clientSheetHeaders = []
if (clientSheet?.['!ref']) {
  const clientRange = utils.decode_range(clientSheet['!ref'])
  clientSheetHeaders = Array.from({ length: clientRange.e.c + 1 }, (_, column) => text(clientSheet[utils.encode_cell({ r: clientRange.s.r, c: column })]).trim())
  for (let row = clientRange.s.r; row <= clientRange.e.r; row += 1) {
    const code = text(clientSheet[utils.encode_cell({ r: row, c: 2 })]).trim()
    if (code) knownCodes.add(code)
    const category = text(clientSheet[utils.encode_cell({ r: row, c: 0 })]).trim().toUpperCase()
    if (code && ['PARTICULAR', 'SOCIEDADE'].includes(category)) clientSheetCategoriesByCode.set(code, category)
  }
}

const range = utils.decode_range(sheet['!ref'])
const rows = []
let ignoredRows = 0
for (let row = 1; row <= range.e.r; row += 1) {
  const dateText = text(cell(row, 0)).trim()
  const clientName = text(cell(row, 2)).trim()
  const activity = text(cell(row, 4)).trim()
  if (!dateText || !clientName || !activity) { ignoredRows += 1; continue }
  const durationFraction = numeric(cell(row, 6))
  const durationMinutes = Number.isFinite(durationFraction) ? Math.round(durationFraction * 1440) : undefined
  const hourlyRate = numeric(cell(row, 7))
  const importedAmount = numeric(cell(row, 8))
  const calculatedAmount = Number.isFinite(hourlyRate) && durationMinutes ? hourlyRate * durationMinutes / 60 : undefined
  const fingerprint = [dateText, clientName, activity, text(cell(row, 6)), text(cell(row, 5))].map((value) => value.trim().toUpperCase()).join('|')
  rows.push({
    sourceRow: row + 1,
    date: excelDate(cell(row, 0)),
    clientName,
    clientCategory: text(cell(row, 1)).trim().toUpperCase(),
    clientCode: text(cell(row, 3)).trim(),
    durationMinutes,
    hourlyRate,
    importedAmount,
    calculatedAmount,
    amountFormula: cell(row, 8)?.f,
    codeFormula: cell(row, 3)?.f,
    yearFormula: cell(row, 16)?.f,
    tableDurationFormula: cell(row, 17)?.f,
    invoiced: yes(cell(row, 11)),
    invoiceDate: excelDate(cell(row, 12)),
    paid: yes(cell(row, 14)),
    archived: Boolean(text(cell(row, 13)).trim()),
    fingerprint,
  })
}

const fingerprintCounts = new Map()
for (const row of rows) fingerprintCounts.set(row.fingerprint, (fingerprintCounts.get(row.fingerprint) ?? 0) + 1)
const invalid = (row) => !row.date || !row.durationMinutes || row.durationMinutes < 1
const warnings = (row) => !invalid(row) && (
  !Number.isFinite(row.hourlyRate) || row.hourlyRate < 0 ||
  (Number.isFinite(row.importedAmount) && row.calculatedAmount !== undefined && Math.abs(row.importedAmount - row.calculatedAmount) > 0.02) ||
  (Number.isFinite(row.importedAmount) && !row.amountFormula) ||
  (row.clientCode && knownCodes.size > 0 && !knownCodes.has(row.clientCode))
)

const report = {
  file: sourcePath.split(/[\\/]/).pop(),
  size: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  sheets: workbook.SheetNames,
  dataRange: sheet['!ref'],
  totalRows: rows.length,
  ignoredRows,
  validRows: rows.filter((row) => !invalid(row) && !warnings(row)).length,
  warningRows: rows.filter(warnings).length,
  invalidRows: rows.filter(invalid).length,
  invalidRowDetails: rows.filter(invalid).map((row) => ({
    sourceRow: row.sourceRow,
    reasons: [!row.date ? 'invalid_date' : null, (!row.durationMinutes || row.durationMinutes < 1) ? 'invalid_duration' : null].filter(Boolean),
  })),
  distinctClients: new Set(rows.map((row) => row.clientName.toUpperCase())).size,
  distinctClientCodes: new Set(rows.map((row) => row.clientCode.toUpperCase())).size,
  clientSheetHeaders,
  clientsCategorizedInClientSheet: clientSheetCategoriesByCode.size,
  clientCategories: Object.fromEntries([...new Set(rows.map((row) => row.clientCategory || '(empty)'))].sort().map((category) => [category, rows.filter((row) => (row.clientCategory || '(empty)') === category).length])),
  clientsWithConflictingCategories: [...new Set(rows.map((row) => row.clientName.toUpperCase()))].filter((name) => new Set(rows.filter((row) => row.clientName.toUpperCase() === name).map((row) => row.clientCategory).filter(Boolean)).size > 1).length,
  clientCodesWithConflictingCategories: [...new Set(rows.map((row) => row.clientCode.toUpperCase()))].filter((code) => new Set(rows.filter((row) => row.clientCode.toUpperCase() === code).map((row) => row.clientCategory).filter(Boolean)).size > 1).length,
  clientCategoryConflictsResolvedByClientSheet: [...new Set(rows.map((row) => row.clientName.toUpperCase()))].filter((name) => {
    const matchingRows = rows.filter((row) => row.clientName.toUpperCase() === name)
    return new Set(matchingRows.map((row) => row.clientCategory).filter(Boolean)).size > 1 && matchingRows.some((row) => clientSheetCategoriesByCode.has(row.clientCode))
  }).length,
  missingClientCodes: rows.filter((row) => !row.clientCode).length,
  unknownClientCodes: rows.filter((row) => row.clientCode && !knownCodes.has(row.clientCode)).length,
  possibleDuplicates: rows.filter((row) => (fingerprintCounts.get(row.fingerprint) ?? 0) > 1).length,
  withoutPrice: rows.filter((row) => !Number.isFinite(row.hourlyRate) || row.hourlyRate < 0).length,
  amountMismatches: rows.filter((row) => Number.isFinite(row.importedAmount) && row.calculatedAmount !== undefined && Math.abs(row.importedAmount - row.calculatedAmount) > 0.02).length,
  manualValues: {
    clientCode: rows.filter((row) => row.clientCode && !row.codeFormula).length,
    amount: rows.filter((row) => Number.isFinite(row.importedAmount) && !row.amountFormula).length,
    year: rows.filter((row) => !row.yearFormula).length,
    tableDuration: rows.filter((row) => !row.tableDurationFormula).length,
  },
  invoicedRows: rows.filter((row) => row.invoiced).length,
  invoicedWithoutInvoiceDate: rows.filter((row) => row.invoiced && !row.invoiceDate).length,
  paidRows: rows.filter((row) => row.paid).length,
  paidWithoutInvoiced: rows.filter((row) => row.paid && !row.invoiced).length,
  archivedRows: rows.filter((row) => row.archived).length,
  financialImpactImported: rows.reduce((sum, row) => sum + (Number.isFinite(row.importedAmount) ? row.importedAmount : 0), 0),
  financialImpactCalculatedFallback: rows.reduce((sum, row) => sum + (Number.isFinite(row.importedAmount) ? row.importedAmount : row.calculatedAmount ?? 0), 0),
}

console.log(JSON.stringify(report, null, 2))
