import { render,screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe,test,expect,vi } from 'vitest'
import { RetainerChargeDialog, type RetainerCharge } from './RetainerChargeDialog'

const charge:RetainerCharge={id:'synthetic-charge',period_start:'2026-09-01',amount:100,currency:'EUR',status:'pending',invoice_reference:null,invoice_date:null,due_on:null,paid_on:null,notes:null}
describe('ficha de prestação',()=>{
 test('alterações só são enviadas ao guardar; cancelar preserva a prestação',async()=>{
  const user=userEvent.setup(),save=vi.fn().mockResolvedValue(true),close=vi.fn()
  render(<RetainerChargeDialog charge={charge} readOnly={false} onSave={save} onClose={close}/>)
  await user.selectOptions(screen.getByLabelText('Estado'),'paid')
  await user.type(screen.getByLabelText('N.º factura'),'SINTETICA-1')
  expect(save).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button',{name:'Cancelar'}))
  expect(close).toHaveBeenCalledTimes(1);expect(save).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button',{name:'Guardar prestação'}))
  expect(save).toHaveBeenCalledWith(expect.objectContaining({id:charge.id,status:'paid',invoice_reference:'SINTETICA-1'}))
 })
 test('falha de gravação mantém a ficha e os dados preenchidos',async()=>{
  const user=userEvent.setup(),close=vi.fn()
  render(<RetainerChargeDialog charge={charge} readOnly={false} onSave={async()=>false} onClose={close}/>)
  await user.type(screen.getByLabelText('Observações'),'Ensaio sintético')
  await user.click(screen.getByRole('button',{name:'Guardar prestação'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível guardar')
  expect(screen.getByLabelText('Observações')).toHaveValue('Ensaio sintético')
  expect(close).not.toHaveBeenCalled()
 })
})

test('facturação em Pagamentos não permite liquidar ou inventar a data',async()=>{
 const user=userEvent.setup(),save=vi.fn()
 render(<RetainerChargeDialog charge={charge} billingOnly readOnly={false} onSave={save} onClose={vi.fn()}/>)
 expect(screen.queryByRole('option',{name:'Liquidada'})).not.toBeInTheDocument()
 await user.selectOptions(screen.getByLabelText('Estado'),'invoiced')
 await user.click(screen.getByRole('button',{name:'Guardar prestação'}))
 expect(await screen.findByRole('alert')).toHaveTextContent('data da factura')
 expect(save).not.toHaveBeenCalled()
})
