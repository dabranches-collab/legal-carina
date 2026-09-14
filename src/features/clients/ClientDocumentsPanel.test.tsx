import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientDocumentsPanel } from './ClientDocumentsPanel'

const {invoke,query}=vi.hoisted(()=>{
  const invoke=vi.fn(),query={select:vi.fn(),eq:vi.fn(),neq:vi.fn(),order:vi.fn()}
  query.select.mockReturnValue(query);query.eq.mockReturnValue(query);query.neq.mockReturnValue(query);query.order.mockResolvedValue({data:[],error:null})
  return {invoke,query}
})

vi.mock('../../lib/supabase',()=>({supabase:{
  from:vi.fn(()=>query),
  functions:{invoke},
  storage:{from:vi.fn(()=>({createSignedUrl:vi.fn()}))},
}}))

const pdf=(name:string)=>{
  const file=new File([new Uint8Array([0x25,0x50,0x44,0x46,0x2d])],name,{type:'application/pdf'})
  Object.defineProperty(file,'arrayBuffer',{value:async()=>new Uint8Array([0x25,0x50,0x44,0x46,0x2d]).buffer})
  return file
}

describe('ClientDocumentsPanel',()=>{
  beforeEach(()=>{invoke.mockReset();invoke.mockResolvedValue({data:{documentId:'document-id'},error:null})})

  it('carrega vários documentos e cria títulos a partir dos nomes',async()=>{
    const user=userEvent.setup()
    render(<ClientDocumentsPanel firmId="firm-id" clientId="client-id"/>)
    const input=document.querySelector<HTMLInputElement>('input[type="file"]')!
    await user.upload(input,[pdf('certidao_permanente.pdf'),pdf('contrato-2026.pdf')])
    expect(screen.getByText('2 ficheiros seleccionados')).toBeVisible()
    await user.click(screen.getByRole('button',{name:'Carregar 2 documentos'}))
    await waitFor(()=>expect(invoke).toHaveBeenCalledTimes(2))
    const first=invoke.mock.calls[0][1].body as FormData,second=invoke.mock.calls[1][1].body as FormData
    expect(first.get('title')).toBe('certidao permanente')
    expect(second.get('title')).toBe('contrato 2026')
    expect(await screen.findByText('2 documentos carregados e protegidos no arquivo privado.')).toBeVisible()
  })

  it('continua o lote quando um ficheiro é inválido',async()=>{
    const user=userEvent.setup()
    render(<ClientDocumentsPanel firmId="firm-id" clientId="client-id"/>)
    const invalid=new File([new Uint8Array([1,2,3])],'falso.pdf',{type:'application/pdf'})
    Object.defineProperty(invalid,'arrayBuffer',{value:async()=>new Uint8Array([1,2,3]).buffer})
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!,[invalid,pdf('valido.pdf')])
    await user.click(screen.getByRole('button',{name:'Carregar 2 documentos'}))
    await waitFor(()=>expect(invoke).toHaveBeenCalledTimes(1))
    expect((await screen.findAllByText(/falso\.pdf: formato inválido/)).length).toBeGreaterThan(0)
    expect(await screen.findByText('1 documento carregado e protegido no arquivo privado.')).toBeVisible()
  })

  it('explica quando o serviço documental remoto ainda não está publicado',async()=>{
    const user=userEvent.setup()
    invoke.mockResolvedValueOnce({data:null,error:{message:'Failed to send a request to the Edge Function'}})
    render(<ClientDocumentsPanel firmId="firm-id" clientId="client-id"/>)
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!,pdf('teste.pdf'))
    await user.click(screen.getByRole('button',{name:'Carregar documento'}))
    expect((await screen.findAllByText(/o serviço documental ainda não está disponível nesta versão publicada/)).length).toBeGreaterThan(0)
  })
})
