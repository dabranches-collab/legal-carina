# Tradução integral dos documentos

Ao escolher inglês ou francês, a geração traduz as descrições dos movimentos e as observações das despesas antes de emitir a nota. A minuta, os títulos, os totais e os rótulos fiscais acompanham o idioma. Nomes próprios, moradas postais, identificadores, datas e valores são preservados.

Os originais dos registos não são alterados. A tradução e as despesas ficam em `document_options` da versão da nota, permitindo descarregar novamente sem chamar o fornecedor. Cópias históricas anteriores a esta alteração conservam os textos originais e identificam a ausência de tradução; é necessário rever e reemitir para obter uma nota integralmente traduzida.

A data formal conserva a cidade em todos os idiomas. Exemplos: `Alfragide, 04 de Setembro de 2026` (minuta portuguesa existente), `Alfragide, 4 September 2026` (inglês britânico) e `Alfragide, le 4 septembre 2026` (francês; primeiro dia: `1er`). Inglês/francês usam dia sem zero inicial e ordem dia–mês–ano; capitalização do mês conforme o idioma.

## Execução e segurança

- Endpoint de mesma origem `POST /api/document-translation` no Worker existente. A chave Azure Translator só existe no servidor.
- Autenticação verificada no Supabase original. Os textos são comparados com os registos consultados através do JWT do utilizador, preservando RLS e o filtro de cliente. Não utiliza service role.
- Só os textos das descrições e observações seleccionadas são enviados ao Azure Translator v3.0; os identificadores das linhas ficam no servidor. Eventuais dados escritos dentro desses textos integram a tradução. A API de texto tem política No Trace; a aplicação não regista conteúdo nem credenciais.
- Línguas previstas e confirmadas na ficha do cliente, no modal e no histórico do projecto: português, inglês e francês. Português conserva os originais e não chama o fornecedor. O Azure traduz de português para inglês/francês. Não utiliza modelos LLM nem a OpenAI.
- Referências alfanuméricas de processos, datas com separadores, endereços de correio e URLs são protegidos com `notranslate`; os valores numéricos são verificados após a tradução. Texto literal é escapado antes do envio e descodificado depois, mantendo quebras de linha. A tradução automática deve ser revista quando a terminologia jurídica ou os nomes próprios exigirem uma formulação específica.
- A resposta deve conter exactamente uma tradução no idioma pedido para cada posição do lote; identificadores/tipos são repostos a partir da origem. Lotes de até 20 textos/12000 caracteres, máximo de 8000 caracteres por texto e timeout. Limite de 60 pedidos/minuto por utilizador via binding Cloudflare; é um limite distribuído de melhor esforço. O recurso Azure está no escalão gratuito F0, sujeito à quota mensal e aos limites de débito do fornecedor.
- Falhas, respostas incompletas ou duplicadas impedem a emissão. Despesas por carregar ou com erro também bloqueiam a emissão. A paginação divide descrições longas sem cortar conteúdo.
- Mantém o limite já existente de `document_options` na RPC: validação conservadora de 55000 bytes antes da gravação (limite SQL de 60000 bytes). Notas maiores devem ser divididas. Nenhuma migration necessária.

## Configuração local e publicação futura

`AZURE_TRANSLATOR_KEY` e `AZURE_TRANSLATOR_REGION=northeurope` estão no `.env.local` ignorado pelo Git; Vite lê estas variáveis apenas no middleware do servidor. Nunca prefixar chaves privadas com `VITE_`. A chave OpenAI anterior não é utilizada. O teste `node scripts/smoke-document-translation.mjs` envia exclusivamente os dois textos sintéticos definidos no ficheiro e não imprime credenciais.

Em 07-09-2026 foi criado `carina-legal-translator`, grupo `rg-carina-legal`, região North Europe, plano Free F0 (2 milhões de caracteres/mês), implementação `CognitiveServicesTextTranslation-20260907225558`. West Europe recusou novas contas e não foi utilizado para o recurso de tradução. O teste real Azure aprovou inglês/francês, incluindo `TESTE-123`, tempo e despesa. A quota OpenAI deixou de ser um bloqueio desta integração.

O E2E `e2e/document-pdf-real.spec.ts` usa respostas simuladas por omissão. Com `AZURE_TRANSLATION_LIVE_QA=1`, usa o tradutor real com 90 registos e uma despesa exclusivamente fictícios; autenticação e gravações da aplicação permanecem simuladas. Verifica todas as descrições no PDF, incluindo continuidades entre páginas, e os rótulos fiscais. Esta opção é deliberadamente explícita e não corre por omissão no CI.

Produção só muda após a ordem «publica». Nessa altura, configurar o segredo `AZURE_TRANSLATOR_KEY` e a região `AZURE_TRANSLATOR_REGION=northeurope` no Worker por via segura, sem incluir o segredo em comandos visíveis, ficheiros versionados ou bundles; repetir os gates de publicação. A chave está guardada apenas localmente; não foi instalada remotamente. A criação do recurso Azure não publicou a Carina.

Referências: [Azure Translate v3](https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/reference/v3/translate), [No Trace](https://www.microsoft.com/en-us/translator/business/notrace/), [preços F0](https://azure.microsoft.com/en-us/pricing/details/translator/), [rate limiting Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

## Correcção 0.10.7

Montantes com separadores, horas alfanuméricas, ordinais e números simples são protegidos integralmente antes do envio. Exemplos sintéticos 1.250,50, 14h30 e 10.º reproduziram a falha anterior e passaram após a correcção no Azure real em EN/FR. Respostas inválidas, limites temporários e configuração/quota recebem mensagens distintas; nunca é emitida uma nota quando a tradução falha.
