# Estado do projeto

Atualizado em: 2026-08-16

## Atualização — identidade, acesso e PWA

- Nome visível alterado para **Carina - Legal** e monograma para **CS**.
- Ícones PWA redesenhados com cantos concêntricos e margem adequada à máscara Apple.
- Login principal por nome de utilizador e PIN de quatro algarismos; o PIN não é persistido no código nem na base de dados.
- Utilizador proprietário `dabranches` configurado e autenticação validada no endpoint Supabase.
- Bloqueio temporário após cinco tentativas falhadas e eventos de segurança auditáveis.
- Administração permite criar utilizadores com perfil e configurar visibilidade e valores por sociedade faturante.
- A estrutura backend separa visibilidade operacional (`access_grants`) da autorização financeira (`billing_entity_financial_permissions`). Os restantes read models financeiros ainda exigem mascaramento integral antes de atribuir perfis restritos a dados reais.
- Botão de instalação PWA com instruções para iPhone/iPad, Windows e Android; atualização do service worker mantém aviso explícito de nova versão.
- Verificação local concluída: segurança de ficheiros, lint, TypeScript, 27 testes unitários e build de produção.

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
- Frontend publicado no Cloudflare Worker `legal-carina` através de Workers Static Assets, com fallback de SPA, no endereço `https://legal-carina.dabranches.workers.dev` (versão `78a85830-f22f-4a0f-a80d-c4ca260ff2f7`).
- Publicação validada no browser integrado: página de login carregada por HTTPS sem erros de consola; build sem source maps e sem padrões proibidos de service-role, tokens Cloudflare ou chaves privadas.
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
- A consulta autenticada de movimentos foi otimizada sem retirar RLS: a verificação legal passou a `initPlan`, a permissão de âmbito permanece numa função privada, e paginação/contagem deixaram de materializar todos os joins. A contagem dos 6.789 movimentos desceu de cerca de 2,17 s para 0,42 s e a resposta completa da primeira página mede cerca de 0,55 s.
- O CI passou a autorizar explicitamente apenas os scripts de instalação de `esbuild` e `workerd`; instalação congelada, secret scan, lint, typecheck, 28 testes e build passam localmente.
- O audit de dependências deixou de reportar vulnerabilidades conhecidas após fixar a dependência transitiva `nanoid` na versão corrigida 3.3.18.
- O workspace pnpm declara explicitamente o pacote raiz e o projeto fixa `pnpm@11.19.0`, eliminando diferenças de resolução entre computadores, GitHub e Cloudflare.
- A configuração versionada do Wrangler executa `pnpm build` antes do deploy. O pipeline Workers Builds foi igualmente configurado com `pnpm build` e recebeu apenas as variáveis públicas necessárias ao frontend; não foi configurada qualquer `service_role`.

## Integrações conhecidas

- GitHub: `dabranches-collab/legal-carina`.
- Supabase: referência `vtvvqyebigflgqccbqsw`, ligado localmente e com importação auditada concluída.
- Cloudflare: Worker `legal-carina` publicado em `https://legal-carina.dabranches.workers.dev`.

## Próxima etapa

Validar o CI e a publicação automática remotos. Depois, alterar a gestão de acessos para que Administração crie cada utilizador com nome de utilizador, PIN e perfil/permissões atribuídos no mesmo fluxo; o frontend não deve expor email como identificador de login. O PIN nunca pode ser guardado em texto nem substituir controlos backend, rate limiting, bloqueio temporário, auditoria e RLS. Configurar também o domínio HTTPS definitivo e alinhar passkeys/Face ID/Windows Hello com esse domínio.

## Riscos abertos

- A autenticação está implementada; a passkey local ainda requer validação completa em Windows Hello e, depois da publicação segura, em Safari/iPhone com Face ID.
- Avenças e pacotes de horas estão preparados no modelo, sem gestão de saldos/consumo neste MVP.
- Pesquisa, notificações, exportação e ações em massa são ainda controlos visuais sem operação remota.
- Os dashboards e a tabela de registos usam dados reais; edição individual/em massa permanece deliberadamente desativada até o fluxo de confirmação, autorização e audit log ser ligado à interface.
- O Supabase remoto contém o esquema versionado e o lote de importação acima; o frontend Cloudflare está publicamente acessível, mas os dados continuam protegidos por autenticação e RLS.
- A proteção remota da branch `main` não foi aplicada porque a autenticação atual do GitHub CLI é inválida; workflows, CODEOWNERS e Dependabot estão preparados localmente.
- Limites avançados de sessão, single-session, MFA obrigatório, SMTP dedicado, PITR ou retenção adicional podem exigir planos pagos ou serviços terceiros e devem ser confirmados antes da ativação.
- A proteção contra passwords comprometidas continua desativada no Supabase Auth (único aviso de segurança atual dos advisors); avaliar ativação conforme o plano disponível.
- Passkeys permanecem experimentais no Supabase; a configuração continua vinculada a `localhost` e terá de ser alterada para o domínio HTTPS público, exigindo novo registo das passkeys de produção.
- A matriz iPhone foi validada em Chromium; permanece obrigatório um smoke test final em Safari iOS e hardware real antes da publicação, sobretudo para teclado, zoom do sistema, instalação e atualização do service worker.
- Os 194 clientes do ficheiro-base estão no Supabase; dois exigem confirmação da categoria atual porque o histórico contém ambas as classificações.
- O parser XLSX deve permanecer carregado sob demanda e sujeito a revisão contínua de dependências para ficheiros não confiáveis.
- As asserções E2E passam, mas o invólucro Playwright/preview não encerra automaticamente nesta sessão Windows; validar novamente no futuro CI.
- Docker não está disponível neste ambiente, logo a migration e os testes pgTAP ainda não foram executados num PostgreSQL local.
