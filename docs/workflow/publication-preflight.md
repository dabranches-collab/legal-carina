# Publicação autorizada — preflight de 09-10-2026

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
