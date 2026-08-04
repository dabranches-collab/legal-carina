# Segurança

## Dados proibidos no Git

Credenciais, `.env*` (exceto `.env.example` vazio), chaves, dumps, logs de clientes, folhas de cálculo reais, documentos jurídicos, importações e dados pessoais.

## Ambiente local

Copiar `.env.example` para `.env.local`. Variáveis `VITE_*` são públicas no bundle: apenas URL e chave publishable/anon podem ser usadas. A `service_role` nunca pode entrar no browser, Git ou logs.

## Supabase

- RLS em todas as tabelas expostas e políticas com ownership explícito.
- Não autorizar com `user_metadata`; usar dados controlados em `app_metadata` quando necessário.
- `UPDATE` exige políticas `SELECT`, `USING` e `WITH CHECK`.
- Funções privilegiadas ficam fora de schemas expostos, com privilégios mínimos.
- Executar advisors antes de consolidar migrations.

## Aplicação

Aplicar menor privilégio, MFA para contas administrativas, validação no servidor, logs sem conteúdo de clientes, auditoria de operações sensíveis e testes de autorização negativos.

Incidentes devem implicar rotação de credenciais, preservação segura de evidência e avaliação de notificação aplicável.
