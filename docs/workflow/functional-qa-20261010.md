# Validação funcional de 10-10-2026

## Resultado e alcance

Foram ensaiados os fluxos financeiros e documentais em PostgreSQL completo com dados sintéticos, as interfaces em browser isolado e a tradução Azure através da aplicação publicada. As relações de produção passaram 420 verificações de integridade, sem violações. Os hashes e contagens das 51 relações de negócio/Storage ficaram iguais antes e depois das pré-visualizações reais.

Não equivale a certificar toda a operação: continuam por ensaiar Safari/iPhone físico, upload/download completo no Storage real e estabilidade de uma sessão que atravessa publicações concorrentes. Não foram emitidas novas notas, registados pagamentos, alteradas avenças, concedidos acessos ou aplicadas migrations em produção.

## Ambientes efectivamente usados

- Código funcional local: `2d963d1f8f295cdafeb2b1d0dbb49de14e3c971b`, conservado na árvore de `be9ea8e`; branch de QA `codex/functional-qa-0161-20261010`. O fetch confirmou a mesma árvore em `origin/main` `842d499c6c30ea73b2e8d668a8ef2b53c033b3f3`.
- Base QA: container dedicado `carina-payments-qa-20261006`, imagem oficial Supabase PostgreSQL `17.6.1.171`, label de QA, rede `none`, sem portas. Ensaios com helpers Auth/RLS reais e múltiplas ligações quando aplicável.
- Metadados: 49 tabelas e 100 políticas públicas iguais à produção; as 143 funções públicas/privadas de produção correspondem às definições QA após normalizar formatação. A QA contém ainda dez funções históricas adicionais; não inferir igualdade integral de todos os objectos da instância.
- Produção observada: https://legal-carina.dabranches.workers.dev, versão apresentada **0.16.1**. Deployment activo `b0503af0-9830-464d-b2e5-566e449e7cf4`, Version ID `12ea78d7-c188-44c2-9bfe-1fc173ca10f2`, 100%, criado `2026-10-10T09:23:40.34572Z` (10:23:40 WAT).
- Esse upload posterior não identifica commit/mensagem e os bytes públicos diferem do artefacto `b9f159f8` anteriormente certificado. Origem desconhecida. Não houve deploy nesta validação nem se atribui o upload a uma pessoa ou tarefa.

## Ensaios aprovados

| Área | Evidência | Resultado |
| --- | --- | --- |
| Aplicação e cálculos | 351 testes Vitest | Aprovados |
| Contratos financeiros SQL | 25 pagamentos, 9 avenças, 29 angariação, 24 provisões, 27 filtros | Aprovados; os esquemas mínimos não substituem a QA completa |
| PostgreSQL completo | 16 pagamentos, 16 avenças anuais, 4 concorrência, 15 nove RPC, 3 desempenho | 54 verificações aprovadas |
| Auditorias transaccionais | Revisões de notas, cadeia documental/recebimentos, provisões, avenças, despesas, preços, preço/hora do cliente, permissões de notas e integridade | Nove scripts aprovados; dados sintéticos e rollback |
| Interface legada | 174 E2E | Aprovados, incluindo PDF/Word, documentos multipágina e anexos sintéticos |
| Fluxo de cinco áreas | 64 E2E desktop/tablet/iPhone emulado/horizontal | Aprovados |
| PWA compilada | 4 E2E | Aprovados; Auth não é contornado pelos parâmetros QA |
| Worker de tradução | Ensaio workerd/Miniflare | Aprovado; fornecedor e Supabase simulados nesse ensaio |
| Azure real | Pré-visualizações EN e FR de um movimento de um cliente com notas anteriormente traduzidas | Aprovadas via endpoint publicado e sessão existente; descrições traduzidas, duração e valores conservados |
| Português real | Pré-visualização do mesmo movimento | Aprovada, sem tradução externa |
| Integridade de produção | 420 agregados de FK, firma, CHECK, perfis, moedas, notas, saldos e estados | Zero violações |
| Nove RPC em produção | Grants consultados | Authenticated autorizado; anon recusado em todos |
| Preservação | Contagens/hashes de 49 tabelas públicas e duas Storage | 51 iguais antes/depois |

A cadeia nova `scripts/audit-document-payment-chain-rollback.sql` verifica realmente: registo de 100 €, despesa de 25 €, IVA de 23 €, nota de 148 €, provisão de 30 €, revisão EN/FR sem segundo consumo, fila filtrada integral, pagamento parcial de 18 €, saldo de 100 €, retry sem segundo recebimento e revisão com despesa adulterada recusada sem perda do pagamento. Os snapshots linguísticos desse ensaio PostgreSQL são sintéticos; a prova Azure real é a pré-visualização separada na aplicação.

Os ensaios anuais confirmam 32 horas incluídas, cobrança só dos minutos excedentes a 150 €/hora, renovação anual, redistribuição após correcção/cancelamento, concorrência e compatibilidade com preço fixo. Pagamentos verificam notas parciais, recebimento integral de registo individual/avença/preço fixo, idempotência, concorrência, estados de factura e limites de acesso dos sete papéis.

## Correcções dos ensaios

- O preparador de regressão usava paths absolutos Windows em imports ESM; passou a manter imports relativos com separadores portáteis. A suite completa local passou sem retirar os bloqueios a serviços externos.
- A auditoria de revisões passou a esperar a recusa de um segundo documento vigente para os mesmos registos, e quatro versões legítimas no seu cenário.
- A auditoria de provisões distingue correcções de texto permitidas de alterações financeiras protegidas, usando o RPC autorizado para estas últimas.
- A auditoria de preços chama helpers privados exclusivamente como proprietário da QA; não amplia grants de authenticated.
- A integridade calcula o saldo com pagamento directo e limite mínimo zero, como o produto. Excedentes são relatados separadamente, sem os confundir com corrupção ou os regularizar automaticamente.

## Pontos operacionais encontrados

1. Uma sessão anterior falhou ao abrir Clientes com `Failed to fetch dynamically imported module`, deixando a página vazia. Recarregar recuperou a aplicação. Havia um novo upload da mesma versão com assets diferentes. É necessário tratar a falha de módulos em sessões antigas e identificar/coordenar os emissores antes de afirmar estabilidade entre publicações.
2. O aviso de actualização pendente tapava os atalhos financeiros. Com os formulários fechados, foi aplicada a actualização da sessão e fechado o aviso; Pagamentos e Provisões voltaram a navegar. A geometria/interacção desse aviso merece um ensaio de sobreposição dedicado.
3. Existe uma nota vigente com **368 € de excedente fora das provisões**. O produto prevê e apresenta essa situação. É uma pendência de regularização contabilística, não uma violação de integridade; não foi alterada.
4. «Guardar rascunho» de movimento com cliente/data e indicadores vermelho/verde continuam pendentes, conforme handover anterior.

## Limites e continuidade

Tradução real: EN/FR de um movimento, sem guardar/emissão nem enviar documentos ao cliente. Não certifica todos os textos, lotes longos, quota futura ou qualidade jurídica de todas as traduções. As exportações extensas e anexos foram testados com documentos sintéticos; não se guardaram ficheiros reais de clientes no repositório.

Storage: a aplicação real carregou a apresentação/documento, incluindo o logótipo, mas não se efectuou upload de novos documentos para fichas reais. O ciclo completo de upload/download e permissões HTTP Storage continua pendente num destino de teste apropriado. Safari/iPhone foi emulado em Chromium; não confundir com aparelho físico.

Segurança de ficheiros, lint, typecheck e diff-check passaram. O lint inclui avisos de bundles preexistentes em `output/`; terminou com código zero. Evidência local não versionada em `output/functional-qa-20261010-*`, nos relatórios JSON de workflow/regressão/PWA e nas auditorias transaccionais. A branch centraliza apenas scripts e documentação sanitizada, sem dados, credenciais, builds ou novo deploy.
