import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./lib/supabase', () => ({
  supabase: {
   from: vi.fn(() => ({ select: () => ({ eq: () => ({ order: async () => ({ data:[],error:null }),in: () => ({ limit: () => ({ maybeSingle: async () => ({ data:{ firm_id:'firm-1',role:'owner' },error:null }) }) }) }) }) })),
   functions: { invoke: vi.fn(async () => ({ data:{ users:[{userId:'user-1',email:'admin@example.test',role:'owner',active:true,invitedAt:'2026-01-01',lastSignInAt:null}] },error:null })) },
   rpc: vi.fn(async (name:string, args?:{p_kind?:string}) => {
    if (name === 'get_dashboard_overview') return { error:null, data:{ metrics:{minutes:120,worked:200,invoiced:150,paid:100,receivable:50,uninvoicedCount:1,unpaidCount:1,averageRate:100,activeClients:1,missingPrice:0,overrides:0,importErrors:1}, annual:[{label:2026,value:200,minutes:120}],monthly:[{label:4,value:200}],latestYear:2026,byClient:[{label:'Cliente Atlas',value:200}],byBilling:[{label:'Carina Santos',value:200}],byProfessional:[{label:'Carina',value:200}],byArchive:[{label:'dossier',value:1}],clientTypes:[{label:'company',value:1}] } }
    if (name === 'get_dashboard_metric_breakdowns') return { error:null,data:[{society:'Carina Santos',minutes:120,worked:200,invoiced:150,paid:100,receivable:50,uninvoicedCount:1,unpaidCount:1,averageRate:100,activeClients:1,missingPrice:0,missingBilling:0}] }
    if (name === 'get_client_category_summaries') return { error:null,data:[{category:'individual',clients:1,movements:1,minutes:120,total:200,invoiced:150},{category:'company',clients:1,movements:1,minutes:120,total:200,invoiced:150},{category:'mixed',clients:0,movements:0,minutes:0,total:0,invoiced:0}] }
    if (name === 'get_professional_landing_summaries') return { error:null,data:[{id:'1',name:'Carina',minutes:120,total:200,invoiced:150,clients:1,uninvoiced:1,unpaid:1,missingPrice:0}] }
    if (name === 'search_work_entries') return { error:null,data:{items:[{id:'LC-1048',work_date:'2026-04-07',client_name:'Cliente Atlas',client_code:'C-0142',activity_description:'Consulta',professional_name:'Carina',duration_minutes:90,effective_hourly_rate:120,effective_amount:180,billing_entity_name:'Carina Santos',is_invoiced:false,invoice_date:null,is_paid:false,archive_status:'dossier',source_type:'xlsx',has_manual_override:false,has_historical_state_exception:false,validation_warnings:[]}],total:1,page:1,pageSize:25,professionals:[],billingEntities:[]} }
    if (name === 'get_work_attention_counts') return { error:null,data:{missing_society:47,missing_price:665,uninvoiced:796,unpaid:487,historical:248,retainer:3} }
    if (name === 'export_visible_work_entries') return { error:null,data:[{id:'LC-1048',work_date:'2026-04-07',client_name:'Cliente Atlas',client_code:'C-0142',matter_code:null,matter_title:null,activity_description:'Consulta',professional_name:'Carina',duration_minutes:90,effective_hourly_rate:120,effective_amount:180,billing_entity_name:'Carina Santos',is_invoiced:false,invoice_date:null,is_paid:false,archive_status:'dossier',observations:null,source_type:'xlsx',has_manual_override:false,has_historical_state_exception:false,validation_warnings:[]}] }
    if (name === 'get_work_entry_form_options') return { error:null,data:{societies:[{id:'soc-1',name:'Carina Santos'}],clientProfiles:[{id:'profile-1',client_id:'client-1',client_type:'company',client_code:'C-0142',display_name:'Cliente Atlas'}],responsibles:[{id:'professional-1',display_name:'Carina'}],processes:[]} }
    const titles:Record<string,string>={client:'Cliente Atlas',billing:'Carina Santos',professional:'Carina'}
    return { error:null, data:{selectedId:'1',options:[{id:'1',label:titles[args?.p_kind??'client']}],identity:{title:titles[args?.p_kind??'client'],subtitle:'Activo',code:''},metrics:{minutes:120,total:200,invoiced:150,paid:100,pending:50,averageRate:100,movements:1,clients:1,professionals:1,billingEntities:1},annual:[{label:2026,value:200}],monthly:[{label:4,value:200}],recent:[]} }
  }) },
}))
import { AuthenticatedApplication as App } from './App'
import { AuthContext } from './features/auth/AuthContext'
import { supabase } from './lib/supabase'

const renderApp=(role:'owner'|'admin'|'operator'='owner')=>render(<AuthContext.Provider value={{user:null,role,signOut:async()=>undefined,updatePassword:async()=>false,enrollPasskey:async()=>null}}><App/></AuthContext.Provider>)

describe('interface principal', () => {
  it('apresenta navegação, cabeçalho e indicadores da visão geral', async () => {
    renderApp()
    expect(screen.getByRole('complementary', { name: 'Navegação principal' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Localização' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actualizar dados apresentados' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Activar modo escuro' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Localização' })).getByText('Visão Geral')).toBeInTheDocument()
    expect(await screen.findByText('Valor trabalhado')).toBeInTheDocument()
  })

  it('navega para os registos sem edição em massa e mostra pendências', async () => {
    renderApp()
    await userEvent.click(screen.getByRole('button', { name: 'Registos' }))
    expect(within(screen.getByRole('navigation', { name: 'Localização' })).getByText('Registos')).toBeInTheDocument()
    expect(
      await screen.findByRole('table', { name: 'Registos de trabalho' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(vi.mocked(supabase!.rpc)).toHaveBeenCalledWith('search_work_entries',expect.objectContaining({p_sort:'work_date',p_direction:'desc'}))
    expect(screen.queryByRole('checkbox', { name: 'Seleccionar LC-1048' })).not.toBeInTheDocument()
    expect(await screen.findByLabelText('47 registos')).toHaveTextContent('47')
    expect(screen.getByLabelText('665 registos')).toHaveTextContent('665')
    expect(screen.getByLabelText('796 registos')).toHaveTextContent('796')
    expect(screen.getByLabelText('487 registos')).toHaveTextContent('487')
    expect(screen.getByLabelText('248 registos')).toHaveTextContent('248')
    expect(screen.getByLabelText('3 registos')).toHaveTextContent('3')
    await userEvent.click(screen.getByRole('button',{name:'Criar movimento'}))
    expect(await screen.findByRole('dialog',{name:'Criar movimento'})).toBeInTheDocument()
    expect(screen.getByText(/preço e o valor são resolvidos no backend/i)).toBeInTheDocument()
  }, 15000)

  it('abre os dashboards de entrada de clientes, sociedades e responsáveis', async () => {
    renderApp()
    await userEvent.click(screen.getAllByRole('button',{name:'Clientes'})[0])
    expect(await screen.findByRole('heading',{name:'Particulares'})).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button',{name:'Particulares'}))
    expect(await screen.findByRole('heading',{name:'Cliente Atlas',level:2})).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Sociedades' })[0])
    expect(within(screen.getByRole('navigation', { name: 'Localização' })).getByText('Sociedades')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Responsáveis' })[0])
    expect(within(screen.getByRole('navigation', { name: 'Localização' })).getByText('Responsáveis')).toBeInTheDocument()
  })

  it('mantém utilizadores dentro da Administração', async () => {
    renderApp()
    await userEvent.click(screen.getByRole('button', { name: 'Definições' }))
    await userEvent.click(screen.getByRole('button', { name: 'Administração' }))
    expect(await screen.findByRole('navigation', { name: 'Administração' })).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Utilizadores' })[0])
    expect(await screen.findByRole('heading', { name: 'Utilizadores da aplicação' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Criar utilizador' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Registos de acesso' })).not.toBeInTheDocument()
    const profile = screen.getByRole('combobox', { name: 'Perfil' })
    expect(screen.getByRole('option', { name: 'Operador' })).toBeInTheDocument()
    await userEvent.selectOptions(profile, 'operator')
    expect(screen.getByText(/Actualização diária dos movimentos/i)).toBeInTheDocument()
    expect(screen.getByText(/Sem administração de utilizadores/i)).toBeInTheDocument()
  })

  it('separa os registos de acesso e apresenta-os apenas ao proprietário',async()=>{
    renderApp('owner')
    await userEvent.click(screen.getByRole('button',{name:'Definições'}))
    await userEvent.click(screen.getByRole('button',{name:'Administração'}))
    await userEvent.click(screen.getAllByRole('button',{name:'Registos de acesso'})[0])
    expect(await screen.findByRole('heading',{name:'Registos de acesso'})).toBeInTheDocument()
    expect(within(screen.getByRole('navigation',{name:'Localização'})).getByText('Registos de acesso')).toBeInTheDocument()
  })

  it('não apresenta nem aceita a rota dos registos de acesso ao administrador',async()=>{
    window.history.replaceState({},'', '/?view=admin-access-logs')
    renderApp('admin')
    expect(window.location.search).toBe('?view=overview')
    await userEvent.click(screen.getByRole('button',{name:'Definições'}))
    expect(screen.queryByRole('button',{name:'Registos de acesso'})).not.toBeInTheDocument()
  })

  it('dá ao Operador as Definições operacionais sem lhe dar Administração', async()=>{
    window.history.replaceState({},'', '/?view=clients&clientType=company')
    renderApp('operator')
    expect(screen.getByRole('button',{name:'Definições'})).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Administração'})).not.toBeInTheDocument()
    expect((await screen.findAllByRole('button',{name:'Lista'})).length).toBeGreaterThan(0)
  })

  it('preserva a secção e o submenu indicados no URL após refresh, também em modo PWA', async()=>{
    Object.defineProperty(window,'matchMedia',{configurable:true,value:vi.fn((query:string)=>({matches:query==='(display-mode: standalone)',media:query,onchange:null,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn()}))})
    window.history.replaceState({},'', '/?view=clients&clientType=company&clientMode=list')
    renderApp('owner')
    expect(window.location.search).toBe('?view=clients&clientType=company&clientMode=list')
    expect((await screen.findAllByRole('button',{name:'Lista'})).length).toBeGreaterThan(0)
  })

  it('bloqueia URLs administrativas ao Operador e mantém os Registos operacionais disponíveis', async()=>{
    window.history.replaceState({},'', '/?view=admin-users')
    renderApp('operator')
    expect(window.location.search).toBe('?view=overview')
    expect(screen.getByRole('button',{name:'Definições'})).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Administração'})).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button',{name:'Registos'}))
    expect(await screen.findByRole('table',{name:'Registos de trabalho'},{timeout:5000})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'Criar movimento'})).toBeInTheDocument()
  },15000)
})
