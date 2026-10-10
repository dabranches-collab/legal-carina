# Validação de iPhone e desktop — 10-10-2026

Lote local 0.16.2 em preparação, na branch `codex/functional-qa-0161-20261010`. Complementa a [validação funcional e das integrações reais](functional-qa-20261010.md). Esta validação não publica uma versão nem altera dados de clientes.

## Matriz

| Família | Viewports CSS |
|---|---|
| iPhone vertical | 320×568, 375×667, 390×844, 393×852, 414×896, 430×932 |
| iPhone horizontal | 568×320, 667×375, 844×390, 852×393, 896×414, 932×430 |
| Desktop | 1280×800, 1366×768, 1440×900, 1536×864, 1920×1080, 1920×1200, 1920×1240, 2560×1440 |
| Desktop com zoom equivalente | 1920×1080 a 125%, 150%, 200%; 1920×1240 a 125%, 150% |
| Tablet | 768×1024, 1024×768 |
| Modo escuro, todos os fluxos | 375×667, 430×932, 1366×768, 1920×1080 |

31 perfis. Inclui as seis geometrias obrigatórias da [matriz desktop habitual](../responsive-desktop-matrix.md), associadas aos monitores de 14, 24 e 27 polegadas. O ensaio de navegação da ficha alterna entre claro e escuro em todos os perfis. O zoom equivalente divide o viewport CSS pelo factor de zoom e ajusta o DPR; não certifica o zoom do sistema operativo nem uma dimensão física de monitor. Os perfis móveis usam touch, `isMobile` e DPR, com safe areas simuladas nos cenários existentes.

## Fluxos e verificações

Cada perfil executa os 16 contratos da suite workflow, mais seis cenários:

- pagamento parcial sintético: 123 € de total, 20 € de provisão, 10 € recebidos, saldo 93 €; recebimento adicional de 20 € reduz o saldo a 73 €, reabertura conserva o saldo e cancelar não regista outro recebimento;
- abertura/fecho dos formulários de registo, despesa, cliente e nota, incluindo uma lista de tarefas;
- edição de avença com 32 horas por ano, período de 12 meses e excedente a 150 €/hora;
- fecho do aviso de alterações da versão instalada antes de abrir uma despesa;
- pré-visualização de honorários em PT, EN e FR, incluindo PDF renderizado e Word preparado, sem emitir uma nota nem consumir numeração;
- tabela de 100 movimentos: filtros saem da vista, restam pelo menos duas linhas completas abaixo do cabeçalho da aplicação e scroll horizontal não alarga a página. A ordenação é efectivamente accionada: cabeçalho fixo no desktop com altura superior a 500 px; em móvel/ecrãs baixos regressa-se aos controlos da tabela, que acompanham o scroll.

Os contratos existentes verificam as cinco áreas, grupos/páginas da ficha, campos obrigatórios e sugestões, clientes mistos, persistência do âmbito na URL e após recarregar, intersecção de responsável/sociedade/categoria, dívida e notas integrais. Os botões financeiros e de fecho são verificados por hit-testing do centro: um controlo visível mas tapado por outro elemento faz falhar o ensaio. Todos os cenários verificam ausência de overflow horizontal global e de erros JavaScript não tratados.

A suite bloqueia serviços externos, WebSockets e os proxies de Supabase/Azure. As traduções nesta matriz são simuladas; o ensaio Azure real EN/FR está documentado no relatório funcional anterior. As mutações financeiras e da avença são exclusivamente respostas em memória.

## Defeitos encontrados e correcções locais

1. No iPhone pequeno horizontal, o grupo fixo da ficha tapava «Contactos» ao deslocar o formulário. No iPhone de 320 px vertical tapava a acção de guardar a avença. Os separadores passam a acompanhar o scroll em fichas estreitas ou ecrãs baixos.
2. O rodapé da ficha ocupava duas linhas de botões em horizontal pequeno. Passa a três colunas nesse caso, conservando os controlos de toque e aumentando a altura disponível para o formulário.
3. Na tabela de clientes a 320 px, a coluna fixa de 240 px tapava a acção «Nota» ao deslocar horizontalmente. A fixação horizontal é desactivada quando as colunas fixas ocupam mais de metade da largura útil da tabela; reaplica-se automaticamente quando há espaço. O cabeçalho vertical e as larguras guardadas mantêm-se.
4. A 896×414, a ancoragem automática do browser podia fazer oscilar o scroll 101 px ao fixar/desfixar o cabeçalho da tabela, tapando «Data» e impedindo ordenar. O diagnóstico observou a oscilação mesmo sem qualquer clique. A ancoragem fica desactivada dentro das tabelas que já gerem o seu cabeçalho e espaço reservado; o resto da página conserva o comportamento do browser.
5. No WebKit a 932×430, os controlos fixos da lista de clientes e da tabela tapavam a primeira linha. Em ecrãs com altura até 500 px passam a acompanhar o scroll, incluindo o cabeçalho da tabela. Os ensaios móveis accionam a ficha por toque no botão, em vez de simular um duplo clique de rato.

## Execução e evidência

Código da aplicação `ec01d8437c5b718ecbb212499175f153460a4e9a`, sem alterações posteriores ao produto. Código final dos ensaios `9c889a7a7eb2b32140de5aa2df6124aafb0d7993`:

- Chromium: duas passagens integrais **682/682**, 31 perfis, sem falhas, omissões ou retries de cenários (12,7 e 12,6 minutos). Relatórios `chromium-ec01-complete.json` e `chromium-e246-complete.json`.
- Repetições dirigidas em todos os 31 perfis: **155/155** dos cinco cenários de navegação, **31/31** de grupos/páginas e tema, **31/31** de histórico e **31/31** de dívida/ficha. Relatórios `drain-all-profiles.json`, `groups-final.json`, `history-drain-all-profiles.json` e `debt-drain-all-profiles.json`.
- WebKit oficial: **330/330**, 15 perfis (seis iPhones nas duas orientações, desktop 1440×900 e dois iPhones escuros), três baterias de 110 casos. [CI 38056327987](https://github.com/dabranches-collab/legal-carina/actions/runs/38056327987), commit `9c889a7`; zero falhas, omissões, flaky ou retries de cenários. Relatório consolidado `webkit-verified-summary.json`, com `webkit-9c88-{1,2,3}/results.json` de cada bateria. Durações: 13,0 / 10,7 / 11,6 minutos.
- **27/27** cenários de tabela fixa após a quinta correcção; **22** unitários da tabela e **10** de pagamentos/PWA. Types, build, lint e segurança passaram; o lint local inclui avisos de bundles preexistentes não versionados em `output/`, com código zero. Lint dirigido aos últimos ficheiros alterados sem avisos.
- CI geral `38054983248`/`b3e6d07` aprovada integralmente: segurança, lint, tipos, **351 unitários**, contratos SQL, scope SQL, runtime Worker, build, **64 workflow**, **174 regressão** e **quatro PWA**. Os quatro cenários de PWA omitidos na regressão normal são efectivamente executados no build de produção isolado seguinte. Dependências e segredos aprovados. Mesmo produto `ec01d843`; a única alteração seguinte do ensaio é a espera antes de fechar a ficha e retenção de trace em falha.
- **CI geral final `38056327987`/`9c889a7` aprovada integralmente**: todos os checks acima, 351 unitários, 64 workflow, 174 regressão e quatro PWA (5,9 / 9,5 minutos e 5,1 s para estas três suites). Dependências e segredos também aprovados. Log `responsive-qa-20261010-ci-verified-validate.log` fora do Git. O commit posterior de fecho altera apenas documentação; a evidência identifica o commit de código testado.

Comando: `pnpm exec playwright test --config playwright.responsive.config.ts`; para WebKit, `WORKFLOW_RESPONSIVE_BROWSER=webkit`. JSON, capturas sintéticas por perfil/cenário e artefactos ficam em `output/responsive-qa-20261010/`, fora do Git. Os resultados integrais acima pertencem a execuções completas; a consolidação apenas reúne as três baterias, sem contar repetições como cenários novos.

A matriz inicial teve 653/682; os diagnósticos permitiram corrigir os cinco defeitos reais descritos acima. As primeiras passagens WebKit também detectaram esperas insuficientes do ensaio: controlos apenas parcialmente visíveis, navegação/histórico ou fecho da ficha antes das leituras e um cenário longo de grupos/tema que excedeu 45 s. O scroll centra o botão antes de hit-testing/toque; esse cenário longo tem 90 s. Os ensaios aguardam os corpos das respostas e leituras encadeadas antes de navegar/recarregar/voltar/fechar a ficha e antes de verificar erros. Nenhum erro é filtrado ou ignorado; pedidos falhados são anexados ao diagnóstico e a trace é conservada em caso de falha.

A mensagem WebKit «access control» surgiu também no proxy sintético do mesmo origin, sem eventos de pedido falhado. Após uma passagem de 330/330, repetições tiveram 327/330 e 329/330; o cenário de histórico e o de dívida/ficha motivaram as últimas esperas. A execução completa final acima passou os 330 casos. Isto valida o ensaio final, não certifica CORS do Supabase real nem prova que a mensagem anterior era um defeito de CORS de produção.

Revisão visual no browser integrado: produção a 390×844, 844×390 e 1366×768; ficha sintética a 568×320, com Contactos seleccionado e rodapé compacto. Capturas WebKit de 932×430 e Chromium de 320×568 também revistas. Produção continua **0.16.1**; não houve deploy, migrations, emissões, recebimentos ou alterações de avenças reais neste lote.

## Limites

WebKit oficial do Playwright foi executado no Ubuntu da CI; neste Windows faltava `libxml2.dll`, sem bypass dessa verificação. Emulação Chromium/WebKit não equivale a um iPhone físico. Teclado virtual, Fototeca/câmara, instalação PWA e comportamento do Safari num aparelho permanecem por validar fisicamente.

O fecho do aviso da versão instalada foi testado; o aviso de actualização pendente não está certificado por esse ensaio. Estabilidade de módulos entre publicações e origem dos uploads concorrentes, ciclo Storage real e Guardar rascunho/indicadores de preenchimento continuam pendentes conforme o relatório funcional e handover. Tradução real Azure EN/FR foi previamente verificada numa pré-visualização de um cliente com notas traduzidas; não se emitiram novas notas ou comunicações a clientes.
