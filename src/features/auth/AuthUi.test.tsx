import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { TermsModal } from './TermsModal'
import { ResetPasswordPage } from './ResetPasswordPage'
import type { LegalDocumentRow } from '../../types/database.types'

const documents: LegalDocumentRow[] = [
  ['terms_of_service','Termos de Serviço'], ['privacy_policy','Política de Privacidade'], ['gdpr_terms','Termos de RGPD'],
].map(([document_type,title], index) => ({ id:`doc-${index}`, document_type:document_type as LegalDocumentRow['document_type'], version:'1.0', title, body_markdown:'Conteúdo jurídico sintético para teste.', effective_at:'2026-08-04T00:00:00Z', content_hash:'a'.repeat(64), status:'published' }))

describe('autenticação', () => {
  it('mostra login e recuperação sem registo público', async () => {
    render(<LoginPage busy={false} error="" notice="" onLogin={vi.fn()} onRecover={vi.fn()} onEmailLink={vi.fn().mockResolvedValue(true)} onVerifyEmailCode={vi.fn()} onPasskeyLogin={vi.fn()} />)
    expect(screen.getByRole('heading', { name:'Iniciar sessão' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name:/regist/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name:'Entrar com passkey' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name:'Preciso de recuperar o acesso' }))
    expect(screen.getByRole('heading', { name:'Recuperar password' })).toBeInTheDocument()
  })

  it('permite iniciar o acesso sem password com um código temporário', async () => {
    const onEmailLink = vi.fn().mockResolvedValue(true)
    const onVerifyEmailCode = vi.fn().mockResolvedValue(true)
    render(<LoginPage busy={false} error="" notice="" onLogin={vi.fn()} onRecover={vi.fn()} onEmailLink={onEmailLink} onVerifyEmailCode={onVerifyEmailCode} onPasskeyLogin={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Email'), 'utilizador@example.test')
    await userEvent.click(screen.getByRole('button', { name:'Receber código temporário por email' }))
    expect(onEmailLink).toHaveBeenCalledWith('utilizador@example.test')
    await userEvent.type(screen.getByLabelText('Código de 6 algarismos'), '123456')
    await userEvent.click(screen.getByRole('button', { name:'Validar código' }))
    expect(onVerifyEmailCode).toHaveBeenCalledWith('utilizador@example.test', '123456')
  })

  it('bloqueia termos até ambos os consentimentos explícitos', async () => {
    const onAccept=vi.fn()
    render(<TermsModal documents={documents} busy={false} error="" onAccept={onAccept} />)
    const button=screen.getByRole('button',{name:'Aceitar e continuar'})
    expect(button).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox',{name:'Li e aceito os Termos de Serviço.'}))
    expect(button).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox',{name:'Li e aceito os Termos de RGPD e a Política de Privacidade.'}))
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(onAccept).toHaveBeenCalledOnce()
  })

  it('impede redefinição quando as passwords não coincidem', async () => {
    const onSubmit=vi.fn()
    render(<ResetPasswordPage busy={false} error="" onSubmit={onSubmit}/>)
    await userEvent.type(screen.getByLabelText('Nova password'),'Password!2026')
    await userEvent.type(screen.getByLabelText('Confirmar password'),'Password!2027')
    expect(screen.getByRole('button',{name:'Guardar nova password'})).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
