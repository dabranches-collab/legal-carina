import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { StandardDataTable, type TableColumn } from './StandardDataTable'

vi.mock('xlsx',async importOriginal=>({...await importOriginal<typeof import('xlsx')>(),writeFile:vi.fn()}))

type Row={id:string;name:string;amount:number;active:boolean}
const rows:Row[]=[{id:'1',name:'Álvaro',amount:20,active:true},{id:'2',name:'Beatriz',amount:10,active:false},{id:'3',name:'Carlos',amount:30,active:true}]
const columns:TableColumn<Row>[]=[
  {id:'name',label:'Nome',essential:true,value:row=>row.name},
  {id:'amount',label:'Valor',kind:'money',value:row=>row.amount},
  {id:'active',label:'Activo',kind:'boolean',value:row=>row.active,render:row=>row.active?'Sim':'Não'},
]

beforeEach(()=>localStorage.clear())

describe('StandardDataTable',()=>{
  test('pesquisa sem acentos, ordena números e exporta todos os resultados filtrados',async()=>{
    const user=userEvent.setup()
    render(<StandardDataTable id="test-table" label="Tabela de teste" rows={rows} columns={columns} rowKey={row=>row.id}/>)
    await user.type(screen.getByPlaceholderText('Pesquisar em todas as colunas…'),'alvaro')
    expect(screen.getByText('1 resultados de 3')).toBeInTheDocument()
    await user.clear(screen.getByPlaceholderText('Pesquisar em todas as colunas…'))
    await user.click(screen.getByRole('button',{name:'Valor'}))
    const body=screen.getByRole('table').querySelector('tbody')!
    expect(within(body).getAllByRole('row')[0]).toHaveTextContent('10')
  })

  test('carrega a exportação integral apenas depois do pedido do utilizador',async()=>{
    const user=userEvent.setup(),loadExportRows=vi.fn(async()=>[...rows,{id:'4',name:'Duarte',amount:40,active:true}])
    render(<StandardDataTable id="remote-export" label="Tabela remota" rows={rows.slice(0,1)} columns={columns} rowKey={row=>row.id} loadExportRows={loadExportRows}/>)
    expect(loadExportRows).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button',{name:'XLSX'}))
    expect(await screen.findByText('4 resultados exportados para XLSX.')).toBeInTheDocument()
    expect(loadExportRows).toHaveBeenCalledTimes(1)
  })

  test('multisselecção booleana distingue todas as opções de nenhuma opção',async()=>{
    const user=userEvent.setup()
    render(<StandardDataTable id="test-boolean" label="Tabela booleana" rows={rows} columns={columns} rowKey={row=>row.id}/>)
    const filterButtons=screen.getAllByRole('button',{name:'Filtrar…'})
    await user.click(filterButtons[2])
    const dialog=screen.getByRole('dialog',{name:'Filtro Activo'})
    expect(within(dialog).getByText('2 opções seleccionadas')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button',{name:'Limpar'}))
    expect(screen.getByText('0 resultados de 3')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button',{name:'Seleccionar todos'}))
    expect(screen.getByText('3 resultados de 3')).toBeInTheDocument()
  })

  test('selector de colunas mantém-se aberto, protege a coluna essencial e devolve o foco ao fechar',async()=>{
    const user=userEvent.setup()
    render(<StandardDataTable id="test-columns" label="Tabela de colunas" rows={rows} columns={columns} rowKey={row=>row.id}/>)
    const trigger=screen.getByRole('button',{name:'Colunas · 3/3'})
    await user.click(trigger)
    const dialog=screen.getByRole('dialog',{name:'Colunas visíveis em Tabela de colunas'})
    expect(within(dialog).getByRole('checkbox',{name:'Nome'})).toBeDisabled()
    await user.click(within(dialog).getByRole('checkbox',{name:'Valor'}))
    expect(screen.getByRole('dialog',{name:'Colunas visíveis em Tabela de colunas'})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'Colunas · 2/3'})).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog',{name:'Colunas visíveis em Tabela de colunas'})).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  test('persiste pesquisa, ordenação e colunas visíveis ao voltar a montar a tabela',async()=>{
    const user=userEvent.setup()
    const first=render(<StandardDataTable id="persistent-table" label="Tabela persistente" rows={rows} columns={columns} rowKey={row=>row.id}/>)
    await user.type(screen.getByPlaceholderText('Pesquisar em todas as colunas…'),'beatriz')
    await user.click(screen.getByRole('button',{name:'Valor'}))
    await user.click(screen.getByRole('button',{name:'Colunas · 3/3'}))
    await user.click(within(screen.getByRole('dialog',{name:'Colunas visíveis em Tabela persistente'})).getByRole('checkbox',{name:'Activo'}))
    await waitFor(()=>expect(localStorage.getItem('carina.table.persistent-table')).toContain('beatriz'))
    first.unmount()
    render(<StandardDataTable id="persistent-table" label="Tabela persistente" rows={rows} columns={columns} rowKey={row=>row.id}/>)
    expect(screen.getByPlaceholderText('Pesquisar em todas as colunas…')).toHaveValue('beatriz')
    expect(screen.getByRole('button',{name:'Colunas · 2/3'})).toBeInTheDocument()
    expect(screen.getByText('1 resultados de 3')).toBeInTheDocument()
  })
})
