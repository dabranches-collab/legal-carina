import {describe,expect,it,vi} from 'vitest'
import {validateInvoiceFile} from './invoiceReading'

vi.mock('pdfjs-dist',()=>({GlobalWorkerOptions:{workerSrc:''},getDocument:vi.fn()}))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url',()=>({default:'worker.js'}))

const file=(name:string,body:number[],type:string)=>{
  const value=new File([new Uint8Array(body)],name,{type})
  Object.defineProperty(value,'size',{value:body.length})
  return value
}

describe('validateInvoiceFile',()=>{
  it('aceita facturas PDF e imagens pela assinatura real',()=>{
    const pdf=file('factura.pdf',[0x25,0x50,0x44,0x46,0x2d],'application/pdf')
    const jpg=file('factura.jpg',[0xff,0xd8,0xff],'image/jpeg')
    expect(validateInvoiceFile(pdf,new Uint8Array([0x25,0x50,0x44,0x46,0x2d]))).toBe('application/pdf')
    expect(validateInvoiceFile(jpg,new Uint8Array([0xff,0xd8,0xff]))).toBe('image/jpeg')
  })

  it('recusa extensões falsas e formatos não suportados',()=>{
    const fake=file('factura.pdf',[1,2,3],'application/pdf')
    const sheet=file('factura.xlsx',[0x50,0x4b],'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(validateInvoiceFile(fake,new Uint8Array([1,2,3]))).toMatch(/PDF, JPG ou PNG/)
    expect(validateInvoiceFile(sheet,new Uint8Array([0x50,0x4b]))).toMatch(/PDF, JPG ou PNG/)
  })
})
