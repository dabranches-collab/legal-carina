import csv from '../../test/fixtures/horas-anonimizadas.csv?raw'
import { expect, test } from 'vitest'
import { utils, write } from 'xlsx'
import { analyzeFile, assertSafeWorkbookBytes } from './analyzeFile'
import { validateRow } from './validation'

test('rejeita XLSX com conteúdo activo ou estrutura falsa',()=>{
  const container=(paths:string[])=>new TextEncoder().encode(`PK\u0003\u0004${paths.join('|')}`)
  expect(()=>assertSafeWorkbookBytes(new Uint8Array([0x25,0x50,0x44,0x46]))).toThrow(/XLSX válido/)
  expect(()=>assertSafeWorkbookBytes(container(['[Content_Types].xml','xl/workbook.xml','xl/vbaProject.bin']))).toThrow(/conteúdo activo/)
  expect(()=>assertSafeWorkbookBytes(container(['[Content_Types].xml','xl/workbook.xml','xl/externalLinks/externalLink1.xml']))).toThrow(/ligações externas/)
  expect(()=>assertSafeWorkbookBytes(container(['[Content_Types].xml','xl/workbook.xml']))).not.toThrow()
})

test('analisa um CSV completamente anonimizado e converte duração para minutos', async () => {
  const file = new File([csv], 'horas-anonimizadas.csv', { type: 'text/csv' })
  const result = await analyzeFile(file)
  expect(result.rows).toHaveLength(3)
  expect(result.rows[0].normalized.durationMinutes).toBe(30)
  expect(result.rows[0].normalized.clientType).toBe('company')
  expect(result.rows[0].normalized.invoiceDate).toBe('2026-03-02')
  expect(result.rows[0].normalized.archive).toBe('dossier')
  expect(result.rows[0].normalized.invoiced).toBe(true)
  expect(result.rows[0].normalized.paid).toBe(true)
  expect(result.summary.possibleDuplicates).toBe(2)
  expect(result.rows[0].issues.map(issue=>issue.code)).toContain('possible_duplicate')
  expect(result.summary.invalidRows).toBe(1)
  expect(result.sha256).toMatch(/^[a-f0-9]{64}$/)
})
test('analisa XLSX anonimizado, preserva fórmula e lê códigos da referência CLIENTES', async () => {
  const workbook = utils.book_new()
  const dados = utils.aoa_to_sheet([
    ['DATA', 'PART / SOC', 'CLIENTE', 'CÓDIGO CLIENTE', 'ACTIVIDADE', 'RESPONSÁVEL', 'DURAÇÃO', 'VALOR HORA', 'VALOR', 'SOCIEDADE FACTURA', 'STATUS', 'FACTURADO', 'DATA FACT', 'ARQUIVADO', 'PAGO', 'OBSERVAÇÕES', 'ANO', 'TEMPO TABELA'],
    [46082, 'SOCIEDADE', 'CLIENTE GAMA', 'CLI-003', 'Pesquisa', 'UTILIZADOR C', 1 / 24, 100, 100, 'SOCIEDADE TESTE', '', '', '', '', '', 'Sintético', 2026, 1 / 24],
  ])
  dados.D2 = { t: 's', v: 'CLI-003', f: 'VLOOKUP(C2,CLIENTES!$B$3:$C$4,2,0)' }
  dados.I2 = { t: 'n', v: 100, f: 'H2*G2*24' }
  const clientes = utils.aoa_to_sheet([])
  utils.sheet_add_aoa(clientes, [['CLIENTE GAMA', 'CLI-003'], ['CLIENTE DELTA', 'CLI-004']], { origin: 'B3' })
  utils.book_append_sheet(workbook, dados, 'DADOS')
  utils.book_append_sheet(workbook, clientes, 'CLIENTES')
  const file = new File([write(workbook, { type: 'array', bookType: 'xlsx' })], 'horas-anonimizadas.xlsx')
  const result = await analyzeFile(file)
  expect(result.knownClientCodes).toContain('CLI-003')
  expect(result.clientDirectory).toEqual(expect.arrayContaining([expect.objectContaining({name:'CLIENTE GAMA',code:'CLI-003'})]))
  expect(result.rows[0].cells.amount?.formula).toBe('H2*G2*24')
  expect(result.rows[0].normalized.durationMinutes).toBe(60)
  expect(result.rows[0].normalized.importedAmount).toBe(100)
  expect(result.rows[0].normalized.calculatedAmount).toBe(100)
  expect(result.rows[0].normalized.effectiveAmount).toBe(100)
  expect(result.rows[0].normalized.clientType).toBe('company')
  expect(result.rows[0].issues.map((issue) => issue.code)).not.toContain('unknown_client_code')
})

test('mantém vazio o valor importado quando apenas existe valor calculável',()=>{
  const row=validateRow(2,{
    date:{raw:'01/04/2026',text:'01/04/2026'},clientName:{raw:'CLIENTE TESTE',text:'CLIENTE TESTE'},clientCode:{raw:'T-2',text:'T-2'},
    activity:{raw:'Consulta',text:'Consulta'},responsible:{raw:'RESPONSÁVEL',text:'RESPONSÁVEL'},partyType:{raw:'PARTICULAR',text:'PARTICULAR'},duration:{raw:1/24,text:'01:00'},
    hourlyRate:{raw:120,text:'120'},amount:{raw:null,text:''},
  })
  expect(row.normalized.importedAmount).toBeUndefined()
  expect(row.normalized.calculatedAmount).toBe(120)
  expect(row.normalized.effectiveAmount).toBe(120)
})

test('distingue preço zero legítimo de preço ausente',()=>{
  const row=validateRow(3,{
    date:{raw:'02/04/2026',text:'02/04/2026'},clientName:{raw:'CLIENTE TESTE',text:'CLIENTE TESTE'},clientCode:{raw:'T-3',text:'T-3'},
    activity:{raw:'Pro bono',text:'Pro bono'},responsible:{raw:'RESPONSÁVEL',text:'RESPONSÁVEL'},partyType:{raw:'PARTICULAR',text:'PARTICULAR'},duration:{raw:1/24,text:'01:00'},
    hourlyRate:{raw:0,text:'0'},amount:{raw:0,text:'0',formula:'H3*G3*24'},
  })
  expect(row.normalized.hourlyRate).toBe(0)
  expect(row.normalized.importedAmount).toBe(0)
  expect(row.normalized.effectiveAmount).toBe(0)
  expect(row.issues.map(issue=>issue.code)).not.toContain('invalid_price')
})

test('preserva como misto um cliente que surge como Particular e Empresa',async()=>{
  const content='DATA,PART / SOC,CLIENTE,CÓDIGO CLIENTE,ACTIVIDADE,RESPONSÁVEL,DURAÇÃO,VALOR HORA,VALOR\n01/04/2026,PARTICULAR,CLIENTE MISTO,M-1,Consulta,RESPONSÁVEL,01:00,100,100\n02/04/2026,EMPRESA,CLIENTE MISTO,M-1,Reunião,RESPONSÁVEL,01:00,100,100'
  const result=await analyzeFile(new File([content],'clientes-mistos.csv',{type:'text/csv'}))
  expect(result.rows.map(row=>row.normalized.clientType)).toEqual(['individual','company'])
  expect(result.rows.every(row=>row.issues.some(issue=>issue.code==='client_category_conflict'))).toBe(true)
})

test('rejeita datas de calendário impossíveis e aceita duração HH:MM em CSV', () => {
  const row=validateRow(2,{
    date:{raw:'31/02/2026',text:'31/02/2026'},clientName:{raw:'CLIENTE TESTE',text:'CLIENTE TESTE'},clientCode:{raw:'T-1',text:'T-1'},
    activity:{raw:'Análise',text:'Análise'},responsible:{raw:'RESPONSÁVEL',text:'RESPONSÁVEL'},partyType:{raw:'EMPRESA',text:'EMPRESA'},duration:{raw:'01:30',text:'01:30'},
    hourlyRate:{raw:100,text:'100'},amount:{raw:150,text:'150'},
  })
  expect(row.normalized.durationMinutes).toBe(90)
  expect(row.issues.map(issue=>issue.code)).toContain('invalid_date')
  expect(row.issues.map(issue=>issue.code)).toContain('manual_amount')
})
