# Tradução integral dos documentos — 0.10.3 em preparação

Ao escolher inglês ou francês, a geração traduz as descrições dos movimentos e as observações das despesas antes de emitir a nota. A minuta, os títulos, os totais e os rótulos fiscais acompanham o idioma. Nomes próprios, moradas postais, identificadores, datas e valores são preservados.

Os originais dos registos não são alterados. A tradução e as despesas ficam em `document_options` da versão da nota, permitindo descarregar novamente sem chamar o fornecedor. Cópias históricas anteriores a esta alteração conservam os textos originais e identificam a ausência de tradução; é necessário rever e reemitir para obter uma nota integralmente traduzida.

## Execução e segurança

- Endpoint de mesma origem `POST /api/document-translation` no Worker existente. A chave OpenAI só existe no servidor.
- Autenticação verificada no Supabase original. Os textos são comparados com os registos consultados através do JWT do utilizador, preservando RLS e o filtro de cliente. Não utiliza service role.
- Só as descrições e observações seleccionadas são enviadas à Responses API; não são enviados valores, contactos nem fichas completas. `store:false`, sem registos de conteúdo ou de credenciais.
- Modelo `gpt-4.1-mini`, resultado JSON validado por identificador/tipo, lotes de até 20 textos/12000 caracteres, máximo de 8000 caracteres por texto e timeout. Limite de 60 pedidos/minuto por utilizador via binding Cloudflare; é um limite distribuído de melhor esforço, não um tecto de facturação.
- Falhas, respostas incompletas ou duplicadas impedem a emissão. Despesas por carregar ou com erro também bloqueiam a emissão. A paginação divide descrições longas sem cortar conteúdo.
- Mantém o limite já existente de `document_options` na RPC: validação conservadora de 55000 bytes antes da gravação (limite SQL de 60000 bytes). Notas maiores devem ser divididas. Nenhuma migration necessária.

## Configuração local e publicação futura

`OPENAI_API_KEY` está no `.env.local` ignorado pelo Git; Vite lê a variável apenas no middleware do servidor. Nunca criar uma variável `VITE_OPENAI_API_KEY`. O teste `node scripts/smoke-document-translation.mjs` envia exclusivamente os dois textos sintéticos definidos no ficheiro e não imprime credenciais.

Em 07-09-2026, o teste real devolveu HTTP 429 / `insufficient_quota`: falta regularizar créditos ou limites do projecto OpenAI antes de validar a qualidade real da tradução. Os testes unitários e de browser usam respostas sintéticas, não provam disponibilidade do fornecedor.

Produção só muda após a ordem «publica». Nessa altura, configurar o segredo `OPENAI_API_KEY` no Worker por via segura, sem o incluir em comandos visíveis, ficheiros versionados ou bundles; repetir o teste sintético real e os gates de publicação. A chave foi criada e guardada localmente com confirmação do utilizador; não foi instalada remotamente.

Referências: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [erros da API](https://developers.openai.com/api/docs/guides/error-codes), [rate limiting Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
