import { supabase } from '../../lib/supabase'

export type ExpenseAttachment = {
  id: string
  expense_id: string
  original_filename: string
  storage_path: string
  mime_type: string
  bytes: Uint8Array
}

type AttachmentRow = Omit<ExpenseAttachment, 'bytes'>

/** Fetch only documents belonging to the expenses included in this note. */
export async function loadExpenseAttachments(expenseIds: string[], includedIds?: string[]): Promise<ExpenseAttachment[]> {
  if ((!expenseIds.length && !includedIds?.length) || includedIds?.length === 0) return []
  if (!supabase) throw new Error('Ligação indisponível para obter os anexos das despesas.')
  const rows: AttachmentRow[] = []
  const lookupIds = expenseIds.length ? expenseIds : includedIds ?? []
  for (let offset = 0; offset < lookupIds.length; offset += 100) {
    const result = await supabase.from('work_entry_expense_documents')
      .select('id,expense_id,original_filename,storage_path,mime_type')
      .in(expenseIds.length ? 'expense_id' : 'id', lookupIds.slice(offset, offset + 100))
      .eq('status', 'active')
      .order('created_at').order('id')
    if (result.error) throw new Error('Não foi possível consultar os anexos das despesas.')
    rows.push(...(result.data as AttachmentRow[] ?? []))
  }
  const allowed = includedIds ? new Set(includedIds) : null
  const ordered = expenseIds.length ? expenseIds.flatMap(expenseId => rows.filter(row => row.expense_id === expenseId && (!allowed || allowed.has(row.id)))) : (includedIds ?? []).flatMap(id => rows.filter(row => row.id === id))
  if (allowed && ordered.length !== allowed.size) throw new Error('Falta um comprovativo desta nota. A emissão foi interrompida.')
  if (!ordered.length) return []
  const storage = supabase.storage.from('client-documents')
  const loaded: ExpenseAttachment[] = []
  for (let offset = 0; offset < ordered.length; offset += 4) {
    const batch = await Promise.all(ordered.slice(offset, offset + 4).map(async row => {
      const result = await storage.download(row.storage_path)
      if (result.error || !result.data) throw new Error(`Não foi possível obter o anexo «${row.original_filename}». A emissão foi interrompida.`)
      return { ...row, bytes: new Uint8Array(await result.data.arrayBuffer()) }
    }))
    loaded.push(...batch)
  }
  return loaded
}

/** The note comes first; each selected expense document follows in expense order. */
export async function appendExpenseAttachments(notePdf: ArrayBuffer | Uint8Array, attachments: ExpenseAttachment[], language: 'pt' | 'en' | 'fr' = 'pt'): Promise<Uint8Array> {
  if (!attachments.length) return new Uint8Array(notePdf)
  const { PDFDocument, PageSizes, StandardFonts, rgb } = await import('pdf-lib')
  const document = await PDFDocument.load(notePdf)
  const font = await document.embedFont(StandardFonts.Helvetica)
  for (const attachment of attachments) {
    const bytes = attachment.bytes
    try {
      if (attachment.mime_type === 'application/pdf') {
        const source = await PDFDocument.load(bytes)
        const pages = await document.copyPages(source, source.getPageIndices())
        if (!pages.length) throw new Error('PDF sem páginas')
        pages.forEach(page => document.addPage(page))
      } else if (attachment.mime_type === 'image/jpeg' || attachment.mime_type === 'image/png') {
        const image = attachment.mime_type === 'image/jpeg' ? await document.embedJpg(bytes) : await document.embedPng(bytes)
        const page = document.addPage(PageSizes.A4)
        const margin = 32
        const scale = Math.min((page.getWidth() - margin * 2) / image.width, (page.getHeight() - margin * 2) / image.height)
        page.drawImage(image, { x: (page.getWidth() - image.width * scale) / 2, y: (page.getHeight() - image.height * scale) / 2, width: image.width * scale, height: image.height * scale })
      } else if (attachment.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || attachment.mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        // Office files cannot be rendered faithfully by the browser. Keep the original
        // embedded in the PDF, with a clearly identified page for the recipient.
        await document.attach(bytes, attachment.original_filename, { mimeType: attachment.mime_type, description: 'Comprovativo de despesa incluído na nota de honorários' })
        const page = document.addPage(PageSizes.A4)
        const copy = {
          pt: ['Comprovativo de despesa', 'O ficheiro original está incorporado neste PDF.', 'Abra o painel de anexos do leitor de PDF para o consultar.'],
          en: ['Expense supporting document', 'The original file is embedded in this PDF.', 'Open the PDF reader attachment panel to view it.'],
          fr: ['Justificatif de dépense', 'Le fichier original est intégré dans ce PDF.', 'Ouvrez le panneau des pièces jointes du lecteur PDF.'],
        }[language]
        page.drawText(copy[0], { x: 48, y: 770, size: 16, font, color: rgb(0.1, 0.17, 0.27) })
        page.drawText(copy[1], { x: 48, y: 733, size: 11, font })
        page.drawText(copy[2], { x: 48, y: 716, size: 11, font })
        page.drawText(attachment.original_filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '?').slice(0, 75), { x: 48, y: 685, size: 11, font })
      } else {
        throw new Error('formato não suportado')
      }
    } catch {
      throw new Error(`O anexo «${attachment.original_filename}» não pôde ser integrado no PDF. A emissão foi interrompida.`)
    }
  }
  return document.save()
}

export function downloadCombinedPdf(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
