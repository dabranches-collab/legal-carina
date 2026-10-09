# Publicação autorizada — preflight de 09-10-2026

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
