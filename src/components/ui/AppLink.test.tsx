import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { AppLink } from './AppLink'

it('conserva o modo de validação nos pré-filtros internos e na navegação', () => {
  window.history.replaceState({}, '', '/?workflow=preview&view=overview')
  render(<AppLink href="?view=work&collectionState=unpaid">Movimentos</AppLink>)
  expect(screen.getByRole('link')).toHaveAttribute('href', '/?view=work&collectionState=unpaid&workflow=preview')
  fireEvent.click(screen.getByRole('link'))
  expect(window.location.search).toContain('workflow=preview')
  expect(window.location.search).toContain('collectionState=unpaid')
  window.history.replaceState({}, '', '/')
})
it('não propaga parâmetros internos a destinos externos', () => {
  window.history.replaceState({}, '', '/?workflow=preview')
  render(<AppLink href="https://example.test/documento">Documento</AppLink>)
  expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.test/documento')
  window.history.replaceState({}, '', '/')
})
it('conserva os links habituais sem opção de validação', () => {
  window.history.replaceState({}, '', '/')
  render(<AppLink href="?view=work&missingPrice=true">Sem preço</AppLink>)
  expect(screen.getByRole('link')).toHaveAttribute('href', '?view=work&missingPrice=true')
})
it('transporta os filtros partilhados para os registos do cliente',()=>{
  window.history.replaceState({},'', '/?workflow=preview&scopeClientType=company&scopeSociety=00000000-0000-4000-8000-000000000002')
  render(<AppLink href="?view=work&clientId=fixture">Registos</AppLink>)
  const href=new URL(screen.getByRole('link').getAttribute('href')!,window.location.href)
  expect(href.searchParams.get('scopeClientType')).toBe('company')
  expect(href.searchParams.get('clientId')).toBe('fixture')
  expect(href.searchParams.get('scopeSociety')).toBe('00000000-0000-4000-8000-000000000002')
  window.history.replaceState({},'','/')
})
