import Papa from 'papaparse'
import { read, utils, type CellObject, type WorkBook, type WorkSheet } from 'xlsx'
import { canonicalFields, type CanonicalField, type CellSnapshot, type ClientDirectoryEntry, type WorkbookAnalysis } from './types'
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

export function assertSafeWorkbookBytes(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('O conteúdo não corresponde a um ficheiro XLSX válido.')
  const directory = new TextDecoder('latin1').decode(bytes)
  if (!directory.includes('[Content_Types].xml') || !directory.includes('xl/')) throw new Error('A estrutura interna do ficheiro XLSX é inválida.')
  if (/vbaProject\.bin|xl\/macrosheets|activeX|customUI|externalLinks/i.test(directory)) {
    throw new Error('O ficheiro contém macros, ligações externas ou conteúdo activo e não pode ser importado.')
  }
}

function findHeaderRow(sheet: WorkSheet): number {
  const range = utils.decode_range(sheet['!ref'] ?? 'A1:A1')
  for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 30); row += 1) {
    const values = Array.from({ length: range.e.c - range.s.c + 1 }, (_, offset) => text(sheet[utils.encode_cell({ r: row, c: range.s.c + offset })]).toUpperCase())
    if (values.includes('DATA') && values.includes('CLIENTE') && values.some((value) => value === 'ACTIVIDADE' || value === 'ATIVIDADE')) return row
  }
  return range.s.r
}

const normalizedHeader=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase()
const directoryClientType=(value:string):'individual'|'company'|undefined=>{
  const normalized=normalizedHeader(value)
  return normalized==='PARTICULAR'||normalized==='INDIVIDUAL'?'individual':normalized==='SOCIEDADE'||normalized==='EMPRESA'||normalized==='COMPANY'?'company':undefined
}

function extractClientDirectory(workbook: WorkBook): ClientDirectoryEntry[] {
  const sheet = workbook.Sheets.CLIENTES
  if (!sheet?.['!ref']) return []
  const range = utils.decode_range(sheet['!ref'])
  let nameColumn: number|undefined,codeColumn: number | undefined,categoryColumn:number|undefined
  let startRow=range.s.r+1
  for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 30); row += 1) {
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const value = normalizedHeader(text(sheet[utils.encode_cell({ r: row, c: column })]))
      if(value==='CLIENTE'||value==='NOME'||value==='NOME CLIENTE')nameColumn=column
      if (value.includes('CODIGO')) codeColumn = column
      if(value==='TIPO'||value==='CATEGORIA'||value.includes('PART / SOC'))categoryColumn=column
    }
    if (nameColumn!==undefined&&codeColumn !== undefined){startRow=row+1;break}
  }
  if (nameColumn===undefined||codeColumn === undefined) {
    const lookupFormula = Object.values(workbook.Sheets.DADOS ?? {}).find((cell) => typeof cell === 'object' && cell && 'f' in cell && typeof cell.f === 'string' && cell.f.includes('CLIENTES!')) as CellObject | undefined
    const lookupRange = lookupFormula?.f?.match(/CLIENTES!\$([A-Z]+)\$(\d+):\$([A-Z]+)\$(\d+)/i)
    if (!lookupRange) return []
    nameColumn=utils.decode_col(lookupRange[1])
    codeColumn = utils.decode_col(lookupRange[3])
    startRow=Number(lookupRange[2])-1
  }
  const entries:ClientDirectoryEntry[]=[]
  for(let row=startRow;row<=range.e.r;row+=1){
    const name=text(sheet[utils.encode_cell({r:row,c:nameColumn})]).trim(),code=text(sheet[utils.encode_cell({r:row,c:codeColumn})]).trim(),category=categoryColumn===undefined?'':text(sheet[utils.encode_cell({r:row,c:categoryColumn})]).trim()
    if(!name&&!code)continue
    entries.push({sourceRow:row+1,name,code,clientType:directoryClientType(category),original:{name,code,category}})
  }
  return entries
}

function analyzeSheet(workbook: WorkBook, selectedSheet: string, mappingOverrides?: Partial<Record<CanonicalField, number | null>>) {
  const sheet = workbook.Sheets[selectedSheet]
  if (!sheet?.['!ref']) throw new Error(`A folha ${selectedSheet} não contém dados.`)
  const range = utils.decode_range(sheet['!ref'])
  const headerRow = findHeaderRow(sheet)
  const headers = Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) => text(sheet[utils.encode_cell({ r: headerRow, c: range.s.c + index })]).trim())
  const mapping = { ...inferMapping(headers), ...mappingOverrides }
  const knownCodes = new Set(extractClientDirectory(workbook).map(client=>client.code).filter(Boolean))
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
  const content = await file.arrayBuffer()
  if (extension === '.xlsx') assertSafeWorkbookBytes(new Uint8Array(content))
  const workbook = extension === '.csv' ? csvWorkbook(new TextDecoder().decode(content), file.name) : read(content, { type: 'array', cellFormula: true, cellText: true, cellDates: false })
  const selectedSheet = options.selectedSheet && workbook.SheetNames.includes(options.selectedSheet) ? options.selectedSheet : workbook.SheetNames.includes('DADOS') ? 'DADOS' : workbook.SheetNames[0]
  const analyzed = analyzeSheet(workbook, selectedSheet, options.mappingOverrides)
  const fingerprintCounts=new Map<string,number>()
  analyzed.rows.forEach(row=>fingerprintCounts.set(row.fingerprint,(fingerprintCounts.get(row.fingerprint)??0)+1))
  const clientTypes=new Map<string,Set<string>>()
  analyzed.rows.forEach(row=>{const key=(row.cells.clientCode?.text||row.cells.clientName?.text||'').trim().toUpperCase();if(key&&row.normalized.clientType){const values=clientTypes.get(key)??new Set<string>();values.add(row.normalized.clientType);clientTypes.set(key,values)}})
  const rows=analyzed.rows.map(row=>{
    const issues=[...row.issues],clientKey=(row.cells.clientCode?.text||row.cells.clientName?.text||'').trim().toUpperCase()
    if((fingerprintCounts.get(row.fingerprint)??0)>1)issues.push({severity:'warning' as const,code:'possible_duplicate',message:'Existe outra linha equivalente neste ficheiro.'})
    if((clientTypes.get(clientKey)?.size??0)>1)issues.push({severity:'warning' as const,code:'client_category_conflict',message:'O cliente surge com vertente Particular e Empresa; serão preservados ambos os perfis.'})
    return {...row,issues}
  })
  const digest = await crypto.subtle.digest('SHA-256', content)
  const contentHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  return { fileName: file.name, fileSize: file.size, sha256: contentHash, sheets: workbook.SheetNames, selectedSheet, ...analyzed, rows, clientDirectory:extractClientDirectory(workbook), summary: summarizeRows(rows) }
}
