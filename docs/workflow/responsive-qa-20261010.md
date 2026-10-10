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

31 perfis. O ensaio de navegação da ficha alterna entre claro e escuro em todos os perfis. O zoom equivalente divide o viewport CSS pelo factor de zoom e ajusta o DPR; não certifica o zoom do sistema operativo nem uma dimensão física de monitor. Os perfis móveis usam touch, `isMobile` e DPR, com safe areas simuladas nos cenários existentes.

## Fluxos e verificações

Cada perfil executa os 16 contratos da suite workflow, mais seis cenários:

- pagamento parcial sintético: 123 € de total, 20 € de provisão, 10 € recebidos, saldo 93 €; recebimento adicional de 20 € reduz o saldo a 73 €, reabertura conserva o saldo e cancelar não regista outro recebimento;
- abertura/fecho dos formulários de registo, despesa, cliente e nota, incluindo uma lista de tarefas;
- edição de avença com 32 horas por ano, período de 12 meses e excedente a 150 €/hora;
- fecho do aviso de alterações da versão instalada antes de abrir uma despesa;
- pré-visualização de honorários em PT, EN e FR, incluindo PDF renderizado e Word preparado, sem emitir uma nota nem consumir numeração;
- tabela de 100 movimentos: filtros saem da vista, cabeçalho continua acessível, restam pelo menos duas linhas de leitura e scroll horizontal não alarga a página.

Os contratos existentes verificam as cinco áreas, grupos/páginas da ficha, campos obrigatórios e sugestões, clientes mistos, persistência do âmbito na URL e após recarregar, intersecção de responsável/sociedade/categoria, dívida e notas integrais. Os botões financeiros e de fecho são verificados por hit-testing do centro: um controlo visível mas tapado por outro elemento faz falhar o ensaio. Todos os cenários verificam ausência de overflow horizontal global e de erros JavaScript não tratados.

A suite bloqueia serviços externos, WebSockets e os proxies de Supabase/Azure. As traduções nesta matriz são simuladas; o ensaio Azure real EN/FR está documentado no relatório funcional anterior. As mutações financeiras e da avença são exclusivamente respostas em memória.

## Defeitos encontrados e correcções locais

1. No iPhone pequeno horizontal, o grupo fixo da ficha tapava «Contactos» ao deslocar o formulário. No iPhone de 320 px vertical tapava a acção de guardar a avença. Os separadores passam a acompanhar o scroll em fichas estreitas ou ecrãs baixos.
2. O rodapé da ficha ocupava duas linhas de botões em horizontal pequeno. Passa a três colunas nesse caso, conservando os controlos de toque e aumentando a altura disponível para o formulário.
3. Na tabela de clientes a 320 px, a coluna fixa de 240 px tapava a acção «Nota» ao deslocar horizontalmente. A fixação horizontal é desactivada quando as colunas fixas ocupam mais de metade da largura útil da tabela; reaplica-se automaticamente quando há espaço. O cabeçalho vertical e as larguras guardadas mantêm-se.

## Execução e evidência

Comando reprodutível: `pnpm exec playwright test --config playwright.responsive.config.ts`. Relatório JSON, capturas sintéticas por perfil/cenário e artefactos de falhas ficam em `output/responsive-qa-20261010/`, fora do Git. Resultados finais a preencher após a execução completa.

Revisão visual no browser integrado: produção a 390×844, 844×390 e 1366×768; ficha sintética corrigida a 568×320, com «Contactos» efectivamente seleccionado e rodapé mais compacto. Os ensaios financeiros de produção são de leitura; não há novas emissões, pagamentos ou alterações de avenças nesta matriz.

## Limites

Chromium emulado não equivale ao Safari num iPhone físico. Foi obtido WebKit oficial do Playwright, mas o arranque neste Windows foi recusado pela verificação de dependências (`libxml2.dll`); não houve ensaios WebKit aprovados. Teclado virtual, Fototeca/câmara, instalação real como PWA, orientação num aparelho e navegação do Safari continuam por validar fisicamente.

O aviso instalado foi testado com fecho; isto não certifica ausência de sobreposição do aviso de actualização pendente. A falha de módulos entre publicações, a origem dos uploads concorrentes, o ciclo Storage real e «Guardar rascunho»/indicadores de preenchimento permanecem pendentes conforme o handover. Não confundir a pré-visualização de um documento com persistência de um movimento incompleto.
