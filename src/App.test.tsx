import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./lib/supabase', () => ({
  supabase: { rpc: vi.fn(async (name:string, args?:{p_kind?:string}) => {
    if (name === 'get_dashboard_overview') return { error:null, data:{ metrics:{minutes:120,worked:200,invoiced:150,paid:100,receivable:50,uninvoicedCount:1,unpaidCount:1,averageRate:100,activeClients:1,missingPrice:0,overrides:0,importErrors:1}, annual:[{label:2026,value:200,minutes:120}],monthly:[{label:4,value:200}],latestYear:2026,byClient:[{label:'Cliente Atlas',value:200}],byBilling:[{label:'Carina Santos',value:200}],byProfessional:[{label:'Carina',value:200}],byArchive:[{label:'dossier',value:1}],clientTypes:[{label:'company',value:1}] } }
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
    expect(screen.getByRole('table', { name: 'Registos de trabalho com faturação e arquivo' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar LC-1048' }))
    expect(screen.getByText('1 selecionados')).toBeInTheDocument()
  })

  it('abre os dashboards de cliente, sociedade e profissional', async () => {
    render(<App />)
    for (const [button, heading] of [['Clientes','Cliente Atlas'], ['Sociedades faturantes','Carina Santos'], ['Profissionais','Carina']]) {
      await userEvent.click(screen.getByRole('button', { name: button }))
      expect(await screen.findByRole('heading', { name: heading, level: 2 })).toBeInTheDocument()
    }
  })
})
