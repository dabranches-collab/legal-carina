import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AttentionPanel } from './AttentionPanel'

const links={uninvoiced:'?view=work&invoiced=false',unpaid:'?view=work&invoiced=true&paid=false',missingPrice:'?view=work&missingPrice=true'}

describe('AttentionPanel',()=>{
  it('mostra apenas pendências com resultados',()=>{
    render(<AttentionPanel counts={{uninvoiced:4,unpaid:0,missingPrice:2}} links={links}/>)
    expect(screen.getByText('Por facturar')).toBeInTheDocument()
    expect(screen.queryByText('Facturados não pagos')).not.toBeInTheDocument()
    expect(screen.getByText('Movimentos sem preço')).toBeInTheDocument()
  })

  it('desaparece quando não existem pendências',()=>{
    const {container}=render(<AttentionPanel counts={{uninvoiced:0,unpaid:0,missingPrice:0}} links={links}/>)
    expect(container).toBeEmptyDOMElement()
  })
})
