import Papa from 'papaparse'
import { read, utils, type CellObject, type WorkBook, type WorkSheet } from 'xlsx'
import { canonicalFields, type CanonicalField, type CellSnapshot, type WorkbookAnalysis } from './types'
import { inferMapping } from './mapping'
import { summarizeRows, validateRow } from './validation'

const allowedExtensions = ['.xlsx', '.csv']
const text = (cell?: CellObject): string => cell?.w ?? (cell?.v === null || cell?.v === undefined ? '' : String(cell.v))

export async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function assertSafeFile(file: File, maxFileSizeMb = 20) {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!allowedExtensions.includes(extension)) throw new Error('Formato não permitido. Use .xlsx ou .csv.')
  if (file.size > maxFileSizeMb * 1024 * 1024) throw new Error(`O ficheiro excede o limite de ${maxFileSizeMb} MB.`)
}

function findHeaderRow(sheet: WorkSheet): number {
  const range = utils.decode_range(sheet['!ref'] ?? 'A1:A1')
  for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 30); row += 1) {
    const values = Array.from({ length: range.e.c - range.s.c + 1 }, (_, offset) => text(sheet[utils.encode_cell({ r: row, c: range.s.c + offset })]).toUpperCase())
    if (values.includes('DATA') && values.includes('CLIENTE') && values.some((value) => value === 'ACTIVIDADE' || value === 'ATIVIDADE')) return row
  }
  return range.s.r
}

function clientCodes(workbook: WorkBook): Set<string> {
  const sheet = workbook.Sheets.CLIENTES
  if (!sheet?.['!ref']) return new Set()
  const range = utils.decode_range(sheet['!ref'])
  let codeColumn: number | undefined
  let headerRow = range.s.r
  for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 30); row += 1) {
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const value = text(sheet[utils.encode_cell({ r: row, c: column })]).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
      if (value.includes('CODIGO')) { codeColumn = column; headerRow = row; break }
    }
    if (codeColumn !== undefined) break
  }
  if (codeColumn === undefined) {
    const lookupFormula = Object.values(workbook.Sheets.DADOS ?? {}).find((cell) => typeof cell === 'object' && cell && 'f' in cell && typeof cell.f === 'string' && cell.f.includes('CLIENTES!')) as CellObject | undefined
    const lookupRange = lookupFormula?.f?.match(/CLIENTES!\$([A-Z]+)\$(\d+):\$([A-Z]+)\$(\d+)/i)
    if (!lookupRange) return new Set()
    codeColumn = utils.decode_col(lookupRange[3])
    headerRow = Number(lookupRange[2]) - 2
  }
  return new Set(Array.from({ length: range.e.r - headerRow }, (_, index) => text(sheet[utils.encode_cell({ r: headerRow + index + 1, c: codeColumn! })]).trim()).filter(Boolean))
}

function analyzeSheet(workbook: WorkBook, selectedSheet: string, mappingOverrides?: Partial<Record<CanonicalField, number | null>>) {
  const sheet = workbook.Sheets[selectedSheet]
  if (!sheet?.['!ref']) throw new Error(`A folha ${selectedSheet} não contém dados.`)
  const range = utils.decode_range(sheet['!ref'])
  const headerRow = findHeaderRow(sheet)
  const headers = Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) => text(sheet[utils.encode_cell({ r: headerRow, c: range.s.c + index })]).trim())
  const mapping = { ...inferMapping(headers), ...mappingOverrides }
  const knownCodes = clientCodes(workbook)
  const rows = []
  let ignoredRows = 0
  for (let row = headerRow + 1; row <= range.e.r; row += 1) {
    const cells = Object.fromEntries(canonicalFields.map((field) => {
      const mapped = mapping[field]
      if (mapped === null) return [field, undefined]
      const source = sheet[utils.encode_cell({ r: row, c: range.s.c + mapped })]
      const snapshot: CellSnapshot = { raw: source?.v ?? null, text: text(source), formula: source?.f }
      return [field, snapshot]
    })) as Partial<Record<CanonicalField, CellSnapshot>>
    const effective = Boolean(cells.date?.text.trim() && cells.clientName?.text.trim() && cells.activity?.text.trim())
    if (!effective) { ignoredRows += 1; continue }
    rows.push(validateRow(row + 1, cells, knownCodes))
  }
  const preview = [headers, ...rows.slice(0, 8).map((row) => canonicalFields.map((field) => row.cells[field]?.text ?? ''))]
  return { headers, mapping, rows, preview, ignoredRows, knownClientCodes: [...knownCodes] }
}

function csvWorkbook(content: string, fileName: string): WorkBook {
  const parsed = Papa.parse<string[]>(content, { skipEmptyLines: false })
  if (parsed.errors.length) throw new Error(`CSV inválido: ${parsed.errors[0].message}`)
  const sheet = utils.aoa_to_sheet(parsed.data)
  return { SheetNames: [fileName.replace(/\.csv$/i, '') || 'DADOS'], Sheets: { [fileName.replace(/\.csv$/i, '') || 'DADOS']: sheet } }
}

export async function analyzeFile(file: File, options: { selectedSheet?: string; maxFileSizeMb?: number; mappingOverrides?: Partial<Record<CanonicalField, number | null>> } = {}): Promise<WorkbookAnalysis> {
  assertSafeFile(file, options.maxFileSizeMb)
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  const workbook = extension === '.csv' ? csvWorkbook(await file.text(), file.name) : read(await file.arrayBuffer(), { type: 'array', cellFormula: true, cellText: true, cellDates: false })
  const selectedSheet = options.selectedSheet && workbook.SheetNames.includes(options.selectedSheet) ? options.selectedSheet : workbook.SheetNames.includes('DADOS') ? 'DADOS' : workbook.SheetNames[0]
  const analyzed = analyzeSheet(workbook, selectedSheet, options.mappingOverrides)
  return { fileName: file.name, fileSize: file.size, sha256: await sha256(file), sheets: workbook.SheetNames, selectedSheet, ...analyzed, summary: summarizeRows(analyzed.rows) }
}
