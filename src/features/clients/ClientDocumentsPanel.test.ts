import { describe,expect,it } from 'vitest'
import { validateClientDocument } from './documentValidation'

const bytes=(...values:number[])=>new Uint8Array(values)
const zip=(paths:string[])=>new TextEncoder().encode(`PK\u0003\u0004${paths.join('|')}`)

describe('validação de documentos de cliente',()=>{
  it('aceita assinaturas coerentes de PDF, JPEG e PNG',()=>{
    expect(validateClientDocument('doc.pdf',bytes(0x25,0x50,0x44,0x46,0x2d))).toBe('application/pdf')
    expect(validateClientDocument('foto.jpg',bytes(0xff,0xd8,0xff))).toBe('image/jpeg')
    expect(validateClientDocument('foto.png',bytes(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a))).toBe('image/png')
  })

  it('rejeita extensão falsa e conteúdo macro',()=>{
    expect(validateClientDocument('falso.pdf',bytes(0x50,0x4b))).toBeNull()
    expect(validateClientDocument('macro.xlsx',zip(['[Content_Types].xml','xl/workbook.xml','xl/vbaProject.bin']))).toBeNull()
  })

  it('distingue DOCX de XLSX pelo conteúdo OOXML',()=>{
    expect(validateClientDocument('texto.docx',zip(['[Content_Types].xml','word/document.xml']))).toContain('wordprocessingml')
    expect(validateClientDocument('horas.xlsx',zip(['[Content_Types].xml','xl/workbook.xml']))).toContain('spreadsheetml')
    expect(validateClientDocument('troca.docx',zip(['[Content_Types].xml','xl/workbook.xml']))).toBeNull()
  })
})
