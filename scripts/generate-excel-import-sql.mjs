import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { read, SSF, utils } from 'xlsx'

const [sourcePath, outputPath, rollbackPath] = process.argv.slice(2)
if (!sourcePath || !outputPath || !rollbackPath) throw new Error('Uso: node generate-excel-import-sql.mjs <xlsx> <sql-output> <rollback-output>')

const bytes = readFileSync(sourcePath)
const fileHash = createHash('sha256').update(bytes).digest('hex')
const workbook = read(bytes, { type: 'buffer', cellFormula: true, cellText: true, cellDates: false })
const sheet = workbook.Sheets.DADOS
if (!sheet?.['!ref']) throw new Error('Folha DADOS inexistente ou vazia.')

const columns = ['DATA', 'PART / SOC', 'CLIENTE', 'CÓDIGO CLIENTE', 'ACTIVIDADE', 'RESPONSÁVEL', 'DURAÇÃO', 'VALOR HORA', 'VALOR', 'SOCIEDADE FACTURA', 'STATUS', 'FACTURADO', 'DATA FACT', 'ARQUIVADO', 'PAGO', 'OBSERVAÇÕES', 'ANO', 'TEMPO TABELA']
const at = (row, column) => sheet[utils.encode_cell({ r: row, c: column })]
const display = (cell) => cell?.w ?? (cell?.v == null ? '' : String(cell.v))
const number = (cell) => typeof cell?.v === 'number' && Number.isFinite(cell.v) ? cell.v : Number(String(cell?.v ?? '').replace(',', '.'))
const yes = (cell) => ['√', 'SIM', 'S', 'TRUE', '1'].includes(display(cell).trim().toUpperCase())
const date = (cell) => {
  if (typeof cell?.v === 'number') {
    const value = SSF.parse_date_code(cell.v)
    if (value) return `${value.y}-${String(value.m).padStart(2, '0')}-${String(value.d).padStart(2, '0')}`
  }
  const match = display(cell).trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : null
}
const snapshot = (cell) => cell ? { raw: cell.v ?? null, text: display(cell), type: cell.t ?? null, formula: cell.f ?? null } : { raw: null, text: '', type: null, formula: null }
const sql = (value) => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const json = (value) => `${sql(JSON.stringify(value))}::jsonb`
const num = (value) => Number.isFinite(value) ? String(value) : 'null'
const bool = (value) => value ? 'true' : 'false'
const roundMoney = (value) => Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 100) / 100 : null
const chunk = (items, size = 100) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))

const range = utils.decode_range(sheet['!ref'])
const rows = []
for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex += 1) {
  const cells = columns.map((_, column) => at(rowIndex, column))
  const workDate = date(cells[0])
  const clientName = display(cells[2]).trim()
  const activity = display(cells[4]).trim()
  if (!display(cells[0]).trim() || !clientName || !activity) continue
  const fraction = number(cells[6])
  const durationMinutes = Number.isFinite(fraction) ? Math.round(fraction * 1440) : null
  const hourlyRate = number(cells[7])
  const importedAmount = number(cells[8])
  rows.push({
    sourceRow: rowIndex + 1,
    id: randomUUID(),
    workEntryId: randomUUID(),
    workDate,
    clientName,
    clientCode: display(cells[3]).trim(),
    category: display(cells[1]).trim().toUpperCase(),
    activity,
    professional: display(cells[5]).trim(),
    durationMinutes,
    hourlyRate,
    importedAmount,
    billingEntity: display(cells[9]).trim(),
    invoiced: yes(cells[11]),
    invoiceDate: date(cells[12]),
    paid: yes(cells[14]),
    archive: display(cells[13]).trim().toUpperCase(),
    observations: display(cells[15]).trim(),
    raw: Object.fromEntries(columns.map((name, index) => [name, snapshot(cells[index])])),
  })
}

const invalid = (row) => !row.workDate || !Number.isInteger(row.durationMinutes) || row.durationMinutes < 1 || !Number.isFinite(row.hourlyRate) || row.hourlyRate < 0 || !Number.isFinite(row.importedAmount) || row.importedAmount < 0 || !row.clientCode || !row.professional
const fingerprint = (row) => [row.workDate, row.clientCode, row.activity, row.durationMinutes, row.professional].map((value) => String(value ?? '').trim().toUpperCase()).join('|')
const fingerprintCount = new Map()
for (const row of rows) fingerprintCount.set(fingerprint(row), (fingerprintCount.get(fingerprint(row)) ?? 0) + 1)
const categoriesByCode = new Map()
for (const row of rows) {
  if (!categoriesByCode.has(row.clientCode)) categoriesByCode.set(row.clientCode, new Set())
  if (row.category) categoriesByCode.get(row.clientCode).add(row.category)
}
const conflictCodes = new Set([...categoriesByCode].filter(([, categories]) => categories.size > 1).map(([code]) => code))
const warnings = (row) => [
  fingerprintCount.get(fingerprint(row)) > 1 ? 'possible_duplicate' : null,
  row.invoiced && !row.invoiceDate ? 'invoiced_without_invoice_date' : null,
  row.paid && !row.invoiced ? 'paid_without_invoiced' : null,
  conflictCodes.has(row.clientCode) ? 'client_category_conflict' : null,
].filter(Boolean)
const errors = (row) => [
  !row.workDate ? 'invalid_date' : null,
  (!Number.isInteger(row.durationMinutes) || row.durationMinutes < 1) ? 'invalid_duration' : null,
  (!Number.isFinite(row.hourlyRate) || row.hourlyRate < 0) ? 'invalid_hourly_rate' : null,
  (!Number.isFinite(row.importedAmount) || row.importedAmount < 0) ? 'invalid_amount' : null,
  !row.clientCode ? 'missing_client_code' : null,
  !row.professional ? 'missing_professional' : null,
].filter(Boolean)

const latestByCode = new Map()
for (const row of [...rows].sort((a, b) => String(a.workDate).localeCompare(String(b.workDate)))) latestByCode.set(row.clientCode, row)
const clients = [...latestByCode.values()].map((row) => ({
  id: randomUUID(), code: row.clientCode, name: row.clientName,
  type: row.category === 'SOCIEDADE' ? 'company' : 'individual',
}))
const clientId = new Map(clients.map((client) => [client.code, client.id]))
const professionals = [...new Set(rows.map((row) => row.professional).filter(Boolean))].map((name) => ({ id: randomUUID(), name }))
const professionalId = new Map(professionals.map((item) => [item.name, item.id]))
const billingEntities = [...new Set(rows.map((row) => row.billingEntity).filter(Boolean))].map((name) => ({ id: randomUUID(), name }))
const billingEntityId = new Map(billingEntities.map((item) => [item.name, item.id]))
const batchId = randomUUID()
const validRows = rows.filter((row) => !invalid(row))
const warningRows = validRows.filter((row) => warnings(row).length > 0).length
const cleanRows = validRows.length - warningRows

const statements = ['begin;', `do $$ begin if (select count(*) from public.law_firms) <> 1 then raise exception 'Expected exactly one law firm'; end if; if exists (select 1 from public.imports where file_hash = ${sql(fileHash)}) then raise exception 'File already imported'; end if; end $$;`]
statements.push(`insert into public.imports (id, firm_id, original_filename, file_hash, file_size, status, total_rows, valid_rows, warning_rows, invalid_rows, duplicate_rows, imported_by, started_at) values (${sql(batchId)}::uuid, (select id from public.law_firms limit 1), ${sql(sourcePath.split(/[\\/]/).pop())}, ${sql(fileHash)}, ${bytes.length}, 'importing', ${rows.length}, ${cleanRows}, ${warningRows}, ${rows.length - validRows.length}, ${rows.filter((row) => fingerprintCount.get(fingerprint(row)) > 1).length}, (select user_id from public.firm_members where active order by case when role='owner' then 0 else 1 end limit 1), now());`)

for (const group of chunk(clients)) statements.push(`insert into public.clients (id, firm_id, client_code, client_type, display_name) values\n${group.map((item) => `(${sql(item.id)}::uuid,(select id from public.law_firms limit 1),${sql(item.code)},${sql(item.type)},${sql(item.name)})`).join(',\n')};`)
for (const group of chunk(professionals)) statements.push(`insert into public.professionals (id, firm_id, display_name) values\n${group.map((item) => `(${sql(item.id)}::uuid,(select id from public.law_firms limit 1),${sql(item.name)})`).join(',\n')};`)
for (const group of chunk(billingEntities)) statements.push(`insert into public.billing_entities (id, firm_id, name) values\n${group.map((item) => `(${sql(item.id)}::uuid,(select id from public.law_firms limit 1),${sql(item.name)})`).join(',\n')};`)

for (const group of chunk(rows, 50)) statements.push(`insert into public.import_rows (id, firm_id, import_id, sheet_name, source_row_number, raw_data, normalized_data, validation_errors, validation_warnings, row_hash, status) values\n${group.map((row) => {
  const rowWarnings = warnings(row)
  const rowErrors = errors(row)
  const normalized = { workDate: row.workDate, clientCode: row.clientCode, clientType: row.category, durationMinutes: row.durationMinutes, hourlyRate: Number.isFinite(row.hourlyRate) ? row.hourlyRate : null, importedAmount: Number.isFinite(row.importedAmount) ? row.importedAmount : null, invoiced: row.invoiced, invoiceDate: row.invoiceDate, paid: row.paid, archive: row.archive }
  const rowHash = createHash('sha256').update(`${fileHash}|DADOS|${row.sourceRow}|${JSON.stringify(row.raw)}`).digest('hex')
  return `(${sql(row.id)}::uuid,(select id from public.law_firms limit 1),${sql(batchId)}::uuid,'DADOS',${row.sourceRow},${json(row.raw)},${json(normalized)},${json(rowErrors)},${json(rowWarnings)},${sql(rowHash)},${sql(rowErrors.length ? 'invalid' : rowWarnings.length ? 'warning' : 'valid')})`
}).join(',\n')};`)

const archive = (value) => ({ GAVETA: 'gaveta', DOSSIER: 'dossier', FINDOS: 'findos' })[value] ?? null
for (const group of chunk(validRows, 100)) statements.push(`insert into public.work_entries (id, firm_id, work_date, client_id, professional_id, billing_entity_id, activity_description, duration_minutes, imported_duration_minutes, imported_hourly_rate, calculated_hourly_rate, effective_hourly_rate, imported_amount, calculated_amount, effective_amount, currency, status, is_billable, is_invoiced, invoice_date, is_paid, archive_status, observations, source_type, import_row_id, created_by, has_historical_state_exception) values\n${group.map((row) => {
  const calculated = roundMoney(row.hourlyRate * row.durationMinutes / 60)
  const effective = roundMoney(row.importedAmount)
  const exception = (row.invoiced && !row.invoiceDate) || (row.paid && !row.invoiced)
  const status = row.paid ? 'paid' : row.invoiced ? 'invoiced' : 'approved'
  return `(${sql(row.workEntryId)}::uuid,(select id from public.law_firms limit 1),${sql(row.workDate)}::date,${sql(clientId.get(row.clientCode))}::uuid,${sql(professionalId.get(row.professional))}::uuid,${billingEntityId.has(row.billingEntity) ? `${sql(billingEntityId.get(row.billingEntity))}::uuid` : 'null'},${sql(row.activity)},${row.durationMinutes},${row.durationMinutes},${num(roundMoney(row.hourlyRate))},${num(calculated)},${num(roundMoney(row.hourlyRate))},${num(effective)},${num(calculated)},${num(effective)},'EUR',${sql(status)},true,${bool(row.invoiced)},${row.invoiceDate ? `${sql(row.invoiceDate)}::date` : 'null'},${bool(row.paid)},${sql(archive(row.archive))},${sql(row.observations || null)},'xlsx',${sql(row.id)}::uuid,(select user_id from public.firm_members where active order by case when role='owner' then 0 else 1 end limit 1),${bool(exception)})`
}).join(',\n')};`)

for (const group of chunk(validRows, 500)) statements.push(`update public.import_rows as target set work_entry_id = source.work_entry_id, status = 'imported' from (values ${group.map((row) => `(${sql(row.id)}::uuid,${sql(row.workEntryId)}::uuid)`).join(',')}) as source(import_row_id,work_entry_id) where target.id=source.import_row_id;`)
statements.push(`update public.imports set status='completed', completed_at=now() where id=${sql(batchId)}::uuid;`, 'commit;')

writeFileSync(outputPath, statements.join('\n\n'), { encoding: 'utf8', flag: 'wx' })
const uuidList = (items) => items.map((item) => `${sql(item.id)}::uuid`).join(',') || 'null::uuid'
writeFileSync(rollbackPath, [
  'begin;',
  `delete from public.work_entries where import_row_id in (select id from public.import_rows where import_id=${sql(batchId)}::uuid);`,
  `delete from public.import_rows where import_id=${sql(batchId)}::uuid;`,
  `delete from public.imports where id=${sql(batchId)}::uuid;`,
  `delete from public.clients where id in (${uuidList(clients)});`,
  `delete from public.professionals where id in (${uuidList(professionals)});`,
  `delete from public.billing_entities where id in (${uuidList(billingEntities)});`,
  'commit;',
].join('\n'), { encoding: 'utf8', flag: 'wx' })
console.log(JSON.stringify({ batchId, fileHash, totalRows: rows.length, cleanRows, warningRows, importableRows: validRows.length, invalidRows: rows.length - validRows.length, clients: clients.length, professionals: professionals.length, billingEntities: billingEntities.length }))
