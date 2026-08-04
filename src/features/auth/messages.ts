const knownMessages: Array<[string, string]> = [
  ['invalid login credentials', 'Email ou password incorretos.'],
  ['email not confirmed', 'Confirme o endereço de email antes de entrar.'],
  ['user not found', 'Não foi possível iniciar sessão com estes dados.'],
  ['password should be', 'A password não cumpre os requisitos de segurança.'],
  ['rate limit', 'Foram efetuadas demasiadas tentativas. Aguarde alguns minutos.'],
  ['network', 'Não foi possível contactar o serviço de autenticação.'],
]

export function authErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return knownMessages.find(([pattern]) => message.includes(pattern))?.[1]
    ?? 'Não foi possível concluir a operação. Tente novamente.'
}
