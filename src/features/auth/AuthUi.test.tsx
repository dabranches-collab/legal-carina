import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { TermsModal } from './TermsModal'
import { ResetPasswordPage } from './ResetPasswordPage'
import { InitialPinChangePage } from './InitialPinChangePage'
import type { LegalDocumentRow } from '../../types/database.types'

const documents: LegalDocumentRow[] = [
  ['terms_of_service','Termos de Serviço'], ['privacy_policy','Política de Privacidade'], ['gdpr_terms','Termos de RGPD'],
].map(([document_type,title], index) => ({ id:`doc-${index}`, document_type:document_type as LegalDocumentRow['document_type'], version:'1.0', title, body_markdown:'Conteúdo jurídico sintético para teste.', effective_at:'2026-08-04T00:00:00Z', content_hash:'a'.repeat(64), status:'published' }))

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

  it('mantém recuperação administrativa sem registo público', async () => {
    render(<LoginPage {...loginProps} />)
    expect(screen.queryByRole('button', { name:/regist/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name:'Preciso de recuperar o acesso' }))
    expect(screen.getByRole('heading', { name:'Recuperar acesso' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email administrativo')).toBeInTheDocument()
  })

  it('bloqueia termos até ambos os consentimentos explícitos', async () => {
    const onAccept=vi.fn(); render(<TermsModal documents={documents} busy={false} error="" onAccept={onAccept} />)
    const button=screen.getByRole('button',{name:'Aceitar e continuar'}); expect(button).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox',{name:'Li e aceito os Termos de Serviço.'})); expect(button).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox',{name:'Li e aceito os Termos de RGPD e a Política de Privacidade.'})); expect(button).toBeEnabled()
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
