import csv from '../../test/fixtures/horas-anonimizadas.csv?raw'
import { expect, test } from 'vitest'
import { utils, write } from 'xlsx'
import { analyzeFile } from './analyzeFile'

test('analisa um CSV completamente anonimizado e converte duração para minutos', async () => {
  const file = new File([csv], 'horas-anonimizadas.csv', { type: 'text/csv' })
  const result = await analyzeFile(file)
  expect(result.rows).toHaveLength(3)
  expect(result.rows[0].normalized.durationMinutes).toBe(30)
  expect(result.rows[0].normalized.clientType).toBe('company')
  expect(result.summary.possibleDuplicates).toBe(2)
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
  expect(result.rows[0].cells.amount?.formula).toBe('H2*G2*24')
  expect(result.rows[0].normalized.durationMinutes).toBe(60)
  expect(result.rows[0].normalized.clientType).toBe('company')
  expect(result.rows[0].issues.map((issue) => issue.code)).not.toContain('unknown_client_code')
})
