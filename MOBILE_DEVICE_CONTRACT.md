# Contrato obrigatório: iPhone Duo, família 18 e áreas seguras

Revisão documental: 10-10-2026. Ler antes de qualquer alteração de UI, navegação, CSS, gráficos, tabelas ou PWA. Aplica-se a todas as páginas, módulos, clientes e temas da plataforma, incluindo componentes partilhados. Acrescenta cobertura às regras existentes; não reduz a matriz anterior.

## Regra curta reutilizável

Validar sempre iPhone Duo (ecrãs interior e exterior, abertura/fecho sem perda de estado) e cada modelo confirmado da família iPhone 18, em Safari, Chrome e PWA instalada, retrato e paisagem, com safe areas nos quatro lados e protecção da Dynamic Island/recortes/indicador inferior. Medir viewport CSS, DPR, visualViewport, teclado e barras dinâmicas; nunca deduzir CSS dos pixels físicos. Preservar iPhones anteriores, iPad e desktop 1920×1080 a 100%, sem zoom/transform global para compactar. Exigir evidência por ambiente e distinguir emulação de aparelho físico; documentação não certifica adaptação nem testes.

## Dispositivos confirmados e perfis pendentes

Especificações consultadas directamente nas fontes Apple em 10-10-2026. Os números abaixo são **pixels físicos do painel, na ordem publicada pela Apple**, não largura/altura CSS, tamanho de screenshot, breakpoint ou orientação CSS garantida.

| Modelo / painel | Pixels físicos oficiais | Dynamic Island | Viewport CSS / DPR / insets reais | Ensaios da aplicação |
| --- | --- | --- | --- | --- |
| iPhone Duo — interior | 1878×2670 | Confirmada | PENDENTE de medição | NÃO EXECUTADOS nesta tarefa |
| iPhone Duo — exterior | 1398×2034 | Confirmada | PENDENTE de medição | NÃO EXECUTADOS nesta tarefa |
| iPhone 18 Pro | 2622×1206 | Confirmada | PENDENTE de medição | NÃO EXECUTADOS nesta tarefa |
| iPhone 18 Pro Max | 2868×1320 | Confirmada | PENDENTE de medição | NÃO EXECUTADOS nesta tarefa |
| Outros modelos da família 18 | PENDENTE de fonte oficial por modelo | PENDENTE | PENDENTE | NÃO EXECUTADOS |

Fontes: [Duo — especificações](https://www.apple.com/iphone-duo/specs/), [18 Pro e Pro Max — especificações](https://www.apple.com/iphone-18-pro/specs/), [anúncio Duo](https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/). A consulta a `https://www.apple.com/iphone-18/specs/` não forneceu especificações verificáveis nesta revisão. Não concluir daí que o modelo existe ou não existe; confirmar cada designação e adicionar a fonte antes de criar um perfil específico. Revalidar as fontes quando a família mudar.

Não assumir DPR 2/3 nem dividir resoluções físicas para inventar viewports. `screen.width/height` são valores CSS e não provam resolução física. Guardar os perfis medidos por modelo, painel, orientação, iOS/iPadOS, navegador e modo. Os perfis genéricos de automação continuam úteis como regressão, mas não devem ser renomeados para Duo/18 sem medidas verificadas.

## Matriz mínima de execução

Para cada linha de dispositivo/painel confirmado e para os iPhones anteriores/iPads já suportados, executar separadamente:

| Ambiente | Retrato e paisagem | Teclado / barras / áreas seguras | Duo abrir → fechar → abrir | Estado inicial |
| --- | --- | --- | --- | --- |
| Safari no aparelho | Obrigatório | Obrigatório | Obrigatório nos dois painéis | PENDENTE |
| Chrome no aparelho | Obrigatório | Obrigatório | Obrigatório nos dois painéis | PENDENTE |
| PWA instalada, modo standalone | Obrigatório | Obrigatório | Obrigatório nos dois painéis | PENDENTE |
| Emulação desktop / motores automatizados | Regressão complementar | Insets/teclado simulados identificados | Resize sintético identificado | PENDENTE; não certifica aparelho |

Registar separadamente nome e versão do navegador/interface e motor efectivo no ambiente testado, com fonte de identificação; se não comprovado, escrever NÃO COMPROVADO. Não presumir o motor pelo nome Chrome nem assumir que WebKit genérico certifica Safari e Chrome. Mesmo quando partilham motor, barras, teclado, instalação, navegação e ciclo de vida exigem provas próprias. Identificar também o modo de instalação/arranque da PWA; uma janela desktop com aparência standalone não prova PWA iOS instalada.

## Critérios obrigatórios

1. **Áreas seguras sempre:** verificar `env(safe-area-inset-top)`, `env(safe-area-inset-right)`, `env(safe-area-inset-bottom)` e `env(safe-area-inset-left)` em ambas as orientações, nos dois painéis Duo e em cada navegador/modo. Confirmar a configuração viewport/`viewport-fit=cover` quando aplicável; manter espaçamento de desenho além dos insets, sem somar padding duas vezes. Valores zero ou uma medição em retrato não dispensam as outras provas. Nenhum texto ou controlo pode ficar sob Dynamic Island, recorte, canto arredondado ou indicador inferior. Insets não são prova da geometria exacta da Island: confirmar visualmente e por interacção.
2. **Área útil variável:** abrir/fechar teclado, focar o primeiro/último campo, rolar, expandir/recolher barras Safari e Chrome, rodar com teclado e modal abertos. Observar `visualViewport` quando disponível (dimensões, offsets, scale, resize/scroll), sem confundir layout viewport com área visível. Usar feature detection e fallback utilizável; não depender de altura fixa nem apenas de `100vh` para garantir visibilidade.
3. **Dois ecrãs e continuidade:** testar exterior → interior → exterior e o inverso, incluindo rotação, retorno do background e resize durante formulário, filtro, tabela/gráfico, modal e operação em curso. Preservar rota, cliente/tenant autorizado, selecções, filtros, scroll útil e rascunho; não duplicar pedidos/gravações, perder dados ou recuperar estado de outra conta. Verificar comportamento real; resize desktop não prova dobragem física.
4. **APIs de dobra/segmentos:** não presumir suporte a Device Posture, Window Segments, media features ou variáveis de segmentos. Detectar suporte à API/CSS concretamente usada, testar ausência/valores inválidos e conservar layout responsivo de uma viewport. Não codificar uma dobradiça ou ecrãs simultâneos a partir de rumores ou da resolução do painel.
5. **Componentes e estados:** verificar sticky/fixed, cabeçalhos, rodapés, modais, drawers, toasts/avisos PWA, botões, menus/dropdowns, calendários, gráficos/tooltips/eixos e tabelas/filtros/cabeçalhos. Cobrir vazio, loading, erro, preenchido, conteúdo longo, menus expandidos e claro/escuro. Conferir limites, stacking, foco, scroll e hit testing real; tabelas podem ter scroll interno controlado, sem overflow horizontal global nem controlos cortados.
6. **Toque e leitura:** preservar alvos tácteis operáveis (referência de projecto: 44×44 CSS px para controlos principais), espaçamento, foco visível, contraste e texto legível. Testar texto ampliado/zoom de acessibilidade e inputs com teclado; não desactivar zoom do utilizador para esconder defeitos. Não compactar a aplicação com zoom CSS global, `transform: scale(...)` global ou corte de conteúdo.
7. **Regressão:** manter iPhones anteriores, iPad em retrato/paisagem e desktop físico 1920×1080 com browser a 100%, além das dimensões já exigidas pelo repositório. Medir viewport útil com barras e escala do sistema. Viewports CSS de regressão não são equivalências garantidas de monitor/zoom físico.

Referências de implementação: [WebKit: viewport e safe areas](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) e [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport). Confirmar suporte efectivo nas versões ensaiadas; estas referências não certificam o suporte a dobra nos novos aparelhos.

## Evidência e conclusão

Manter uma linha por combinação realmente ensaiada, no relatório de QA do repositório, ligada ao handover. Actualizar a matriz acima com medições reais, data e evidência; nunca promover uma pendência por mera alteração deste ficheiro.

| Data / SHA / módulo-rota-estado | Aparelho físico ou emulação / modelo-painel | OS / navegador-versão / motor e prova / modo | Orientação / barras / teclado / dobra | Medições CSS e DPR | Evidência / resultado / limitações |
| --- | --- | --- | --- | --- | --- |
| PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | Não ensaiado |

Medições mínimas: `screen.width/height`, `innerWidth/innerHeight`, `devicePixelRatio`, `visualViewport.width/height/offsetTop/offsetLeft/scale` quando disponível, quatro insets computados, zoom efectivo e estado das barras/teclado. Guardar screenshots ou vídeo, passos reproduzíveis, resultado esperado/observado e medição antes/depois da transição. Usar dados sintéticos autorizados e sanitizar evidências; não guardar dados de clientes ou segredos.

Separar PASSOU, FALHOU, PENDENTE e NÃO APLICÁVEL com motivo. Ausência de aparelho, navegador, API ou medição é limitação explícita, não aprovação. Se só existe emulação, declarar exactamente isso e manter a validação física pendente. Não declarar toda a UI adaptada nem toda a família suportada quando faltam combinações obrigatórias.

Esta revisão é apenas documentação de engenharia. Não altera UI, versões, dados, segredos, ACLs, autenticação ou infraestrutura; não executa testes de aplicação nem autoriza merge/deploy. Uma PR draft torna a proposta remota e revisável, mas a regra só chega à branch operacional após integração autorizada. Repositórios legados encerrados não são reactivados nem incluídos como aplicações activas.
