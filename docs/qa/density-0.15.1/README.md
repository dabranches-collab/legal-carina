> Retoma de 08-10-2026: branch `codex/desktop-density-0.15.1-20261008`, baseada no mesmo `a78f200`. Publicação autorizada após revisão curta e gates finais. As contagens abaixo são as evidências do pacote original: 65 E2E de apresentação mais seis de Pagamentos = 71 distintos. CI da PR validará o SHA final. Nenhuma alteração funcional adicional.

# Revisão local — legal-carina 0.15.1

Base exacta: `a78f20083b582f20374406af3a3c1e74457574ee` (main após PR #90, 0.15.0). Branch local `codex/desktop-density-20261008`. Sem commit, push, PR ou publicação deste pacote.

Painéis de entrada deixam de esticar para preencher a altura do ecrã. Filtros dos Registos colocam Todos/Limpar ao lado da selecção em desktop; cartões e gráficos têm margens mais compactas. Texto dos gráficos ajustado para 11 px e controlos touch para 44 px. A grelha de filtros a 1024 px respeita o espaço entre sidebar e áreas seguras.

| Ecrã (1920×1080, 100%) | Antes | Depois |
|---|---:|---:|
| overview: altura total do documento (px) | 2434 | 2266 |
| work: linhas integralmente visíveis | 7 | 10 |
| professionals&professional=Carina: altura total do documento (px) | 4774 | 4690 |

As medidas usam fixtures sintéticas iguais e zoom CSS/browser 1. Header e sidebar mantêm a geometria em todos os cenários desktop 1920/1440/1280. Não foi escondido texto nem reduzido o número de registos.

Security:files, lint, TypeScript e build aprovados. 303 testes distintos aprovados: a repetição integral teve dois timeouts de 5 s em WorkEntryModals durante execução concorrente; o ficheiro completo foi repetido isoladamente e os seus 18 testes passaram sem alterar timeouts ou testes. Os 25 contratos SQL de pagamentos e nove de avenças passaram com esquema sintético local. 65 E2E seleccionados aprovados (63 na primeira execução, dois do servidor isolado corrigidos e aprovados na repetição); nove cenários de menus/gráficos repetidos após o ajuste final de rótulos, todos aprovados. 240 estados antes/depois (24 vistas e variantes), 171 verificações de áreas seguras e 152 estados de nitidez. Conteúdo textual das 19 vistas principais e cinco variantes adicionais preservado. Os seis E2E de Pagamentos com dados sintéticos passaram (um timeout transitório de navegação a 768 px passou na repetição isolada sem alterar código ou teste).

As duas falhas iniciais de E2E vinham da ausência de /iphone-preview e publicDir no servidor isolado; só o servidor externo ao repositório foi corrigido. Os timeouts unitários não reapareceram na repetição isolada; fica registado o resultado de ambas as execuções. Não foi executada a suite E2E completa nem integração real com Auth/RLS. Funções, componentes de pagamentos/avenças, schemas e migrations permanecem intactos.

Os viewports são emulação Chromium: 1920×1080, 1440×900, 1280×800, 1024×768, 768×1024, 320×568, 375×667, 390×844, 430×932 e 844×390. Áreas seguras adicionais: 901×430, 932×430 e 956×440. DPR não comprova um monitor físico de 24 polegadas ou Safari num iPhone real.

Ficheiros de implementação/versão/testes:

- `src/index.css`
- `src/components/dashboard/Charts.tsx`
- `package.json`
- `public/release-notes.json`

Evidências neste directório: métricas JSON, capturas comparáveis antes/depois, release clara/escura, áreas seguras, conteúdo preservado e nitidez. As capturas comparativas mantêm a versão base quando foi necessário isolar o efeito do CSS; as capturas release mostram a versão local proposta.
