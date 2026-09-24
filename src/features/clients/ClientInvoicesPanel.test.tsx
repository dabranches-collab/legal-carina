import {render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import {ClientInvoicesPanel} from './ClientInvoicesPanel'

const {readInvoiceFile}=vi.hoisted(()=>({readInvoiceFile:vi.fn()}))
vi.mock('./invoiceReading',()=>({readInvoiceFile,invoiceFileLimit:20*1024*1024}))

describe('ClientInvoicesPanel',()=>{
  beforeEach(()=>readInvoiceFile.mockReset().mockResolvedValue({mimeType:'application/pdf',pageCount:2,text:'FT 2026/100 Total 123,00 EUR',needsVisualRecognition:false}))

  it('lê uma factura e permite repartir por vários tipos',async()=>{
    const user=userEvent.setup()
    render(<ClientInvoicesPanel firmId="firm" clientId="client"/>)
    const file=new File(['factura'],'FT-100.pdf',{type:'application/pdf'})
    await user.upload(screen.getByLabelText('Escolher facturas'),file)
    await waitFor(()=>expect(readInvoiceFile).toHaveBeenCalledWith(file))
    expect(await screen.findByText('Leitura inicial concluída')).toBeVisible()
    expect(screen.getByText(/Texto disponível para interpretação/)).toBeVisible()
    await user.type(screen.getByLabelText('Número da factura'),'FT 2026/100')
    await user.click(screen.getByLabelText('Factura paga'))
    expect(screen.getByLabelText('Data do pagamento')).toBeEnabled()
    expect(screen.getByText(/passam também a/)).toHaveTextContent('Pagos')
    await user.click(screen.getByRole('button',{name:'Adicionar afectação'}))
    expect(screen.getAllByLabelText('Tipo de afectação')).toHaveLength(2)
    await user.selectOptions(screen.getAllByLabelText('Tipo de afectação')[1],'fixed_fee')
    expect(screen.getByLabelText('Montante de Trabalho a preço fixo')).toBeVisible()
  })

  it('identifica documentos que precisam de reconhecimento visual',async()=>{
    readInvoiceFile.mockResolvedValueOnce({mimeType:'image/png',pageCount:1,text:'',needsVisualRecognition:true})
    const user=userEvent.setup()
    render(<ClientInvoicesPanel firmId="firm" clientId="client"/>)
    await user.upload(screen.getByLabelText('Escolher facturas'),new File(['imagem'],'factura.png',{type:'image/png'}))
    expect(await screen.findByText(/necessita de reconhecimento visual/)).toBeVisible()
  })
})
