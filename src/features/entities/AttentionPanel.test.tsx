import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AttentionPanel } from './AttentionPanel'

const links={uninvoiced:'?view=work&invoiced=false',unpaid:'?view=work&invoiced=true&paid=false',missingPrice:'?view=work&missingPrice=true'}

describe('AttentionPanel',()=>{
  it('mantém todos os alertas e apresenta a zero a verde',()=>{
    render(<AttentionPanel counts={{uninvoiced:4,unpaid:0,missingPrice:2}} links={links}/>)
    expect(screen.getByText('Por facturar')).toBeInTheDocument()
    expect(screen.getByText('Facturados não pagos')).toBeInTheDocument()
    expect(screen.getByText('Facturados não pagos').parentElement).toHaveClass('text-success')
    expect(screen.getByText('Movimentos sem preço')).toBeInTheDocument()
  })

  it('apresenta os três atalhos verdes quando não existem pendências',()=>{
    render(<AttentionPanel counts={{uninvoiced:0,unpaid:0,missingPrice:0}} links={links}/>)
    expect(screen.getAllByText('Abrir tabela →')).toHaveLength(3)
    expect(screen.getAllByText('0')).toHaveLength(3)
  })
})
