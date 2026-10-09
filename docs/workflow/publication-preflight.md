## 2026-10-10 — 0.16.0 publicada e confirmada

Publicação concluída por ordem expressa renovada depois de comunicar os ensaios externos pendentes. PR #93 e correcção PR #94 integrados em main; fonte funcional `bfde6a8d4da9884fe9d1255cebdf57d7c9af347a`, código da correcção `c88547efad4f1615b07b4c630bd15862088908a1`. CI `38004536233` e secret scan `38004536464` aprovados: 344 unitários, 61 contratos SQL, 56 integração, 172 regressão e quatro PWA. QA PostgreSQL: 15 verificações completas dos nove RPC, três verificações de cálculo único e 27 contratos de âmbito aprovados.

Worker https://legal-carina.dabranches.workers.dev, **0.16.0**, Version ID `e175a768-fbaf-4239-a5d5-bc2b5d9d2cfc`, deployment `f7539c54-2249-4fa7-a4f7-63e676ad214f`, 100% desde **10-10-2026 00:43:30 WAT** (`2026-10-09T23:43:30.384934Z`). Dez assets públicos, incluindo HTML, release notes, manifest, SW e módulos, iguais ao build real de produção com five-areas. Não foi publicado build fictício. Sessão existente confirmou 0.16.0, resumo com três filtros, fila combinada com 151 registos sem timeout, provisões e avenças filtradas. PWA actualizada; âmbito reposto vazio no resumo. Não se registaram pagamentos ou movimentos reais.

Migration nove RPC: remoto `20261009232051`, nome `20261009221918_add_workflow_scoped_reads`. Correcção materializada: remoto `20261009234216`, nome `20261009232441_materialize_workflow_read_scope`. Ambas aplicadas isoladamente; contagens/hashes das 52 relações comparadas antes/depois de cada aplicação e iguais. As 51 relações de negócio/Storage conservaram os hashes em toda a retoma; Auth users mudou entre verificações da sessão, conservando cinco utilizadores, sem diferença antes/depois das migrations. Colunas, policies e funções anteriores intactas; nove RPC só autenticados, anon revogado; advisors sem ERROR. Backup recuperável reconfirmado **09-10-2026 05:51:00 UTC**; Storage privado não alterado, sem reset/db push/repair.

A primeira publicação foi revertida temporariamente por timeout na fila filtrada. A materialização corrigiu o cálculo repetido; sem alargar timeouts/permissões. Rollback frontend disponível: Version ID `151f1a53-e74c-4aff-9b0b-2e9a583975d1` (0.15.1); não reverter dados/migrations. Safari/iPhone físico, revisão operacional e tradução Azure/upload/download reais com conteúdo fictício continuam **não certificados**; ordem de publicação não equivale a estes ensaios. Evidência sanitizada em `output/workflow-publication-016-receipt.json`, logs e hashes públicos; imagem `output/publication-0.16.0-proof.jpg`. Este lote documental não exige novo deploy. Entradas seguintes são históricas.

# Publicação autorizada — preflight de 09-10-2026

## Resultado da retoma local — código funcional `511d89d`

PR draft [#93](https://github.com/dabranches-collab/legal-carina/pull/93), sem merge ou deploy. A migration candidata foi instalada exactamente como versionada no QA isolado e passou as 15 verificações completas dos nove RPC; não foi aplicada à produção. Os 16 cenários de pagamentos/RLS, 16 de avenças, quatro de concorrência, 27 contratos de âmbito e 344 unitários também passaram. Segurança, lint, tipos e build/dry-run com configuração **real** de produção e `VITE_WORKFLOW_NAVIGATION=five-areas` aprovados. Os artefactos com destinos fictícios pertencem exclusivamente aos ensaios isolados e não são artefactos de publicação.

Backup físico recuperável confirmado no painel Supabase: **09-10-2026 05:51:00 UTC**. Continuidade de leitura: cinco utilizadores confirmados, cinco pertenças, sete grants, seis permissões financeiras, 49/49 tabelas públicas com RLS, 100 policies e zero órfãos. Advisors sem findings ERROR; avisos existentes não foram desactivados. Storage conserva objectos privados; o backup físico não recupera os seus ficheiros. Não houve alterações a objectos, dados, Auth ou permissões.

Sessão real autenticada confirmou carregamento do resumo e das filas de pagamentos na **0.15.1**. Auth/settings e Storage/status responderam 200; gateway PIN e tradução recusaram pedidos sem sessão com 401. Estes resultados não certificam novo login/PIN, upload/download ou tradução Azure bem-sucedida. Para os ensaios de conteúdo real foi pedido um registo de teste com texto/ficheiro fictícios, sem recolha de credenciais ou documentos jurídicos reais. Safari/iPhone físico e revisão operacional continuam sem evidência; pergunta ao utilizador pendente. A autorização de publicação mantém-se, sem novo pedido de autorização.

CI funcional [37998912619](https://github.com/dabranches-collab/legal-carina/actions/runs/37998912619) concluída com sucesso: 344 unitários, 61 contratos SQL, 56 integração, 172 regressão, quatro PWA e auditoria. As quatro omissões PWA da regressão foram executadas no build próprio. Execução adicional do [PR](https://github.com/dabranches-collab/legal-carina/actions/runs/37999259451) também aprovada com as mesmas contagens; secret scan aprovado. Antes de qualquer aplicação futura, voltar a consultar produção, backup, histórico remoto e continuidade. `supabase migration list --linked` continua sem projecto ligado; o histórico foi confirmado pela integração existente, sem repair ou db push global.

**Produção permanece 0.15.1.** Worker/version/deployment identificados na secção seguinte; os nove RPC ainda não existem remotamente. Não activar filtros nem apresentar a 0.16.0 como publicada enquanto faltarem os ensaios aplicáveis.

## Retoma no computador local

Acessos Cloudflare OAuth/Supabase e configuração pública de produção confirmados no checkout portátil. Produção 0.15.1, Version ID `151f1a53-e74c-4aff-9b0b-2e9a583975d1`, deployment `c5e0592b-f8a8-45a8-a60f-5c50a5a072b7`, 100% desde 08-10-2026 14:27:46 UTC. CI do commit de retoma `3dc45ac` aprovada no run `37981962069`; alterações SQL desta retoma exigem nova CI.

Container oficial disponível, network none/sem portas. Reconciliado apenas no QA por metadados: 49 tabelas públicas, colunas/policies/funções existentes iguais à base instalada; Vault incluído, nenhuma cópia de registos/segredos. Ensaios repetidos: 16 pagamentos/RLS, 16 avenças, quatro de concorrência; 15 verificações dos nove RPC e 27 contratos PGlite aprovados. Correcção do resumo por responsável conserva zero autorizado e NULL oculto. Migration aditiva candidata `20261009221918_add_workflow_scoped_reads.sql`, ainda não aplicada remotamente.

Browser integrado com sessão autenticada 0.15.1. Auth/settings e Storage/status HTTP 200; bindings Azure presentes. Smoke local de Azure recusado por chave local ausente, sem envio de dados; não recuperar o segredo do Worker. Continuam por concluir tradução e documentos autenticados reais, backup actual, Safari/iPhone físico e revisão dos operadores, build/dry-run de produção e CI final. Sem novo deploy/merge ou SQL remoto neste checkpoint. A autorização mantém-se; bloqueios antigos de ausência de identidades/QA estão resolvidos neste computador.

A ordem «aprovado, publica» foi recebida. A autorização mantém-se; o bloqueio é técnico e de validação, não falta de confirmação do utilizador. Registo: 09-10-2026 20:41 WAT.

## Evidência desta tentativa

| Verificação | Resultado |
| --- | --- |
| Checkout / remoto | `9ced9611decc3025af749a8c7fe9fad5e2ed073d` confirmado na branch de trabalho; main não alterado. |
| CI do SHA seleccionado | [Run 37978860247](https://github.com/dabranches-collab/legal-carina/actions/runs/37978860247): validate e dependency-audit aprovados. |
| Identidade Cloudflare | Wrangler whoami: não autenticado. Nenhum login interactivo ou credencial adicional. |
| Dry-run oficial | Código 1; guarda de deploy exige a configuração pública Supabase de produção verificada. Sem upload. |
| Rede de publicação | `api.cloudflare.com`, `api.supabase.com` e `legal-carina.dabranches.workers.dev` não constam da política actual. Nenhuma alteração de rede. |
| Estado actual de produção | Consulta pública sem ligação estabelecida; versão, deployment/version ID e rollback não confirmados. |
| Base e backup | Sem acesso configurado para listar migrations, confirmar baseline, ponto recuperável ou ensaiar os nove RPC. |

Não se executou deploy sem dry-run aprovado, não se desactivou a guarda, não se recuperaram segredos de ficheiros e não se usou o build com destinos fictícios como artefacto de produção. Não se fez merge em main nem aplicação SQL remota.

## Recursos necessários para prosseguir

Usar um ambiente de publicação com identidade Cloudflare autorizada para o Worker `legal-carina` e acesso Supabase autorizado ao projecto existente, além dos destinos necessários permitidos pela sua configuração. Disponibilizar bindings através das definições seguras do ambiente ou da integração existente; não colocar valores de segredos neste documento ou na conversa. A configuração pública do frontend deve satisfazer a fingerprint da guarda existente; não a substituir por uma chave fictícia, privada ou de outro projecto.

Disponibilizar o QA completo descrito em [qa-completion.md](qa-completion.md). Validar os nove RPC propostos e reconciliar a baseline antes de qualquer instalação. A autorização de publicação não torna disponíveis estes RPC: a navegação nova com filtros depende deles. [Contrato de leitura](scoped-read-contract.md).

Antes de alterações à base: listar/rever o histórico de migrations ligado, comparar definições e continuidade de utilizadores/permissões, confirmar backup recuperável com data/hora e plano de reversão. Aplicar só a alteração aditiva revista e ensaiada; não usar db push global, repair por suposição ou dados reais como fixtures.

Depois dos pré-requisitos técnicos: fixar o SHA/artefacto aprovado, confirmar os gates de [deployment.md](../deployment.md), executar o build de produção e dry-run correctos, publicar a versão autorizada e verificar login/PWA/módulos e metadados de implantação. Os testes locais simulados e a CI aprovados continuam válidos no seu âmbito, mas não substituem os ensaios bloqueados nem a configuração de produção.

Evidência local sanitizada: `output/workflow-delivery/publication-preflight.json`. Esta preparação não efectuou publicação nem gravações reais.
