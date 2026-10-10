# Preservar consulta manual após resize

Correcção isolada baseada em main `99fe573ff6a9eb0adcd21c21e5a1d18edfddbf94`, para revisão independente. Referência: [discussão da PR #103](https://github.com/dabranches-collab/legal-carina/pull/103#discussion_r4237981783). O checkout do responsável não foi alterado. Versão local em preparação: 0.16.4; última publicação confirmada: 0.16.3. Sem merge ou deploy.

## Reprodução mínima

Conteúdo sintético com largura 672 px e viewport interno de 320 px: abrir no fim (352), consultar manualmente a posição 300, alargar o viewport para 390 (o browser limita a posição a 282), regressar a 320. Antes, o componente saltava para 352; agora regressa a 300. A intenção de seguir o fim continua a acompanhar o máximo quando o utilizador regressa voluntariamente ao fim.

Executar `pnpm exec vitest run src/components/dashboard/LatestPeriodScroll.test.tsx`. Os dois novos casos simulam o evento de scroll do clamp antes e depois do ResizeObserver, três ciclos e regresso voluntário ao fim. Os dois testes existentes mantêm as expectativas. Não são necessários serviços, sessões ou dados reais.

## Evidência sanitizada

- Chrome 155 e WebKit 26, oito cenários: antes 4/8 aprovados; depois 8/8. Consulta manual 300 regressa a 300 após alargamento e rotação simulada; consulta 100 e seguimento do fim também passam.
- 52 verificações adicionais aprovadas: cinco ciclos de resize/rotação, nova posição manual enquanto alargado e alternância entre seguir o fim e consulta manual.
- Suite unitária: 355 testes em 68 ficheiros aprovados. Charts e LatestPeriodScroll: 10 testes aprovados.
- Contratos SQL exclusivamente sintéticos: 25 pagamentos/ACL e nove avenças aprovados.
- Tipos e lint dirigido aprovados. E2E existente `charts-latest-period.spec.ts`: oito casos aprovados em 41.6 s; quatro painéis por caso, quatro larguras e dois temas.

Os resultados de browser correspondem a simulações locais com pedidos externos bloqueados. WebKit não certifica Safari físico; Chrome desktop não certifica Chrome iOS. Permanecem pendentes toque/momentum/scrollbar e dispositivos físicos. Uma tentativa de gesto quando não existe overflow e não ocorre evento de scroll não está certificada.

Só dados sintéticos foram usados. Fixtures locais, capturas e logs operacionais ficam fora da PR; os testes mínimos versionados reproduzem o defeito. A CI desta branch deve ser consultada antes de integrar. Publicação depende de coordenação e autorização próprias.

Notas de versão alinhadas com package.json em 0.16.4, preservando o histórico 0.16.3. Build local aprovado após corrigir o bloqueio de coerência; a CI do novo SHA deve substituir a validação falhada de 85e1a0a3. Sem alteração adicional ao comportamento de scroll.
