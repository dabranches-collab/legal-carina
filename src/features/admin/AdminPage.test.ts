import { describe, expect, it } from 'vitest'
import { makeAccessMessage } from './accessMessage'

describe('mensagens de acesso administrativo',()=>{
  it('mantém utilizador e PIN temporário na mensagem criada após o registo',()=>{
    const message=makeAccessMessage('utilizador.teste','2468')
    expect(message).toContain('Utilizador: utilizador.teste')
    expect(message).toContain('PIN temporário: 2468')
    expect(message).toContain('No primeiro acesso')
  })

  it('permite partilhar link e utilizador existente sem repor o PIN',()=>{
    const message=makeAccessMessage('utilizador.existente')
    expect(message).toContain('Utilizador: utilizador.existente')
    expect(message).toContain('Utilize o PIN actual')
    expect(message).not.toContain('PIN temporário:')
  })
})
