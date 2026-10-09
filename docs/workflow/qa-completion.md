# Conclusão da validação antes de activar

Código funcional de referência: `956b39bee78f9d72c0e8844ae44758df43c4a150`, branch `codex/workflow-prototype-20261009`. Este documento prepara a continuação; não certifica os ensaios ainda bloqueados nem autoriza publicação.

## PostgreSQL completo

Em 09-10-2026, o daemon Docker local está operacional, com zero imagens e zero containers. Os três scripts abaixo recusaram antes de inserir dados por ausência do container dedicado. Evidência local: `output/workflow-delivery/qa-diagnostics/`, com resultados e hashes das 137 migrations e das duas propostas SQL. O esquema do ensaio anterior tinha 134 migrations: não reutilizar esse número como prova do checkout actual.

Requisitos do ensaio existente:

- Container `carina-payments-qa-20261006`, label `purpose=carina-payments-local-validation`, `network=none`, sem portas expostas; exclusivamente dados sintéticos.
- Imagem oficial `public.ecr.aws/supabase/postgres:17.6.1.171`; não substituir por outra imagem ou atribuir o nome QA a uma base arbitrária para passar a guarda.
- Auth/helpers da imagem e bootstrap Storage oficial 0001–0014, referência `supabase/storage@b919141f82590cb86924272c0f036fdc697c8fb3`, conforme [ensaio anterior](../payments-workspace.md).
- Baseline reconciliada e revista para as 137 migrations actuais. As reconciliações históricas descritas no ensaio anterior não foram repetidas aqui; não editar migrations, criar identidades de produção ou omitir falhas para obter aprovação.
- Dados, temporários e evidência graváveis no workspace; nenhuma cópia de clientes, segredos ou configuração de serviços reais.

`public.ecr.aws` não consta da política de rede vigente e a imagem não está em cache. O daemon usa `/var/lib/docker`; não alterar o daemon, permissões ou rede para contornar o bloqueio. É necessário disponibilizar o ambiente QA compatível com estes requisitos. Não foram efectuados pulls, bootstrap ou aplicação SQL remota nesta continuação.

Só após verificar o container e a baseline completa, executar os ensaios existentes sem alterar as guardas:

```sh
node scripts/test-payments-integration.mjs
node scripts/test-payments-lock-order.mjs
node scripts/test-retainer-integration.mjs
```

## Nove contratos de leitura

As propostas permanecem fora de migrations: [carteiras e filas](sql/workflow_read_scope.sql) e [resumos](sql/workflow_dashboard_scope.sql). Aplicação apenas à base QA descartável, após revisão da baseline; não usar `supabase db push`, projecto linked ou credenciais de produção. Verificar assinaturas, tipos, helpers, RLS e grants antes de executar. A aprovação dos 27 testes PGlite existentes não demonstra equivalência ao esquema completo.

| Ensaio completo necessário | Critério de aprovação |
| --- | --- |
| Âmbito vazio nos nove RPC | Mesmas linhas, valores e ocultação das funções de origem, considerando o campo novo de UUID nas sociedades. |
| Sociedade + responsável + perfil | Intersecção exacta no trabalho; carteira e montantes integrais nas vistas que assim o indicam. |
| Mistos, perfis inactivos e paginação | Vertentes e cliente explícito respeitados; sem corte silencioso ou dupla contagem. |
| Duas sociedades com nome igual | Agrupamento financeiro pelo UUID, sem duplicação de valores. Navegação por nome ambíguo não deve seleccionar uma entidade por suposição. |
| Owner/admin/operator/billing/professional/viewer/auditor | Respeitar os controlos de origem; valores ocultos permanecem `NULL`; capacidades de pagamento não são ampliadas. |
| Outro escritório, PIN pendente e pertença inactiva | Sem linhas, nomes ou valores adicionais ao acesso permitido pelas funções de origem. |
| Grants por cliente/processo/equipa e grants expirados | Mesmos limites de âmbito/validade das funções originais. |
| Fila e notas de várias versões | Ordem, token, revisão e capacidades preservados; sociedade da última versão; totais integrais. |
| Avenças/provisões | Contrato, saldo e movimentos completos; não reconstruir saldos a partir de trabalho parcial. |
| Concorrência de recebimento/revisão/estorno | Um único efeito ou rejeição e rollback integral, sem dupla cobrança. |
| Leituras filtradas | Nenhuma alteração a linhas financeiras, auditorias ou permissões. |
| RPC indisponível | Erro explícito no frontend; nunca substituição por resultado global. |

## Safari/iPhone e revisão operacional

Usar demonstração isolada com fixtures e bloqueios externos já activos antes de navegar; não usar a aplicação real como fonte de dados do ensaio. O iPhone físico não está ligado a este ambiente e não foi ensaiado. Não disponibilizar links de localhost como se fossem acessíveis remotamente.

Registar modelo/iOS/Safari, orientação e resultado de cada percurso: cinco menus, dez páginas da ficha nos cinco grupos, abrir/fechar/restaurar contexto, filtros combinados e limpar, acesso ao primeiro registo, gráficos e lista correspondente, montantes integrais, edição sem perda de formulário ao tentar mudar o âmbito, exportação PDF/Word e download, temas claro/escuro, safe areas, PWA e aviso de versão. Comparar com as tarefas dos operadores antes de activar. [Revisão A4 e evidência](release-readiness.md).

## Azure/Auth/Storage

Mantém-se a instrução expressa de não usar credenciais nem serviços reais. Os ensaios EN/FR e documentos existentes são simulados. Disponibilidade, configuração de permissões, armazenamento e qualidade linguística reais não são certificados por esses mocks. Esta continuação não revoga a restrição nem cria recursos ou custos.

## CI e activação

CI do código funcional: [run 37976453290](https://github.com/dabranches-collab/legal-carina/actions/runs/37976453290), SHA `956b39bee78f9d72c0e8844ae44758df43c4a150`. **Ambos os jobs, validate e dependency-audit, concluíram com sucesso**, confirmado na página pública em 09-10-2026 às 19:13:16 UTC. Observação sanitizada em `output/workflow-delivery/ci-observation.json`. Este lote seguinte altera apenas documentação; não apresentar o SHA documental como o SHA desta execução. A API de Actions foi recusada com Forbidden, mas a página pública do GitHub permitiu acompanhar o run sem credenciais adicionais ou alterações de rede.

Só após os ensaios aplicáveis, CI verde e revisão operacional preparar a activação/reversão. A flag `VITE_WORKFLOW_NAVIGATION=five-areas` permanece desactivada em produção. Publicação exige ordem explícita «publica». Nenhuma instrução deste documento constitui execução do ensaio ou publicação.
