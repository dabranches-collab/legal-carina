# WebKit: prefetch de arranque e navegação do ensaio

## Causa reproduzida

A CI 38065650922 no commit b49503383ca2fcf522585947effd7b3cdba17fe3 falhou duas vezes em dois perfis do cenário de âmbito/histórico. A revisão de LatestPeriodScroll não encontrou outro bloqueio. Os traces das duas tentativas foram conservados; não houve terceira repetição cega.

No HP, o cenário original instrumentado falhou 3/10; uma segunda série com argumentos/stack também falhou 3/10. Depois de todas as leituras terminarem, o ensaio iniciava reload/goto. Só depois de beforeunload começava uma nova chamada a search_work_entries, com os argumentos não filtrados e p_page_size=10000 de prefetchWorkEntries. A aplicação agenda esse prefetch 1200 ms após montar AuthenticatedApplication. Alterar o âmbito remonta esta aplicação e reagenda o temporizador. A espera do harness só observava fetches já iniciados e um intervalo quieto de 1000 ms: não observava o trabalho ainda agendado.

Nos traces CI, o erro surgiu 7–35 ms depois de goto/reload. No ensaio local, os argumentos e a stack identificam resilientReadFetch a chamar o fetch nativo no documento em saída. A leitura global corresponde a App.tsx / prefetchWorkEntries / baseUniverseArgs. Nenhuma resposta 403 nem cabeçalho CORS recusado foi observado nesse erro; o anexo requestfailed estava vazio.

Controlos mínimos distinguem os três casos:

- Pedido já pendente quando se navega: requestfailed com cancelamento/abort; sem pageerror não tratado.
- Novo fetch agendado em beforeunload: WebKit emite o mesmo pageerror de access-control, mesmo com catch; sem pedido HTTP correspondente. Playwright promove a mensagem Console de origem javascript do WebKit a pageerror.
- CORS realmente negado por Access-Control-Allow-Origin: falha TypeError, requestfailed e erro de recurso; HTTP 403 do servidor isolado mantém o status e o corpo Blocked by isolated setup.

## Correcção restrita ao harness

O cenário de âmbito/histórico pede agora a conclusão observada da leitura global de arranque antes de navegar. O tracker reconhece a resposta HTTP bem-sucedida e os argumentos do contrato de leitura não filtrada; cada documento começa sem esse sinal. Depois continua a aplicar a espera já existente para leitores e pedidos encadeados. Não aumenta o intervalo nem o timeout, não altera o temporizador do produto e não chama APIs de negócio adicionais.

As asserções originais de linhas, filtros, histórico, notas, ausência de escritas, serviços externos bloqueados e zero erros continuam intactas. Dois controlos novos cobrem navegação com leitura intencionalmente pendente e a distinção entre CORS negado e HTTP 403. O erro CORS esperado é verificado numa página de controlo separada; não há filtro genérico de console/pageerror e a página do teste conserva a guarda zero-erros.

Reproduzir: WORKFLOW_RESPONSIVE_BROWSER=webkit pnpm exec playwright test --config playwright.responsive.config.ts --grep 'âmbito partilhado combina|navegação interrompida|controlo negativo' --repeat-each=10 --project=landscape-se-old. Usar a sintaxe de variável de ambiente adequada à shell.

No HP foi usado Playwright 1.56.1 com o seu WebKit 26.0 emparelhado; o runtime 1.62.1 Windows não arrancou por libxml2.dll ausente. Sem DLLs/PATH globais alterados. A confirmação final depende da CI Linux com a versão do repositório. Não constitui certificação de Safari físico.

Sem alterações a negócio, dados, RLS, credenciais, segurança, serviços, pipeline ou publicação. A instabilidade de saída não autoriza ignorar erros em navegação normal; testes dedicados conservam essa fronteira explícita.

## Validação local concluída

Primeira série corrigida: 30/30 WebKit (dez vezes cada cenário). Versão final, com verificação exacta do erro CORS e espera final do prefetch: 15/15 WebKit (cinco vezes cada cenário) e 6/6 Chrome (duas vezes cada cenário). Gráficos: 10/10; tipos, build, lint dirigido, guarda de ficheiros e diff-check aprovados. O código de negócio não foi alterado. A CI Linux do SHA final e a revisão independente do harness continuam gates obrigatórios.

## Controlo de navegação no Chromium da CI

A CI 38069472885 passou os cenários antigos de integração, mas o novo controlo de interrupção esperava requestfailed numa rota interceptada. No Chromium emparelhado com Playwright 1.62.1 esse evento não é garantido, mesmo libertando a rota depois da navegação; o teste excedeu o timeout nos quatro perfis. A expectativa foi substituída pelo contrato observável de ciclo de vida: iniciar uma leitura mantida pendente, navegar, libertar a resposta, exigir a rejeição do leitor antigo e confirmar que o documento novo não recebeu o marcador de resultado tardio. Chromium tem de reportar Execution context was destroyed; WebKit tem de reportar o cancelamento do pedido exacto, acompanhado de Load failed ou destruição de contexto. A guarda zero-pageerrors permanece. Não há aumento de timeout ou exclusão de erro.

O controlo final e os outros dois cenários passaram 9/9 no Chromium 151 / Playwright 1.62.1 emparelhados (três repetições), e o controlo final específico de interrupção passou ainda 3/3 em WebKit e 3/3 no Chromium exacto. Esta alteração não modifica o sinal de conclusão do prefetch, já verificado nas baterias WebKit da CI.

A CI 38069472885 terminou com todas as três baterias WebKit aprovadas; a validação geral ficou em 68/72 pela expectativa requestfailed do controlo novo, corrigida acima. A falha original de âmbito/histórico não reapareceu. A execução completa do novo SHA continua obrigatória; nenhum resultado anterior foi apagado ou declarado verde.
