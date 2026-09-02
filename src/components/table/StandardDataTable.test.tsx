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

  test('aplica a pesquisa actual às linhas carregadas para XLSX',async()=>{
    const user=userEvent.setup(),loadExportRows=vi.fn(async()=>[...rows,{id:'4',name:'Duarte',amount:40,active:true}])
    render(<StandardDataTable id="filtered-export" label="Tabela filtrada" rows={rows.slice(0,1)} columns={columns} rowKey={row=>row.id} loadExportRows={loadExportRows}/>)
    await user.type(screen.getByPlaceholderText('Pesquisar em todas as colunas…'),'Beatriz')
    await user.click(screen.getByRole('button',{name:'XLSX'}))
    expect(await screen.findByText('1 resultados exportados para XLSX.')).toBeInTheDocument()
  })

  test('imprime todo o resultado filtrado mesmo quando a tabela está virtualizada',async()=>{
    const user=userEvent.setup(),many=Array.from({length:300},(_,index)=>({id:String(index),name:index<275?'Incluído':'Excluído',amount:index,active:true})),printed:string[]=[]
    vi.spyOn(window,'print').mockImplementation(()=>{printed.push(...within(screen.getByRole('table').querySelector('tbody')!).getAllByRole('row').map(row=>row.textContent??''))})
    render(<StandardDataTable id="filtered-print" label="Impressão filtrada" rows={many} columns={columns} rowKey={row=>row.id}/>)
    await user.type(screen.getByPlaceholderText('Pesquisar em todas as colunas…'),'Incluído')
    await user.click(screen.getByRole('button',{name:'Imprimir / PDF'}))
    expect(printed).toHaveLength(275)
    expect(printed.every(row=>row.includes('Incluído'))).toBe(true)
  })

  test('filtra e ordena sobre todo o universo carregado, não apenas sobre a página inicial',async()=>{
    const user=userEvent.setup(),loadAllRows=vi.fn(async()=>[...rows,{id:'4',name:'Duarte',amount:5,active:true}])
    render(<StandardDataTable id="full-universe" label="Universo integral" rows={rows.slice(0,1)} columns={columns} rowKey={row=>row.id} loadAllRows={loadAllRows}/>)
    await user.click(screen.getByRole('button',{name:'Ordenar Valor por ordem ascendente'}))
    expect(await screen.findByText('4 resultados de 4')).toBeInTheDocument()
    expect(within(screen.getByRole('table').querySelector('tbody')!).getAllByRole('row')[0]).toHaveTextContent('Duarte')
    await user.type(screen.getByPlaceholderText('Pesquisar em todas as colunas…'),'Beatriz')
    expect(screen.getByText('1 resultados de 4')).toBeInTheDocument()
    expect(screen.queryByLabelText('Linhas por página')).not.toBeInTheDocument()
  })

  test('abre uma linha com duplo clique ou Enter quando existe acção configurada',async()=>{
    const user=userEvent.setup(),onOpen=vi.fn()
    render(<StandardDataTable id="open-row" label="Tabela editável" rows={rows} columns={columns} rowKey={row=>row.id} onRowDoubleClick={onOpen}/>)
    const row=screen.getByRole('row',{name:'Abrir 1'})
    await user.dblClick(row)
    expect(onOpen).toHaveBeenLastCalledWith(rows[0])
    row.focus()
    await user.keyboard('{Enter}')
    expect(onOpen).toHaveBeenCalledTimes(2)
  })

  test('mantém as células numa linha e expõe o conteúdo completo ao passar o rato',()=>{
    render(<StandardDataTable id="compact-table" label="Tabela compacta" rows={rows} columns={columns} rowKey={row=>row.id}/>)
    const cell=screen.getByText('Álvaro')
    expect(cell).toHaveClass('whitespace-nowrap')
    expect(cell).toHaveAttribute('title','Álvaro')
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
    await user.click(within(dialog).getByRole('button',{name:'Todos'}))
    expect(screen.getByText('3 resultados de 3')).toBeInTheDocument()
  })

  test('alterna o fundo e permite destacar uma linha com um clique',async()=>{
    const user=userEvent.setup()
    render(<StandardDataTable id="selected-row" label="Tabela seleccionável" rows={rows} columns={columns} rowKey={row=>row.id}/> )
    const renderedRows=screen.getAllByRole('row').slice(1)
    expect(renderedRows[0]).toHaveClass('odd:bg-surface-subtle')
    expect(renderedRows[0]).toHaveClass('even:bg-surface')
    await user.click(within(renderedRows[1]).getByText('Beatriz'))
    expect(renderedRows[1]).toHaveAttribute('aria-selected','true')
    expect(renderedRows[1]).toHaveClass('table-row-active')
  })

  test('cliques simples só seleccionam e duplo clique abre a ficha',async()=>{
    const user=userEvent.setup(),edit=vi.fn()
    render(<StandardDataTable id="record-edit" label="Tabela de fichas" rows={rows} columns={columns} rowKey={row=>row.id} onRowDoubleClick={edit}/>)
    const cell=screen.getByText('Álvaro')
    await user.click(cell);await user.click(cell)
    expect(edit).not.toHaveBeenCalled()
    expect(cell.closest('tr')).toHaveAttribute('aria-selected','true')
    await user.dblClick(cell)
    expect(edit).toHaveBeenCalledOnce()
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

  test('persiste apenas as preferências visuais e limpa pesquisa e ordenação ao voltar a montar',async()=>{
    const user=userEvent.setup()
    const first=render(<StandardDataTable id="persistent-table" label="Tabela persistente" rows={rows} columns={columns} rowKey={row=>row.id}/>)
    await user.type(screen.getByPlaceholderText('Pesquisar em todas as colunas…'),'beatriz')
    await user.click(screen.getByRole('button',{name:'Valor'}))
    await user.click(screen.getByRole('button',{name:'Colunas · 3/3'}))
    await user.click(within(screen.getByRole('dialog',{name:'Colunas visíveis em Tabela persistente'})).getByRole('checkbox',{name:'Activo'}))
    await waitFor(()=>expect(localStorage.getItem('carina.table.anonymous.persistent-table')).toContain('"hidden":["active"]'))
    first.unmount()
    render(<StandardDataTable id="persistent-table" label="Tabela persistente" rows={rows} columns={columns} rowKey={row=>row.id}/>)
    expect(screen.getByPlaceholderText('Pesquisar em todas as colunas…')).toHaveValue('')
    expect(screen.getByRole('button',{name:'Colunas · 2/3'})).toBeInTheDocument()
    expect(screen.getByText('3 resultados de 3')).toBeInTheDocument()
    expect(screen.getByRole('columnheader',{name:/Valor/})).toHaveAttribute('aria-sort','none')
  })

  test('insere uma coluna nova na posição funcional mesmo com uma ordem antiga guardada',()=>{
    localStorage.setItem('carina.table.anonymous.new-column-table',JSON.stringify({order:['name','amount','active']}))
    const extended:TableColumn<Row>[]=[columns[0],columns[1],{id:'expenses',label:'Despesas',kind:'money',value:()=>0},columns[2]]
    render(<StandardDataTable id="new-column-table" label="Tabela com nova coluna" rows={rows} columns={extended} rowKey={row=>row.id}/>)
    expect(screen.getAllByRole('columnheader').map(cell=>cell.textContent?.replace(/Filtrar…↑↓$/,''))).toEqual(['Nome','Valor','Despesas','Activo'])
  })

  test('fixa as larguras no colgroup para o cabeçalho sticky não desalinhavar as colunas',()=>{
    render(<StandardDataTable id="sticky-widths" label="Tabela alinhada" rows={rows} columns={columns} rowKey={row=>row.id}/> )
    const table=screen.getByRole('table')
    const cols=table.querySelectorAll('colgroup col')
    expect(cols).toHaveLength(columns.length)
    expect(Array.from(cols).map(col=>(col as HTMLElement).style.width)).toEqual(['160px','160px','160px'])
  })

  test('respeita o alinhamento funcional indicado por cada coluna',()=>{
    const aligned:TableColumn<Row>[]=[{...columns[0],align:'left'},columns[1],columns[2]]
    render(<StandardDataTable id="column-alignment" label="Tabela alinhada por conteúdo" rows={rows.slice(0,1)} columns={aligned} rowKey={row=>row.id}/>)
    const cells=within(screen.getAllByRole('row')[1]).getAllByRole('cell')
    expect(cells[0]).toHaveClass('text-left')
    expect(cells[1]).toHaveClass('text-right')
  })

  test('abre todo o universo por defeito mas virtualiza as linhas apresentadas',()=>{
    const manyRows=Array.from({length:7200},(_,index)=>({id:String(index+1),name:`Cliente ${index+1}`,amount:index,active:index%2===0}))
    render(<StandardDataTable id="virtual-all" label="Universo virtual" rows={manyRows} columns={columns} rowKey={row=>row.id}/>)
    expect(screen.getByText('1–7200 de 7200')).toBeInTheDocument()
    const body=screen.getByRole('table').querySelector('tbody')!
    expect(body.querySelectorAll('tr[aria-hidden="true"]')).toHaveLength(1)
    expect(within(body).getAllByRole('row')).toHaveLength(40)
  })
})
