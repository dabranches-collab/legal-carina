import { describe, expect, it } from 'vitest'
import { validateClientDocument } from './documentValidation'

const bytes=(...values:number[])=>new Uint8Array(values)
const zipLike=(content:string)=>new Uint8Array([0x50,0x4b,...new TextEncoder().encode(content)])

describe('validateClientDocument',()=>{
  it('aceita assinaturas válidas dos formatos simples',()=>{
    expect(validateClientDocument('documento.pdf',bytes(0x25,0x50,0x44,0x46,0x2d))).toBe('application/pdf')
    expect(validateClientDocument('imagem.JPG',bytes(0xff,0xd8,0xff))).toBe('image/jpeg')
    expect(validateClientDocument('imagem.png',bytes(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a))).toBe('image/png')
  })

  it('não confia apenas na extensão',()=>{
    expect(validateClientDocument('falso.pdf',new TextEncoder().encode('não é um PDF'))).toBeNull()
    expect(validateClientDocument('falso.png',bytes(0x89,0x50))).toBeNull()
    expect(validateClientDocument('executavel.exe',bytes(0x4d,0x5a))).toBeNull()
  })

  it('aceita documentos Office sem conteúdo activo',()=>{
    expect(validateClientDocument('texto.docx',zipLike('[Content_Types].xml word/document.xml'))).toContain('wordprocessingml')
    expect(validateClientDocument('folha.xlsx',zipLike('[Content_Types].xml xl/workbook.xml'))).toContain('spreadsheetml')
  })

  it('recusa macros e formatos Office trocados',()=>{
    expect(validateClientDocument('macro.docx',zipLike('[Content_Types].xml word/document.xml vbaProject.bin'))).toBeNull()
    expect(validateClientDocument('trocado.docx',zipLike('[Content_Types].xml xl/workbook.xml'))).toBeNull()
    expect(validateClientDocument('trocado.xlsx',zipLike('[Content_Types].xml word/document.xml'))).toBeNull()
  })
})
