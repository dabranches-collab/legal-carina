import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AuthenticatedApplication as App } from './App'

describe('interface principal', () => {
  it('apresenta navegação, cabeçalho e indicadores da visão geral', () => {
    render(<App />)
    expect(screen.getByRole('complementary', { name: 'Navegação principal' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Pesquisa global' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeInTheDocument()
    expect(screen.getByText('Valor trabalhado')).toBeInTheDocument()
    expect(screen.getByText('Dados demonstrativos anonimizados')).toBeInTheDocument()
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
      expect(screen.getByRole('heading', { name: heading, level: 2 })).toBeInTheDocument()
    }
  })
})
