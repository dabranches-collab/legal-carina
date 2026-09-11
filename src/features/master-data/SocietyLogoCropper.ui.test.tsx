import { fireEvent,render,screen } from '@testing-library/react'
import { expect,test,vi } from 'vitest'
import { SocietyLogoCropper } from './SocietyLogoCropper'

vi.mock('pdfjs-dist',()=>({GlobalWorkerOptions:{workerSrc:''},getDocument:vi.fn()}))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url',()=>({default:'worker.js'}))

test('apresenta uma moldura arrastável em vez de barras de recorte',()=>{
  render(<SocietyLogoCropper disabled={false} existingUrl="https://example.test/logo.png" onChange={vi.fn()} onRemove={vi.fn()}/>)
  expect(screen.getByRole('button',{name:'Arrastar margem esquerda'})).toBeInTheDocument()
  expect(screen.getByRole('button',{name:'Arrastar margem direita'})).toBeInTheDocument()
  expect(screen.getByRole('button',{name:'Arrastar margem superior'})).toBeInTheDocument()
  expect(screen.getByRole('button',{name:'Arrastar margem inferior'})).toBeInTheDocument()
  expect(screen.getByRole('button',{name:'Cortar'})).toBeInTheDocument()
  expect(screen.queryByRole('slider')).not.toBeInTheDocument()

  fireEvent.keyDown(screen.getByRole('button',{name:'Arrastar margem esquerda'}),{key:'ArrowRight'})
  expect(screen.getByText(/esquerda 1%/i)).toBeInTheDocument()
})
