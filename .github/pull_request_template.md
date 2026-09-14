## Objectivo

Descrever a alteração e a versão afectada.

## Continuidade

- [ ] A branch parte da linha funcional canónica confirmada, não apenas de `main`.
- [ ] Não foram incluídos segredos, dados pessoais, documentos reais ou `.env.local`.
- [ ] Utilizadores, pertenças, perfis, acessos e permissões financeiras foram preservados.
- [ ] Migrations aplicadas não foram apagadas, renomeadas nem reescritas.
- [ ] Se existe alteração de base/Auth/Storage, backup/PITR e recuperação dos objectos foram confirmados e ensaiados.
- [ ] A CI, a auditoria de dependências e o secret scan passaram no commit exacto.

## Produção

- [ ] Sem deploy automático. A publicação só pode ocorrer após a palavra explícita `publica` e deve ser registada no handover.
