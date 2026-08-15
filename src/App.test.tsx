import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./lib/supabase', () => ({
  supabase: {
   from: vi.fn(() => ({ select: () => ({ eq: () => ({ in: () => ({ limit: () => ({ maybeSingle: async () => ({ data:{ firm_id:'firm-1',role:'owner' },error:null }) }) }) }) }) })),
   functions: { invoke: vi.fn(async () => ({ data:{ users:[{userId:'user-1',email:'admin@example.test',role:'owner',active:true,invitedAt:'2026-01-01',lastSignInAt:null}] },error:null })) },
   rpc: vi.fn(async (name:string, args?:{p_kind?:string}) => {
    if (name === 'get_dashboard_overview') return { error:null, data:{ metrics:{minutes:120,worked:200,invoiced:150,paid:100,receivable:50,uninvoicedCount:1,unpaidCount:1,averageRate:100,activeClients:1,missingPrice:0,overrides:0,importErrors:1}, annual:[{label:2026,value:200,minutes:120}],monthly:[{label:4,value:200}],latestYear:2026,byClient:[{label:'Cliente Atlas',value:200}],byBilling:[{label:'Carina Santos',value:200}],byProfessional:[{label:'Carina',value:200}],byArchive:[{label:'dossier',value:1}],clientTypes:[{label:'company',value:1}] } }
    if (name === 'search_work_entries') return { error:null,data:{items:[{id:'LC-1048',work_date:'2026-04-07',client_name:'Cliente Atlas',client_code:'C-0142',activity_description:'Consulta',professional_name:'Carina',duration_minutes:90,effective_hourly_rate:120,effective_amount:180,billing_entity_name:'Carina Santos',is_invoiced:false,invoice_date:null,is_paid:false,archive_status:'dossier',source_type:'xlsx',has_manual_override:false,has_historical_state_exception:false,validation_warnings:[]}],total:1,page:1,pageSize:25,professionals:[],billingEntities:[]} }
    const titles:Record<string,string>={client:'Cliente Atlas',billing:'Carina Santos',professional:'Carina'}
    return { error:null, data:{selectedId:'1',options:[{id:'1',label:titles[args?.p_kind??'client']}],identity:{title:titles[args?.p_kind??'client'],subtitle:'Ativo',code:''},metrics:{minutes:120,total:200,invoiced:150,paid:100,pending:50,averageRate:100,movements:1,clients:1,professionals:1,billingEntities:1},annual:[{label:2026,value:200}],monthly:[{label:4,value:200}],recent:[]} }
  }) },
}))
import { AuthenticatedApplication as App } from './App'

describe('interface principal', () => {
  it('apresenta navegação, cabeçalho e indicadores da visão geral', async () => {
    render(<App />)
    expect(screen.getByRole('complementary', { name: 'Navegação principal' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Pesquisa global' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeInTheDocument()
    expect(await screen.findByText('Valor trabalhado')).toBeInTheDocument()
    expect(screen.getByText('Dados reais — acesso restrito')).toBeInTheDocument()
  })

  it('navega para a tabela de registos e seleciona linhas', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Registos de trabalho' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Registos de trabalho' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Registos de trabalho reais com faturação e arquivo' })).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Selecionar movimento de Cliente Atlas em 2026-04-07' }))
    expect(screen.getByText('1 selecionados')).toBeInTheDocument()
  })

  it('abre os dashboards de cliente, sociedade e profissional', async () => {
    render(<App />)
    for (const [button, heading] of [['Clientes','Cliente Atlas'], ['Sociedades faturantes','Carina Santos'], ['Profissionais','Carina']]) {
      await userEvent.click(screen.getByRole('button', { name: button }))
      expect(await screen.findByRole('heading', { name: heading, level: 2 })).toBeInTheDocument()
    }
  })

  it('mantém utilizadores dentro da Administração', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Administração' }))
    expect(await screen.findByRole('heading', { name: 'Utilizadores da aplicação' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Criar acesso' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Utilizadores' })).toHaveAttribute('aria-current', 'page')
  })
})
