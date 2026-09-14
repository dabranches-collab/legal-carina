import {describe,expect,it} from 'vitest'
import {displayDateToIso,formatDate,formatDateTime,maskDisplayDate} from './date'

describe('formato global de datas',()=>{
 it('apresenta datas ISO sem as deslocar por fuso horário',()=>{
  expect(formatDate('2026-09-14')).toBe('14-09-2026')
  expect(formatDate('2026-09-14T23:30:00Z')).toBe('14-09-2026')
 })
 it('converte a escrita DD-MM-AAAA para armazenamento ISO',()=>{
  expect(displayDateToIso('14-09-2026')).toBe('2026-09-14')
  expect(displayDateToIso('31-02-2026')).toBeNull()
  expect(maskDisplayDate('14092026')).toBe('14-09-2026')
 })
 it('mantém a hora no formato de 24 horas',()=>{
  const value=new Date(2026,8,14,7,5)
  expect(formatDateTime(value)).toBe('14-09-2026 07:05')
 })
 it('não inventa datas vazias ou inválidas',()=>{
  expect(formatDate('')).toBe('—')
  expect(formatDate('2026-02-31')).toBe('—')
 })
})
