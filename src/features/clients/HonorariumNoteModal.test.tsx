import { render,screen,waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach,describe,expect,it,vi } from 'vitest'
import { HonorariumNoteModal } from './HonorariumNoteModal'

const {rpc,from,provisionRpc}=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),provisionRpc:vi.fn()}))
vi.mock('../../lib/supabase',()=>({supabase:{rpc:(name:string,...args:unknown[])=>name==='get_client_credit_accounts'?provisionRpc(name,...args):rpc(name,...args),from}}))
const {pdfRect,pdfText,pdfAddPage,pdfSetPage,pdfState}=vi.hoisted(()=>({pdfRect:vi.fn(),pdfText:vi.fn(),pdfAddPage:vi.fn(),pdfSetPage:vi.fn(),pdfState:{pages:1}}))
vi.mock('jspdf',()=>({jsPDF:class{constructor(){pdfState.pages=1}setFont(){}setFontSize(){}text=pdfText;setFillColor(){}rect=pdfRect;addPage(){pdfState.pages+=1;pdfAddPage()}getNumberOfPages(){return pdfState.pages}setPage=pdfSetPage;setProperties(){}splitTextToSize(value:string){return value.length>80?[value.slice(0,40),value.slice(40,80),value.slice(80)]:[value]}output(){return new Blob(['pdf'],{type:'application/pdf'})}}}))
const downloads:string[]=[]
const query=(data:unknown)=>{const result={error:null,data};const chain:any={select:()=>chain,eq:()=>chain,in:()=>chain,order:()=>chain,range:()=>chain,maybeSingle:async()=>result,then:(resolve:(value:typeof result)=>void)=>Promise.resolve(result).then(resolve)};return chain}

describe('HonorariumNoteModal',()=>{
 beforeEach(()=>{provisionRpc.mockReset();provisionRpc.mockResolvedValue({data:[],error:null});vi.restoreAllMocks();downloads.length=0;vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){downloads.push(this.download)});rpc.mockReset();from.mockReset();pdfRect.mockReset();pdfText.mockReset();pdfAddPage.mockReset();pdfSetPage.mockReset();pdfState.pages=1;URL.createObjectURL=vi.fn(()=> 'blob:test');URL.revokeObjectURL=vi.fn();from.mockReturnValue(query(null));rpc.mockResolvedValue({error:null,data:{total:2,items:[
  {id:'one',work_date:'2026-07-03',activity_description:'Análise documental',duration_minutes:75,professional_name:'Responsável',billing_entity_name:'Sociedade'},
  {id:'two',work_date:'2026-06-30',activity_description:'Reunião',duration_minutes:30,professional_name:'Responsável',billing_entity_name:'Sociedade'},
 ]}})})
 it('consulta apenas movimentos não facturados e prepara só os seleccionados',async()=>{
  const user=userEvent.setup();render(<HonorariumNoteModal clientId="client-1" clientName="Cliente Teste" onClose={()=>{}}/> )
  expect(await screen.findByText('Análise documental')).toBeInTheDocument()
  await waitFor(()=>expect(rpc).toHaveBeenCalledWith('search_work_entries',expect.objectContaining({p_client_id:'client-1',p_invoiced:false,p_page_size:10000})))
  expect(document.querySelector('.overflow-x-auto table')).not.toHaveTextContent('Responsável')
  expect(screen.queryByLabelText('Responsável')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Valor')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Total de tempo')).toBeChecked()
  expect(screen.getByLabelText('Total monetário')).not.toBeChecked()
  expect(screen.getByText(/despesas associadas aos movimentos seleccionados/i)).toBeInTheDocument()
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
  expect(downloads).toEqual([expect.stringMatching(/^nota-honorarios-cliente-teste-\d{4}-\d{2}-\d{2}\.pdf$/)])
  expect(pdfText.mock.calls.some(([value,,,options])=>value==='07-2026'&&options?.align==='center')).toBe(true)
  expect(pdfText.mock.calls.some(([value,,,options])=>value==='1:15:00'&&options?.align==='center')).toBe(true)
 })
 it('emite uma nota, desconta a provisão uma vez e permite repetir o download',async()=>{
  provisionRpc.mockResolvedValue({data:[{id:'account',client_id:'client',society_name:'Sociedade',currency:'EUR',balance:1000}],error:null})
  rpc.mockImplementation(async(name:string)=>name==='issue_provision_honorarium_note'?{data:{id:'note',number:'NH-P-00000001',issued_at:'2026-09-02T12:00:00Z',subtotal:100,vat:23,total:123,deducted:123,remaining:0,balance_after:877},error:null}:{data:{total:1,items:[{id:'one',work_date:'2026-07-03',activity_description:'Análise documental',duration_minutes:60,billing_entity_name:'Sociedade',effective_amount:100}]},error:null})
  const user=userEvent.setup();render(<HonorariumNoteModal clientId="client" clientName="Cliente Sintético" onClose={()=>{}}/>)
  await user.click(await screen.findByLabelText('Seleccionar movimento de 2026-07-03'))
  await user.click(screen.getByRole('button',{name:'Emitir nota e descontar provisão'}))
  await screen.findByRole('button',{name:'Guardar novamente a nota'})
  expect(rpc.mock.calls.filter(([name])=>name==='issue_provision_honorarium_note')).toHaveLength(1)
  expect(rpc).toHaveBeenCalledWith('issue_provision_honorarium_note',expect.objectContaining({p_account_id:'account',p_work_entry_ids:['one'],p_expected_total:123,p_expected_deduction:123}))
  await user.click(screen.getByRole('button',{name:'Guardar novamente a nota'}))
  await waitFor(()=>expect(downloads).toHaveLength(2))
  expect(rpc.mock.calls.filter(([name])=>name==='issue_provision_honorarium_note')).toHaveLength(1)
  expect(pdfText.mock.calls.some(([text])=>String(text).includes('Provisão descontada: 123,00 EUR'))).toBe(true)
  expect(pdfText.mock.calls.some(([text])=>String(text).includes('Valor a pagar: 0,00 EUR'))).toBe(true)
  expect(pdfText.mock.calls.flatMap(([text])=>Array.isArray(text)?text:[text]).join(' ')).toContain('Não existe valor adicional a pagar nesta nota.')
  expect(screen.getByLabelText('Seleccionar movimento de 2026-07-03')).toBeDisabled()
 })
 it('exclui registos já incluídos numa nota com provisão descontada',async()=>{
  provisionRpc.mockResolvedValue({data:[{id:'account',society_name:'Sociedade',currency:'EUR',balance:877,noted_work_ids:['one']}],error:null})
  render(<HonorariumNoteModal clientId="client" clientName="Cliente Sintético" onClose={()=>{}}/>)
  await screen.findByLabelText('Seleccionar movimento de 2026-06-30')
  expect(screen.queryByLabelText('Seleccionar movimento de 2026-07-03')).not.toBeInTheDocument()
 })
 it('não volta a cobrar os registos de uma nota com provisão',async()=>{
  provisionRpc.mockResolvedValue({data:[{id:'account',society_name:'Sociedade',currency:'EUR',balance:0,noted_work_ids:['one']}],error:null})
  render(<HonorariumNoteModal clientId="client" clientName="Cliente Sintético" documentKind="collection" onClose={()=>{}}/>)
  await screen.findByLabelText('Seleccionar movimento de 2026-06-30')
  expect(screen.queryByLabelText('Seleccionar movimento de 2026-07-03')).not.toBeInTheDocument()
  expect(screen.getByText(/Consulte essas notas e o respectivo valor a pagar/)).toBeInTheDocument()
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
  expect(screen.queryByLabelText('Despesas')).not.toBeInTheDocument()
  await waitFor(()=>expect(rpc).toHaveBeenCalledWith('search_work_entries',expect.objectContaining({p_client_id:'client-2',p_invoiced:true,p_paid:false})))
  await user.click(screen.getByLabelText('Seleccionar movimento de 2026-07-03'))
  await user.click(screen.getByRole('button',{name:'Guardar PDF'}))
  await waitFor(()=>expect(URL.createObjectURL).toHaveBeenCalled())
  expect(downloads).toEqual([expect.stringMatching(/^cobranca-cliente-cobranca-\d{4}-\d{2}-\d{2}\.pdf$/)])
  expect(document.querySelector('.honorarium-print-area')).toHaveTextContent('COBRANÇA')
  expect(document.querySelector('.honorarium-print-area')).toHaveTextContent('Cliente: Cliente Cobrança')
  expect(pdfText.mock.calls.some(([value])=>value==='ASSUNTO: COBRANÇA')).toBe(true)
  expect(pdfText.mock.calls.some(([value])=>Array.isArray(value)&&value.join(' ').includes('permanecem por liquidar'))).toBe(true)
 })
 it.each(['honorarium','collection'] as const)('permite substituir destinatário e idioma no próprio documento %s',async(documentKind)=>{
  from.mockImplementation((table:string)=>query(table==='clients'?{legal_name:'Cliente Legal',address:'Lisboa',honorarium_language:'pt',honorarium_delivery_method:'email',honorarium_recipient_name:'Destinatário inicial',default_billing_entity_id:null}:null))
  const user=userEvent.setup();render(<HonorariumNoteModal clientId="client-override" clientName="Cliente Legal" documentKind={documentKind} onClose={()=>{}}/> )
  const recipient=await screen.findByLabelText('Destinatário do documento')
  await waitFor(()=>expect(recipient).toHaveValue('Destinatário inicial'))
  await user.clear(recipient);await user.type(recipient,'Destinatário específico')
  await user.selectOptions(screen.getByLabelText('Idioma do documento'),'fr')
  await user.click(screen.getByLabelText('Seleccionar movimento de 2026-07-03'))
  await user.click(screen.getByRole('button',{name:'Guardar PDF'}))
  expect(pdfText.mock.calls.some(([value])=>value==='Destinatário específico')).toBe(true)
  expect(pdfText.mock.calls.some(([value])=>value===(documentKind==='collection'?'OBJET : RELANCE DE PAIEMENT':"OBJET : HONORAIRES"))).toBe(true)
 })
 it('lista despesas persistentes sem as somar ao total da Nota de Honorários',async()=>{
  rpc.mockResolvedValueOnce({error:null,data:{total:1,items:[{id:'fee',work_date:'2026-07-03',activity_description:'Serviço com despesas',duration_minutes:60,professional_name:'Responsável',billing_entity_name:'Sociedade',effective_amount:100}]}})
  from.mockImplementation((table:string)=>query(table==='clients'?{legal_name:'Cliente Legal',address:'Lisboa',honorarium_language:'pt',honorarium_delivery_method:'email',honorarium_recipient_name:'Destinatário',default_billing_entity_id:'sociedade-1'}:table==='billing_entities'?{name:'Sociedade',legal_name:'Sociedade Legal',tax_number:'500000000',address:'Lisboa',phone:'210000000',bank_account_holder:'Sociedade Legal',bank_name:'Banco',bank_account_number:'1',iban:'PT50000000000000000000000',bic_swift:'BICPT',default_vat_rate:23,default_currency:'EUR'}:[{id:'expense-1',work_entry_id:'fee',amount:25,currency:'EUR',observations:'Certidões'}]))
  const user=userEvent.setup();render(<HonorariumNoteModal clientId="client-fees" clientName="Cliente Legal" onClose={()=>{}}/> )
  await user.selectOptions(await screen.findByLabelText('Idioma do documento'),'fr')
  await user.click(await screen.findByLabelText('Seleccionar movimento de 2026-07-03'))
  await user.click(screen.getByLabelText('Total monetário'))
  expect(document.querySelector('.honorarium-print-area')).toHaveTextContent('Frais informatifs — non inclus dans les totaux')
  expect(document.querySelector('.honorarium-print-area')).toHaveTextContent('PrestationMontantObservations')
  await user.click(screen.getByRole('button',{name:'Guardar PDF'}))
  const generatedText=pdfText.mock.calls.flatMap(([value])=>Array.isArray(value)?value:[String(value)]).join(' ')
  expect(generatedText).toContain('Certidões')
  expect(generatedText).toContain('Frais informatifs — non inclus dans les totaux')
  expect(generatedText).toContain('Prestation')
  expect(generatedText).toContain('123,00')
  expect(generatedText).not.toContain('148,00')
  expect(generatedText).toContain('IVA')
 })
 it('permite seleccionar várias contas e alterar o IVA apenas no documento',async()=>{
  rpc.mockResolvedValueOnce({error:null,data:{total:1,items:[{id:'bank-fee',work_date:'2026-07-03',activity_description:'Serviço bancário',duration_minutes:60,professional_name:'Responsável',billing_entity_name:'Sociedade',effective_amount:100}]}})
  from.mockImplementation((table:string)=>query(table==='clients'?{legal_name:'Cliente Bancário',address:'Lisboa',honorarium_language:'pt',honorarium_delivery_method:'email',honorarium_recipient_name:null,default_billing_entity_id:'sociedade-1'}:table==='billing_entities'?{name:'Sociedade',legal_name:'Sociedade Legal',tax_number:'500000000',address:'Lisboa',phone:'210000000',bank_account_holder:'Titular A',bank_name:'Banco A',bank_account_number:'1',iban:'PT50000000000000000000001',bic_swift:'BICAPTPL',bank_accounts:[{account_holder:'Titular A',bank_name:'Banco A',account_number:'1',iban:'PT50000000000000000000001',bic_swift:'BICAPTPL',currency:'EUR'},{account_holder:'Titular B',bank_name:'Banco B',account_number:'2',iban:'PT50000000000000000000002',bic_swift:'BICBPTPL',currency:'EUR'}],default_vat_rate:23,default_currency:'EUR'}:[]))
  const user=userEvent.setup();render(<HonorariumNoteModal clientId="client-bank" clientName="Cliente Bancário" onClose={()=>{}}/> )
  expect(await screen.findByText('Banco A')).toBeInTheDocument()
  const accounts=screen.getAllByRole('checkbox',{name:/Banco [AB]/})
  await waitFor(()=>expect(accounts[0]).toBeChecked());expect(accounts[1]).not.toBeChecked()
  await user.click(accounts[1]);await user.clear(screen.getByLabelText('IVA do documento'));await user.type(screen.getByLabelText('IVA do documento'),'10')
  await user.click(screen.getByLabelText('Seleccionar movimento de 2026-07-03'));await user.click(screen.getByRole('button',{name:'Guardar PDF'}))
  const generatedText=pdfText.mock.calls.flatMap(([value])=>Array.isArray(value)?value:[String(value)]).join(' ')
  expect(generatedText).toContain('PT50000000000000000000001');expect(generatedText).toContain('PT50000000000000000000002');expect(generatedText).toContain('110,00')
 })
 it('avisa também na cobrança quando faltam dados da sociedade emissora',async()=>{
  from.mockImplementation((table:string)=>query(table==='clients'?{legal_name:'Cliente Cobrança',address:'Lisboa',honorarium_language:'pt',honorarium_delivery_method:'email',honorarium_recipient_name:null,default_billing_entity_id:'sociedade-1'}:{name:'Sociedade',legal_name:'Sociedade Legal',tax_number:'500000000',address:'Lisboa',phone:null,bank_account_holder:null,bank_name:null,bank_account_number:null,iban:null,bic_swift:null,default_vat_rate:23,default_currency:'EUR'}))
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
 it.each([
  ['honorarium' as const,/^nota-honorarios-cliente-acores-teste-\d{4}-\d{2}-\d{2}\.pdf$/],
  ['collection' as const,/^cobranca-cliente-acores-teste-\d{4}-\d{2}-\d{2}\.pdf$/],
 ])('gera %s multipágina com todas as linhas, cabeçalhos e rodapés repetidos e nome seguro',async(documentKind,filePattern)=>{
  const manyRows=Array.from({length:90},(_,index)=>({id:`many-${index}`,work_date:`2026-${String(index%12+1).padStart(2,'0')}-15`,activity_description:`Intervenção sintética número ${index+1} com descrição suficiente para validar a paginação`,duration_minutes:15+(index%8)*15,professional_name:'Responsável',billing_entity_name:'Sociedade',effective_amount:10+index,status:'approved'}))
  rpc.mockResolvedValueOnce({error:null,data:{total:manyRows.length,items:manyRows}})
  from.mockImplementation((table:string)=>query(table==='clients'?{legal_name:'Cliente Açores Teste',address:'Ponta Delgada',honorarium_language:'pt',honorarium_delivery_method:'email',honorarium_recipient_name:null,default_billing_entity_id:'sociedade-1'}:table==='billing_entities'?{name:'Sociedade',legal_name:'Sociedade Legal',tax_number:'500000000',address:'Lisboa',phone:'210000000',bank_account_holder:'Sociedade Legal',bank_name:'Banco',bank_account_number:'1',iban:'PT50000000000000000000000',bic_swift:'BICPT',default_vat_rate:23,default_currency:'EUR'}:[]))
  const user=userEvent.setup();render(<HonorariumNoteModal clientId="client-many" clientName="Cliente Açores / Teste" documentKind={documentKind} onClose={()=>{}}/> )
  await user.click(await screen.findByLabelText(`Seleccionar todos os ${manyRows.length} movimentos`))
  await user.click(screen.getByRole('button',{name:'Guardar PDF'}))
  expect(pdfAddPage).toHaveBeenCalled()
  expect(pdfState.pages).toBeGreaterThan(1)
  expect(pdfSetPage).toHaveBeenCalledTimes(pdfState.pages)
  expect(pdfText.mock.calls.filter(([value])=>value==='Mês/Ano').length).toBe(pdfState.pages)
  expect(downloads).toEqual([expect.stringMatching(filePattern)])
 })
 it('permite reordenar as colunas admitidas e nunca oferece responsável nem valor por linha',async()=>{
  const user=userEvent.setup();render(<HonorariumNoteModal clientId="client-order" clientName="Cliente Ordem" onClose={()=>{}}/> )
  await user.click(await screen.findByLabelText('Seleccionar movimento de 2026-07-03'))
  expect(screen.queryByLabelText('Responsável')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Valor')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button',{name:'Mover Tempo para a esquerda'}))
  const headings=[...document.querySelectorAll('.honorarium-print-area thead th')].map(node=>node.textContent)
  expect(headings).toEqual(['Mês/Ano','Tempo','Descrição do movimento'])
  await user.click(screen.getByLabelText('Total de tempo'))
  expect(document.querySelector('.honorarium-print-area tfoot')).toBeNull()
 })
})
