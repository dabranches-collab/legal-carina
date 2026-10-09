import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import * as XLSX from 'xlsx'
import { euro, noteCopy } from './model'
import type { Client, Note } from './model'

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 10000)
}
export async function exportNote(note: Note, client: Client, format: 'pdf' | 'word') {
  const copy = noteCopy[note.language]
  const lines = [copy.demo, copy.title, note.id + ' | v' + note.version, client.name, client.society, note.description, 'Total: ' + euro(note.amount), 'Provisão: ' + euro(note.provision), 'Recebido: ' + euro(note.received), 'Exemplo fictício. Não constitui factura nem recibo fiscal.']
  const filename = `carina-DEMO-${note.id}-v${note.version}-${note.language}`
  if (format === 'word') {
    const document = new Document({ sections: [{ children: lines.map((line, index) => new Paragraph({ children: [new TextRun({ text: line, bold: index < 2 })], spacing: { after: 180 } })) }] })
    download(await Packer.toBlob(document), filename + '.docx')
  } else {
    const pdf = new jsPDF()
    pdf.setProperties({ title: copy.title + ' — DEMO', author: 'Carina — Legal' })
    let y = 25
    for (const [i, line] of lines.entries()) {
      pdf.setFontSize(i === 1 ? 18 : 11)
      const wrapped = pdf.splitTextToSize(line.replaceAll('—', '-').replaceAll('’', "'"), 172)
      pdf.text(wrapped, 19, y); y += wrapped.length * 6 + 7
    }
    pdf.save(filename + '.pdf')
  }
}
export function exportExcel(rows: { client: string; activity: string; amount: number }[]) {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.map(row => ({ Cliente: row.client, Actividade: row.activity, Montante: row.amount }))), 'Movimentos DEMO')
  XLSX.writeFile(workbook, 'carina-movimentos-DEMO.xlsx')
}
