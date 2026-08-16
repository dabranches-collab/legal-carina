import { fireEvent,render,screen } from '@testing-library/react'
import { describe,expect,it } from 'vitest'
import { AnnualValueChart,DonutChart,MonthlyValueChart } from './Charts'

describe('DonutChart',()=>{
  it('centra a percentagem sem aplicar a máscara financeira ao contentor geométrico',()=>{
    render(<DonutChart title="Facturação" subtitle="Estado" firstLabel="Facturado" secondLabel="Não facturado" first={64}/>)
    const chart=screen.getByRole('img',{name:'Facturado: 64%'})
    const centre=chart.firstElementChild
    const value=screen.getAllByText('64%')[0]
    expect(centre).toHaveClass('grid','place-items-center')
    expect(centre).not.toHaveClass('financial-value')
    expect(value).toHaveClass('financial-value')
  })

  it('apresenta explicitamente os últimos 12 meses recebidos pelo dashboard',()=>{
    const periods=['2025-09','2025-10','2025-11','2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08']
    const data=periods.map((label,index)=>({label,value:index+1,societies:{'Carina Santos':index+1,'Legal Team':index+2,'Massive Search':index+3}}))
    render(<MonthlyValueChart data={data} allowSocietyComparison/>)
    expect(screen.getByText('Últimos 12 meses agregados')).toBeInTheDocument()
    expect(screen.getAllByText(/25|26/)).toHaveLength(12)
    fireEvent.click(screen.getByRole('button',{name:'Por sociedade'}))
    expect(screen.getByText('Últimos 12 meses por sociedade')).toBeInTheDocument()
    expect(screen.getByRole('img',{name:'Valor mensal por sociedade'}).querySelectorAll('path[stroke]')).toHaveLength(3)
    expect(screen.getByText('Carina Santos')).toBeInTheDocument()
    expect(screen.getByText('Legal Team')).toBeInTheDocument()
    expect(screen.getByText('Massive Search')).toBeInTheDocument()
  })

  it('não mostra o selector fora da Visão geral, mesmo que receba várias sociedades',()=>{
    const data=[{label:'2026-08',value:30,societies:{'Carina Santos':10,'Legal Team':20}}]
    render(<MonthlyValueChart data={data}/>)
    expect(screen.queryByRole('button',{name:'Por sociedade'})).not.toBeInTheDocument()
  })

  it('reserva também a comparação anual por sociedade para a Visão geral',()=>{
    const data=[{label:2025,value:30,societies:{'Carina Santos':10,'Legal Team':20}}]
    const {rerender}=render(<AnnualValueChart data={data}/>)
    expect(screen.queryByRole('button',{name:'Por sociedade'})).not.toBeInTheDocument()
    rerender(<AnnualValueChart data={data} allowSocietyComparison/>)
    expect(screen.getByRole('button',{name:'Por sociedade'})).toBeInTheDocument()
  })
})
