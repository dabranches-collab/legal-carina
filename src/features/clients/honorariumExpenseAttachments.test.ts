import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { appendExpenseAttachments, loadExpenseAttachments, type ExpenseAttachment } from './honorariumExpenseAttachments'

const { from, download } = vi.hoisted(() => ({ from: vi.fn(), download: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: { from, storage: { from: () => ({ download }) } } }))

const pdfBytes = async (pages: number) => {
  const pdf = await PDFDocument.create()
  for (let index = 0; index < pages; index++) pdf.addPage()
  return new Uint8Array(await pdf.save())
}
const file = (id: string, expenseId: string, mimeType = 'application/pdf', bytes = new Uint8Array()): ExpenseAttachment => ({
  id, expense_id: expenseId, original_filename: `${id}.pdf`, storage_path: `synthetic/${id}`, mime_type: mimeType, bytes,
})

describe('comprovativos das despesas na Nota de Honorários', () => {
  beforeEach(() => { from.mockReset(); download.mockReset() })

  it('acrescenta apenas os anexos escolhidos, pela ordem das despesas, preservando todas as páginas de cada PDF', async () => {
    const note = await pdfBytes(1)
    const first = await pdfBytes(2)
    const second = await pdfBytes(1)
    const combined = await appendExpenseAttachments(note, [file('anexo-2', 'despesa-2', 'application/pdf', first), file('anexo-1', 'despesa-1', 'application/pdf', second)])
    expect((await PDFDocument.load(combined)).getPageCount()).toBe(4)
  })

  it('consulta e descarrega só os documentos das despesas da nota', async () => {
    const documents = [file('doc-1', 'despesa-1'), file('doc-2', 'despesa-2'), file('doc-3', 'despesa-fora')]
    from.mockImplementation(() => {
      const query = { select: () => query, in: () => query, eq: () => query, order: () => query, then: (resolve: (value: unknown) => void) => Promise.resolve({ data: documents, error: null }).then(resolve) }
      return query
    })
    download.mockResolvedValue({ data: new Blob([await pdfBytes(1)]), error: null })
    const result = await loadExpenseAttachments(['despesa-2', 'despesa-1'])
    expect(result.map(item => item.id)).toEqual(['doc-2', 'doc-1'])
    expect(download).toHaveBeenCalledTimes(2)
    expect(download).not.toHaveBeenCalledWith('synthetic/doc-3')
  })

  it('não emite um PDF incompleto quando falta um anexo guardado na nota', async () => {
    from.mockImplementation(() => {
      const query = { select: () => query, in: () => query, eq: () => query, order: () => query, then: (resolve: (value: unknown) => void) => Promise.resolve({ data: [], error: null }).then(resolve) }
      return query
    })
    await expect(loadExpenseAttachments(['despesa-1'], ['doc-em-falta'])).rejects.toThrow('Falta um comprovativo')
    expect(download).not.toHaveBeenCalled()
  })

  it('interrompe a emissão se o Storage não devolver um comprovativo seleccionado', async () => {
    from.mockImplementation(() => {
      const query = { select: () => query, in: () => query, eq: () => query, order: () => query, then: (resolve: (value: unknown) => void) => Promise.resolve({ data: [file('doc-1', 'despesa-1')], error: null }).then(resolve) }
      return query
    })
    download.mockResolvedValue({ data: null, error: new Error('indisponível') })
    await expect(loadExpenseAttachments(['despesa-1'])).rejects.toThrow('doc-1.pdf')
  })

  it('interrompe a geração se o PDF de um comprovativo estiver corrompido', async () => {
    await expect(appendExpenseAttachments(await pdfBytes(1), [file('corrompido', 'despesa-1', 'application/pdf', new Uint8Array([1, 2, 3]))])).rejects.toThrow('corrompido')
  })

  it('coloca imagens numa página própria e conserva os ficheiros Word e Excel incorporados', async () => {
    const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/LZkAAAAASUVORK5CYII=', 'base64'))
    const image = file('fotografia', 'despesa-1', 'image/png', png)
    const office = { ...file('tabela', 'despesa-2', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', new Uint8Array([80, 75, 3, 4])), original_filename: 'tabela.xlsx' }
    const word = { ...file('texto', 'despesa-3', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', new Uint8Array([80, 75, 3, 4])), original_filename: 'texto.docx' }
    const combined = await appendExpenseAttachments(await pdfBytes(1), [image, office, word])
    expect((await PDFDocument.load(combined)).getPageCount()).toBe(4)
  })
})
