import { render,screen,waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach,describe,expect,it,vi } from 'vitest'
import { HonorariumNoteModal } from './HonorariumNoteModal'

const {rpc,from}=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn()}))
vi.mock('../../lib/supabase',()=>({supabase:{rpc,from}}))
const {pdfRect,pdfText}=vi.hoisted(()=>({pdfRect:vi.fn(),pdfText:vi.fn()}))
vi.mock('jspdf',()=>({jsPDF:class{setFont(){}setFontSize(){}text=pdfText;setFillColor(){}rect=pdfRect;addPage(){}getNumberOfPages(){return 1}setPage(){}setProperties(){}splitTextToSize(value:string){return value.length>80?[value.slice(0,40),value.slice(40,80),value.slice(80)]:[value]}output(){return new Blob(['pdf'],{type:'application/pdf'})}}}))

describe('HonorariumNoteModal',()=>{
 beforeEach(()=>{rpc.mockReset();from.mockReset();pdfRect.mockReset();pdfText.mockReset();URL.createObjectURL=vi.fn(()=> 'blob:test');URL.revokeObjectURL=vi.fn();from.mockReturnValue({select:()=>({eq:()=>({maybeSingle:async()=>({error:null,data:null})})})});rpc.mockResolvedValue({error:null,data:{total:2,items:[
  {id:'one',work_date:'2026-07-03',activity_description:'Análise documental',duration_minutes:75,professional_name:'Responsável',billing_entity_name:'Sociedade'},
  {id:'two',work_date:'2026-06-30',activity_description:'Reunião',duration_minutes:30,professional_name:'Responsável',billing_entity_name:'Sociedade'},
 ]}})})
 it('consulta apenas movimentos não facturados e prepara só os seleccionados',async()=>{
  const user=userEvent.setup();render(<HonorariumNoteModal clientId="client-1" clientName="Cliente Teste" onClose={()=>{}}/> )
  expect(await screen.findByText('Análise documental')).toBeInTheDocument()
  await waitFor(()=>expect(rpc).toHaveBeenCalledWith('search_work_entries',expect.objectContaining({p_client_id:'client-1',p_invoiced:false,p_page_size:10000})))
  expect(document.querySelector('.overflow-x-auto table')).not.toHaveTextContent('Responsável')
  expect(screen.getByLabelText('Responsável')).not.toBeChecked()
  expect(screen.getByLabelText('Valor')).not.toBeChecked()
  expect(screen.getByLabelText('Total de tempo')).toBeChecked()
  expect(screen.getByLabelText('Total monetário')).not.toBeChecked()
  expect(screen.getByLabelText('Despesas')).toHaveValue(null)
  expect(screen.getByRole('button',{name:'Guardar PDF'})).toBeDisabled()
  await user.click(screen.getByLabelText('Seleccionar movimento de 2026-07-03'))
  expect(screen.getByRole('button',{name:'Guardar PDF'})).toBeEnabled()
  const printable=document.querySelector('.honorarium-print-area')!
  expect(printable).toHaveTextContent('Cliente: Cliente Teste')
  expect(printable).toHaveTextContent('NOTA DE HONORÁRIOS')
  expect(printable).toHaveTextContent('07-2026')
  expect(printable).toHaveTextContent('Análise documental')
  expect(printable).toHaveTextContent('1:15:00')
  expect(printable).not.toHaveTextContent('Reunião')
  await user.click(screen.getByRole('button',{name:'Guardar PDF'}))
  await waitFor(()=>expect(URL.createObjectURL).toHaveBeenCalled())
 })
 it('separa movimentos por sociedade emissora',async()=>{
  rpc.mockResolvedValueOnce({error:null,data:{total:2,items:[
   {id:'a',work_date:'2026-07-03',activity_description:'Movimento da Sociedade A',duration_minutes:60,professional_name:'Responsável',billing_entity_name:'Sociedade A'},
   {id:'b',work_date:'2026-07-04',activity_description:'Movimento da Sociedade B',duration_minutes:30,professional_name:'Responsável',billing_entity_name:'Sociedade B'},
  ]}})
  const user=userEvent.setup();render(<HonorariumNoteModal clientId="client-multi" clientName="Cliente Multi" onClose={()=>{}}/> )
  const issuerSelect=await screen.findByLabelText('Sociedade emissora do documento')
  await waitFor(()=>expect(issuerSelect).toHaveValue('Sociedade A'))
  expect(screen.getByText('Movimento da Sociedade A')).toBeInTheDocument()
  await waitFor(()=>expect(screen.queryByText('Movimento da Sociedade B')).not.toBeInTheDocument())
  await user.selectOptions(issuerSelect,'Sociedade B')
  expect(screen.queryByText('Movimento da Sociedade A')).not.toBeInTheDocument()
  expect(screen.getByText('Movimento da Sociedade B')).toBeInTheDocument()
 })
 it('carrega todas as páginas quando o cliente ultrapassa o limite da primeira resposta',async()=>{
  rpc.mockResolvedValueOnce({error:null,data:{total:3,pageSize:2,items:[
   {id:'p1-a',work_date:'2026-07-03',activity_description:'Primeira página A',duration_minutes:60,professional_name:'Responsável',billing_entity_name:'Sociedade'},
   {id:'p1-b',work_date:'2026-07-04',activity_description:'Primeira página B',duration_minutes:30,professional_name:'Responsável',billing_entity_name:'Sociedade'},
  ]}}).mockResolvedValueOnce({error:null,data:{total:3,pageSize:2,items:[
   {id:'p2',work_date:'2026-07-05',activity_description:'Segunda página',duration_minutes:15,professional_name:'Responsável',billing_entity_name:'Sociedade'},
  ]}})
  render(<HonorariumNoteModal clientId="client-pages" clientName="Cliente Paginado" onClose={()=>{}}/> )
  expect(await screen.findByText('Segunda página')).toBeInTheDocument()
  expect(rpc).toHaveBeenNthCalledWith(2,'search_work_entries',expect.objectContaining({p_client_id:'client-pages',p_page:2,p_page_size:10000}))
  expect(screen.getByText('Seleccionar todos os 3 movimentos')).toBeInTheDocument()
 })
 it('prepara a cobrança apenas com movimentos facturados e não pagos',async()=>{
  const user=userEvent.setup();render(<HonorariumNoteModal clientId="client-2" clientName="Cliente Cobrança" documentKind="collection" onClose={()=>{}}/> )
  expect(await screen.findByRole('heading',{name:'Cobrança · Cliente Cobrança'})).toBeInTheDocument()
  await waitFor(()=>expect(rpc).toHaveBeenCalledWith('search_work_entries',expect.objectContaining({p_client_id:'client-2',p_invoiced:true,p_paid:false})))
  await user.click(screen.getByLabelText('Seleccionar movimento de 2026-07-03'))
  await user.click(screen.getByRole('button',{name:'Guardar PDF'}))
  await waitFor(()=>expect(URL.createObjectURL).toHaveBeenCalled())
  expect(document.querySelector('.honorarium-print-area')).toHaveTextContent('COBRANÇA')
  expect(document.querySelector('.honorarium-print-area')).toHaveTextContent('Cliente: Cliente Cobrança')
  expect(pdfText.mock.calls.some(([value])=>value==='ASSUNTO: COBRANÇA')).toBe(true)
  expect(pdfText.mock.calls.some(([value])=>Array.isArray(value)&&value.join(' ').includes('permanecem por liquidar'))).toBe(true)
 })
 it('avisa também na cobrança quando faltam dados da sociedade emissora',async()=>{
  from.mockImplementation((table:string)=>({select:()=>({eq:()=>({maybeSingle:async()=>({error:null,data:table==='clients'?{legal_name:'Cliente Cobrança',address:'Lisboa',honorarium_language:'pt',honorarium_delivery_method:'email',honorarium_recipient_name:null,default_billing_entity_id:'sociedade-1'}:{name:'Sociedade',legal_name:'Sociedade Legal',tax_number:'500000000',address:'Lisboa',phone:null,bank_account_holder:null,bank_name:null,bank_account_number:null,iban:null,bic_swift:null,default_vat_rate:23,default_currency:'EUR'}})})})}))
  render(<HonorariumNoteModal clientId="client-warning" clientName="Cliente Cobrança" documentKind="collection" onClose={()=>{}}/> )
  expect(await screen.findByText(/Complete na ficha da sociedade:/)).toHaveTextContent('titular da conta, banco, IBAN, BIC / SWIFT')
 })
 it('exclui incobráveis da nota e da cobrança',async()=>{
  rpc.mockResolvedValue({error:null,data:{total:3,items:[
   {id:'normal',work_date:'2026-07-03',activity_description:'Movimento elegível',duration_minutes:60,professional_name:'Responsável',billing_entity_name:'Sociedade',status:'approved'},
   {id:'before',work_date:'2026-07-02',activity_description:'Incobrável antes de facturar',duration_minutes:30,professional_name:'Responsável',billing_entity_name:'Sociedade',status:'uncollectible_uninvoiced'},
   {id:'after',work_date:'2026-07-01',activity_description:'Incobrável depois de facturar',duration_minutes:30,professional_name:'Responsável',billing_entity_name:'Sociedade',status:'uncollectible_invoiced'},
  ]}})
  const {unmount}=render(<HonorariumNoteModal clientId="client-3" clientName="Cliente Teste" onClose={()=>{}}/> )
  expect(await screen.findByText('Movimento elegível')).toBeInTheDocument()
  expect(screen.queryByText('Incobrável antes de facturar')).not.toBeInTheDocument()
  unmount()
  render(<HonorariumNoteModal clientId="client-3" clientName="Cliente Teste" documentKind="collection" onClose={()=>{}}/> )
  expect(await screen.findByText('Movimento elegível')).toBeInTheDocument()
  expect(screen.queryByText('Incobrável depois de facturar')).not.toBeInTheDocument()
 })
 it('traduz cabeçalho, colunas e totais para inglês e francês',async()=>{
  const user=userEvent.setup();render(<HonorariumNoteModal clientId="client-lang" clientName="Cliente Teste" onClose={()=>{}}/> )
  await user.click(await screen.findByLabelText('Seleccionar movimento de 2026-07-03'))
  await user.click(screen.getByLabelText('Valor'))
  await user.click(screen.getByLabelText('Total monetário'))
  await user.selectOptions(screen.getByLabelText('Idioma do documento'),'en')
  expect(document.querySelector('.honorarium-print-area')).toHaveTextContent('FEE NOTE')
  expect(document.querySelector('.honorarium-print-area')).toHaveTextContent('Work description')
  expect(document.querySelector('.honorarium-print-area')).toHaveTextContent('Total amount')
  await user.selectOptions(screen.getByLabelText('Idioma do documento'),'fr')
  expect(document.querySelector('.honorarium-print-area')).toHaveTextContent("NOTE D'HONORAIRES")
  expect(document.querySelector('.honorarium-print-area')).toHaveTextContent('Description des prestations')
  expect(document.querySelector('.honorarium-print-area')).toHaveTextContent('Montant total')
 })
 it('aumenta a altura da linha do PDF quando a descrição ocupa várias linhas',async()=>{
  rpc.mockResolvedValueOnce({error:null,data:{total:1,items:[{id:'longa',work_date:'2026-07-03',activity_description:'Descrição muito longa destinada a ocupar várias linhas no documento PDF sem cortar, ocultar ou sobrepor o movimento seguinte.',duration_minutes:75,professional_name:'Responsável',billing_entity_name:'Sociedade',effective_amount:100}]}})
  const user=userEvent.setup();render(<HonorariumNoteModal clientId="client-long" clientName="Cliente Longo" onClose={()=>{}}/> )
  await user.click(await screen.findByLabelText('Seleccionar movimento de 2026-07-03'))
  await user.click(screen.getByRole('button',{name:'Guardar PDF'}))
  expect(pdfRect.mock.calls.some((call)=>Number(call[3])>8&&Number(call[3])!==9)).toBe(true)
 })
 it('permite reordenar colunas e desligar ambos os totais',async()=>{
  const user=userEvent.setup();render(<HonorariumNoteModal clientId="client-order" clientName="Cliente Ordem" onClose={()=>{}}/> )
  await user.click(await screen.findByLabelText('Seleccionar movimento de 2026-07-03'))
  await user.click(screen.getByLabelText('Responsável'))
  await user.click(screen.getByRole('button',{name:'Mover Responsável para a esquerda'}))
  const headings=[...document.querySelectorAll('.honorarium-print-area thead th')].map(node=>node.textContent)
  expect(headings).toEqual(['Mês/Ano','Descrição do movimento','Responsável','Tempo'])
  await user.click(screen.getByLabelText('Total de tempo'))
  expect(document.querySelector('.honorarium-print-area tfoot')).toBeNull()
 })
})
