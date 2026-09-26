import {fireEvent,render,screen} from '@testing-library/react'
import {beforeEach,expect,test} from 'vitest'
import {useResizablePlainTable} from './useResizablePlainTable'

function Table(){
  const columns=useResizablePlainTable('plain-test',[180,220])
  return <table style={{width:columns.width}} className="table-fixed">{columns.colgroup}<thead><tr>{columns.header(0,'Cliente')}{columns.header(1,'Assunto')}</tr></thead><tbody><tr><td>Cliente A</td><td>Assunto A</td></tr></tbody></table>
}

beforeEach(()=>localStorage.clear())

test('ajusta uma coluna da ficha sem alterar a outra e guarda a largura',()=>{
  const first=render(<Table/>)
  const handle=screen.getByRole('separator',{name:'Ajustar largura de Cliente'})
  fireEvent.keyDown(handle,{key:'ArrowRight'})
  expect(Array.from(screen.getByRole('table').querySelectorAll('col')).map(col=>(col as HTMLElement).style.width)).toEqual(['190px','220px'])
  expect(screen.getByRole('table')).toHaveStyle({width:'410px'})
  first.unmount()
  render(<Table/>)
  expect(Array.from(screen.getByRole('table').querySelectorAll('col')).map(col=>(col as HTMLElement).style.width)).toEqual(['190px','220px'])
})
