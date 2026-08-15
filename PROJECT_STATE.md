# Estado do projeto

Atualizado em: 2026-08-15

## Concluído nesta fase

- Repositório vazio clonado e remoto `origin` validado.
- Fundação React/TypeScript/Vite/Tailwind criada.
- Estrutura de frontend, Supabase e documentação criada.
- Testes unitário e E2E mínimos adicionados.
- Lint, teste unitário e build validados; smoke test E2E aprovado em Chromium.
- Regras de exclusão para segredos, dados e documentos reais reforçadas.
- Nenhuma credencial, dado real, migration remota ou deploy criado.
- Ficheiro-base Excel analisado localmente e sem alteração; hash e estrutura documentados.
- Importador local `.xlsx`/`.csv` com drag-and-drop, mapeamento, validação, pré-visualização e confirmação implementado.
- Duração Excel convertida para minutos inteiros; valor bruto, texto e fórmula preservados para auditoria.
- Fixture e testes de importação usam exclusivamente dados sintéticos anonimizados.
- Dependências de produção auditadas após atualização do SheetJS 0.20.3: nenhuma vulnerabilidade conhecida.
- Modelo PostgreSQL normalizado criado numa migration local, com tenancy, RLS, auditoria e reversão controlada de imports.
- Testes pgTAP de constraints e RLS criados com dados sintéticos; execução pendente por ausência de Docker local.
- O esquema e as migrations versionadas estão aplicados ao projeto Supabase remoto.
- Motor de preços implementado em TypeScript e PostgreSQL, com precedência por especificidade, vigências, oito tipos de cobrança e arredondamento monetário.
- Valores importado, calculado, efetivo e manual são preservados separadamente; não existe recálculo automático de histórico.
- Descontos percentuais/fixos e overrides manuais auditáveis implementados; preview e RPC de recálculo excluem overrides e faturados por omissão.
- Modal acessível de override e painel de confirmação do recálculo criados como componentes reutilizáveis, ainda sem ligação a dados reais.
- Testes unitários do motor/UI e teste pgTAP comercial usam apenas dados sintéticos.
- As duas migrations foram aplicadas com sucesso numa base PostgreSQL efémera para validação de sintaxe e dependências; os testes pgTAP continuam pendentes de uma stack Supabase local.
- Interface visual profissional implementada com design system semântico, shell responsivo, sidebar recolhível e cabeçalho operacional.
- Autenticação Supabase ligada ao frontend: login, logout, recuperação e redefinição de password, persistência de sessão e proteção integral do shell; não existe registo público.
- O módulo opcional de documentos legais permanece preservado, mas a aceitação foi desativada por decisão do proprietário; o produto é uma ferramenta interna de gestão de clientes e controlo de faturação.
- Aceitações legais versionadas, eventos de segurança, equipas e concessões por sociedade, cliente, processo, equipa ou utilizador foram modelados em migration com RLS.
- Edge Functions isolam convites administrativos, publicação atómica de documentos legais e registo sanitizado de eventos; a `service_role` nunca é exposta ao frontend.
- Bucket privado `legal-imports` declarado com limite, MIME types e políticas por sociedade; nenhuma alteração foi aplicada ao Supabase remoto.
- CI de pull requests criado com lint, typecheck, testes, build, E2E, auditoria de dependências, deteção de segredos e bloqueio de ficheiros sensíveis.
- Guias Windows, Supabase, Cloudflare, desenvolvimento e deployment preparados para trabalho consistente em vários computadores.
- Serviço Cloudflare `legal-carina` inspecionado sem alteração: atualmente responde apenas `Hello world`. Workers Static Assets é a opção recomendada e existe uma configuração proposta, não aplicada.
- As três migrations foram aplicadas ao Supabase remoto `vtvvqyebigflgqccbqsw`; os advisors de segurança não reportaram problemas após a aplicação.
- `dabranches@gmail.com` foi convidado e associado à organização Legal Carina com o papel backend `owner`.
- Passkeys Beta foram ativadas no Supabase para o ambiente local com RP ID `localhost` e origem `http://localhost:5173`; o frontend suporta ativação e login por Windows Hello/Face ID/PIN do dispositivo.
- O acesso inicial sem password usa um OTP temporário de oito algarismos; o frontend foi alinhado com a configuração remota e apresenta erros de passkey de forma explícita.
- A experiência de instalação PWA em Windows e iPhone é um requisito permanente: deve manter manifest, service worker atualizável, safe areas iOS, comportamento standalone e autenticação por passkey nos domínios HTTPS definitivos.
- Experiência iPhone/PWA implementada com `viewport-fit=cover`, safe areas reais nos quatro lados, `100dvh`, manifest, ícones iOS, service worker atualizável, modo escuro do sistema e redução de movimento.
- Matriz iPhone local exclusiva do servidor de desenvolvimento criada para 11 modelos, distinguindo Dynamic Island/notch, 59/62/47 px, Safari/PWA, orientação e tema; 14 testes de matriz e um teste de service worker de produção foram aprovados.
- Dashboard principal inclui 13 indicadores e 12 visualizações para o histórico 2018–2026, sempre identificadas como dados demonstrativos anonimizados.
- Dashboards reutilizáveis de cliente, sociedade faturante e profissional foram criados.
- Registos de trabalho têm tabela densa, filtros/chips, seleção, densidade, colunas, paginação e pré-confirmação de edição em massa.
- O ficheiro-base `20260407 HORAS ESCRITÓRIO.xlsx` foi importado sem alteração, com SHA-256 `2d72dda625ee4a1302298483b0df21e32d50e7597cad77f6027f7dd75dc6548d`, no lote reversível `c6079a6a-504d-4c5d-9277-0092230ca37d`.
- A carga contém 6.794 linhas efetivas: 5.934 limpas, 855 com avisos, 5 inválidas mantidas no relatório e 6.789 movimentos gravados; existem 194 clientes, 3 profissionais e 3 sociedades faturantes.
- A distinção de clientes permanece obrigatória entre `individual` (Particular) e `company` (Sociedade/Empresa); dois clientes com categoria histórica variável ficaram assinalados para revisão.
- Incoerências de faturação provenientes de importações auditadas entram sem bloqueio numa fila de revisão; 169 movimentos deste lote preservam exatamente os indicadores históricos contraditórios.
- A página autenticada “Revisão de importações” apresenta contagens por tipo de aviso e as primeiras 100 linhas da fila, sem recalcular ou eliminar movimentos.
- O dashboard geral está ligado a funções agregadas do Supabase sujeitas a RLS e apresenta horas, valores, faturação, recebimentos, clientes, arquivo e séries anuais/mensais reais.
- Os dashboards de cliente, sociedade faturante e profissional estão ligados aos dados importados, com seleção da entidade, indicadores, evolução e movimentos recentes.
- “Registos de trabalho” está ligado aos 6.789 movimentos reais através de uma função `SECURITY INVOKER`, com paginação no servidor, pesquisa, filtros, ordenação, seleção e fila de revisão, sempre sujeita a RLS.
- “Utilizadores” foi criado dentro de “Administração”, com listagem de membros e convite por email; a Edge Function valida owner/admin no backend e mantém o registo público desativado.
- As Edge Functions `admin-users` e `security-event` estão ativas no Supabase; `admin-users` exige JWT e papel owner/admin, enquanto `security-event` aceita eventos anónimos estritamente enumerados e valida o JWT nos eventos autenticados.
- A falha RLS `permission denied for function has_scope_access` foi corrigida: funções auxiliares privadas têm execução apenas para `authenticated`, e o módulo legal opcional permite acesso quando não existem documentos publicados, voltando a exigir aceitação se forem publicados no futuro.
- Estados de loading, vazio e erro foram preparados; a interface foi inspecionada localmente em desktop e telemóvel sem erros de consola.

## Integrações conhecidas

- GitHub: `dabranches-collab/legal-carina`.
- Supabase: referência `vtvvqyebigflgqccbqsw`, ligado localmente e com importação auditada concluída.
- Cloudflare: serviço `legal-carina` existente (não publicado nesta fase).

## Próxima etapa

Rever os 169 estados de faturação/pagamento incompletos e implementar a gestão CRUD de clientes, começando pela criação obrigatória como Particular ou Sociedade. Antes da publicação, definir o domínio HTTPS definitivo da PWA e voltar a configurar/registar as passkeys nesse domínio.

## Riscos abertos

- A autenticação está implementada; a passkey local ainda requer validação completa em Windows Hello e, depois da publicação segura, em Safari/iPhone com Face ID.
- Avenças e pacotes de horas estão preparados no modelo, sem gestão de saldos/consumo neste MVP.
- Pesquisa, notificações, exportação e ações em massa são ainda controlos visuais sem operação remota.
- Os dashboards e a tabela de registos usam dados reais; edição individual/em massa permanece deliberadamente desativada até o fluxo de confirmação, autorização e audit log ser ligado à interface.
- O Supabase remoto contém agora o esquema versionado e o lote de importação acima; o Cloudflare foi inspecionado apenas em leitura e a produção permanece intacta.
- A proteção remota da branch `main` não foi aplicada porque a autenticação atual do GitHub CLI é inválida; workflows, CODEOWNERS e Dependabot estão preparados localmente.
- Limites avançados de sessão, single-session, MFA obrigatório, SMTP dedicado, PITR ou retenção adicional podem exigir planos pagos ou serviços terceiros e devem ser confirmados antes da ativação.
- Passkeys permanecem experimentais no Supabase; a configuração local está vinculada a `localhost` e terá de ser alterada para o domínio HTTPS definitivo antes da publicação, exigindo novo registo das passkeys de produção.
- A matriz iPhone foi validada em Chromium; permanece obrigatório um smoke test final em Safari iOS e hardware real antes da publicação, sobretudo para teclado, zoom do sistema, instalação e atualização do service worker.
- Os 194 clientes do ficheiro-base estão no Supabase; dois exigem confirmação da categoria atual porque o histórico contém ambas as classificações.
- O parser XLSX deve permanecer carregado sob demanda e sujeito a revisão contínua de dependências para ficheiros não confiáveis.
- As asserções E2E passam, mas o invólucro Playwright/preview não encerra automaticamente nesta sessão Windows; validar novamente no futuro CI.
- Docker não está disponível neste ambiente, logo a migration e os testes pgTAP ainda não foram executados num PostgreSQL local.
