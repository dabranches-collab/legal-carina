import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { ResetPasswordPage } from './ResetPasswordPage'
import { InitialPinChangePage } from './InitialPinChangePage'

const loginProps = { busy:false, error:'', notice:'', onPinLogin:vi.fn(), onRecover:vi.fn(), onPasskeyLogin:vi.fn(), onClearError:vi.fn() }

describe('autenticação', () => {
  it('inicia sessão apenas com nome e PIN de quatro algarismos', async () => {
    const onPinLogin = vi.fn()
    render(<LoginPage {...loginProps} onPinLogin={onPinLogin} />)
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nome de utilizador'), 'dabranches')
    await userEvent.type(screen.getByLabelText('PIN de 4 algarismos'), '2468')
    await userEvent.click(screen.getByRole('button', { name:'Entrar' }))
    expect(onPinLogin).toHaveBeenCalledWith('dabranches', '2468')
  })

  it('apresenta o busto da Justiça na zona institucional do login', () => {
    render(<LoginPage {...loginProps} />)
    const bust = screen.getByTestId('login-justice-bust')
    expect(bust).toHaveStyle({ maskImage:'url(/brand/lady-justice-bust-a.png)' })
    expect(bust).toHaveAttribute('aria-hidden','true')
  })

  it('mantém recuperação administrativa sem registo público', async () => {
    render(<LoginPage {...loginProps} />)
    expect(screen.queryByRole('button', { name:/regist/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name:'Preciso de recuperar o acesso' }))
    expect(screen.getByRole('heading', { name:'Recuperar acesso' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email administrativo')).toBeInTheDocument()
  })

  it('impede redefinição quando as passwords não coincidem', async () => {
    const onSubmit=vi.fn(); render(<ResetPasswordPage busy={false} error="" onSubmit={onSubmit}/>)
    await userEvent.type(screen.getByLabelText('Nova password'),'Password!2026')
    await userEvent.type(screen.getByLabelText('Confirmar password'),'Password!2027')
    expect(screen.getByRole('button',{name:'Guardar nova password'})).toBeDisabled()
  })

  it('obriga a substituir o PIN inicial por um PIN diferente', async () => {
    const onSubmit=vi.fn()
    render(<InitialPinChangePage busy={false} error="" onSubmit={onSubmit} onLogout={vi.fn()}/>)
    await userEvent.type(screen.getByLabelText('PIN inicial'),'2468')
    await userEvent.type(screen.getByLabelText('Novo PIN'),'2468')
    await userEvent.type(screen.getByLabelText('Confirmar novo PIN'),'2468')
    expect(screen.getByRole('button',{name:'Guardar novo PIN'})).toBeDisabled()
    await userEvent.clear(screen.getByLabelText('Novo PIN'))
    await userEvent.clear(screen.getByLabelText('Confirmar novo PIN'))
    await userEvent.type(screen.getByLabelText('Novo PIN'),'1357')
    await userEvent.type(screen.getByLabelText('Confirmar novo PIN'),'1357')
    await userEvent.click(screen.getByRole('button',{name:'Guardar novo PIN'}))
    expect(onSubmit).toHaveBeenCalledWith('2468','1357')
  })
})
