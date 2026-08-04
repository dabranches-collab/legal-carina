import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('apresenta os quatro módulos principais', () => {
  render(<App />)
  for (const name of ['Horas', 'Clientes', 'Faturação', 'Recebimentos']) {
    expect(screen.getByRole('heading', { name })).toBeInTheDocument()
  }
})
