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
- tabela de 100 movimentos: filtros saem da vista, restam pelo menos duas linhas completas abaixo do cabeçalho da aplicação e scroll horizontal não alarga a página. A ordenação é efectivamente accionada: cabeçalho fixo no desktop; no mobile, regressa-se aos controlos da tabela, que acompanham o scroll por desenho.

Os contratos existentes verificam as cinco áreas, grupos/páginas da ficha, campos obrigatórios e sugestões, clientes mistos, persistência do âmbito na URL e após recarregar, intersecção de responsável/sociedade/categoria, dívida e notas integrais. Os botões financeiros e de fecho são verificados por hit-testing do centro: um controlo visível mas tapado por outro elemento faz falhar o ensaio. Todos os cenários verificam ausência de overflow horizontal global e de erros JavaScript não tratados.

A suite bloqueia serviços externos, WebSockets e os proxies de Supabase/Azure. As traduções nesta matriz são simuladas; o ensaio Azure real EN/FR está documentado no relatório funcional anterior. As mutações financeiras e da avença são exclusivamente respostas em memória.

## Defeitos encontrados e correcções locais

1. No iPhone pequeno horizontal, o grupo fixo da ficha tapava «Contactos» ao deslocar o formulário. No iPhone de 320 px vertical tapava a acção de guardar a avença. Os separadores passam a acompanhar o scroll em fichas estreitas ou ecrãs baixos.
2. O rodapé da ficha ocupava duas linhas de botões em horizontal pequeno. Passa a três colunas nesse caso, conservando os controlos de toque e aumentando a altura disponível para o formulário.
3. Na tabela de clientes a 320 px, a coluna fixa de 240 px tapava a acção «Nota» ao deslocar horizontalmente. A fixação horizontal é desactivada quando as colunas fixas ocupam mais de metade da largura útil da tabela; reaplica-se automaticamente quando há espaço. O cabeçalho vertical e as larguras guardadas mantêm-se.
4. A 896×414, a ancoragem automática do browser podia fazer oscilar o scroll 101 px ao fixar/desfixar o cabeçalho da tabela, tapando «Data» e impedindo ordenar. O diagnóstico observou a oscilação mesmo sem qualquer clique. A ancoragem fica desactivada dentro das tabelas que já gerem o seu cabeçalho e espaço reservado; o resto da página conserva o comportamento do browser.
5. No WebKit a 932×430, os controlos fixos da lista de clientes e da tabela tapavam a primeira linha. Em ecrãs com altura até 500 px passam a acompanhar o scroll, incluindo o cabeçalho da tabela. Os ensaios móveis accionam a ficha por toque no botão, em vez de simular um duplo clique de rato.

## Execução e evidência

Passagem integral do código `ec01d8437c5b718ecbb212499175f153460a4e9a`: **682/682 Chromium**, 31 perfis, sem falhas, omissões ou retries, em 12,7 minutos. Relatório `chromium-ec01-complete.json`. Os 27 E2E dirigidos de tabelas também passaram após a quinta correcção. O WebKit aprovou 322/330 nessa passagem: cinco controlos parcialmente visíveis junto à barra inferior e três cenários com erros de CORS durante navegação/recarregamento no servidor simulado. Não são dados ou serviços de produção. A repetição centra o controlo por scroll normal antes de hit-testing e usa o proxy do mesmo origin do preview integrado; os pedidos não simulados continuam recusados com 403 e os erros não tratados continuam a fazer falhar os testes. Esta matriz não certifica CORS do Supabase real. Não houve nova alteração ao código da aplicação neste ajuste do ensaio. WebKit final por confirmar.

Comando reprodutível: `pnpm exec playwright test --config playwright.responsive.config.ts`. Relatório JSON, capturas sintéticas por perfil/cenário e artefactos de falhas ficam em `output/responsive-qa-20261010/`, fora do Git.

Chromium: **682 cenários distintos aprovados nos 31 perfis**, considerando a última execução de cada caso. Não foi uma única passagem sem falhas: a matriz inicial teve 653 aprovações/29 falhas; corrigiram-se esperas do ensaio que seleccionavam o diálogo transitório «Abrir ficha» e acrescentou-se repetição apenas para resets HTTP da guarda local. A repetição de 11 cenários em todos os perfis teve 336 aprovações/5 falhas; quatro demonstraram a oscilação de scroll descrita acima e uma excedeu a espera de carregamento de cinco segundos. Após corrigir a ancoragem, os dois cenários afectados foram repetidos em todos os perfis: **62/62 aprovados**, sem omissões nem retries de cenários. Os relatórios `baseline.json`, `directed.json`, `scroll-fixed.json` e `summary.json` conservam esta sequência.

Também passaram 22 unitários da tabela após a última correcção e dez de pagamentos/PWA no lote. A CI `38046472395` aprovou segurança, lint, tipos, 351 unitários, contratos SQL sintéticos, runtime Worker, build, 64 workflow, 174 E2E legados e quatro PWA. A CI 38048173028 aprovou novamente a validação geral. WebKit Ubuntu: 318/330 aprovados, doze falhas investigadas. Além do defeito 5, os ensaios passaram a usar toque nos controlos móveis, a esperar a conclusão dos pedidos antes de recarregar e a conservar capturas de erros por teste, sem ignorar erros. Verificação local dirigida da última correcção: 12/12; matrizes finais pendentes.

Revisão visual no browser integrado: produção a 390×844, 844×390 e 1366×768; ficha sintética corrigida a 568×320, com «Contactos» efectivamente seleccionado e rodapé mais compacto. Os ensaios financeiros de produção são de leitura; não há novas emissões, pagamentos ou alterações de avenças nesta matriz.

## Limites

Chromium emulado não equivale ao Safari num iPhone físico. Foi obtido WebKit oficial do Playwright, mas o arranque neste Windows foi recusado pela verificação de dependências (`libxml2.dll`); a validação WebKit decorre por isso na CI Ubuntu, com o motor oficial do Playwright. Teclado virtual, Fototeca/câmara, instalação real como PWA, orientação num aparelho e navegação do Safari continuam por validar fisicamente.

O aviso instalado foi testado com fecho; isto não certifica ausência de sobreposição do aviso de actualização pendente. A falha de módulos entre publicações, a origem dos uploads concorrentes, o ciclo Storage real e «Guardar rascunho»/indicadores de preenchimento permanecem pendentes conforme o handover. Não confundir a pré-visualização de um documento com persistência de um movimento incompleto.
