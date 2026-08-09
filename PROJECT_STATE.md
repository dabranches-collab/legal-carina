# Estado do projeto

Atualizado em: 2026-08-09

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
- Nenhuma migration foi aplicada ao projeto Supabase remoto.
- Motor de preços implementado em TypeScript e PostgreSQL, com precedência por especificidade, vigências, oito tipos de cobrança e arredondamento monetário.
- Valores importado, calculado, efetivo e manual são preservados separadamente; não existe recálculo automático de histórico.
- Descontos percentuais/fixos e overrides manuais auditáveis implementados; preview e RPC de recálculo excluem overrides e faturados por omissão.
- Modal acessível de override e painel de confirmação do recálculo criados como componentes reutilizáveis, ainda sem ligação a dados reais.
- Testes unitários do motor/UI e teste pgTAP comercial usam apenas dados sintéticos.
- As duas migrations foram aplicadas com sucesso numa base PostgreSQL efémera para validação de sintaxe e dependências; os testes pgTAP continuam pendentes de uma stack Supabase local.
- Interface visual profissional implementada com design system semântico, shell responsivo, sidebar recolhível e cabeçalho operacional.
- Autenticação Supabase ligada ao frontend: login, logout, recuperação e redefinição de password, persistência de sessão e proteção integral do shell; não existe registo público.
- Primeiro acesso bloqueado por modal obrigatório até à aceitação explícita dos Termos de Serviço, Política de Privacidade e Termos de RGPD publicados. Os textos jurídicos não foram inventados nem publicados.
- Aceitações legais versionadas, eventos de segurança, equipas e concessões por sociedade, cliente, processo, equipa ou utilizador foram modelados em migration com RLS.
- Edge Functions isolam convites administrativos, publicação atómica de documentos legais e registo sanitizado de eventos; a `service_role` nunca é exposta ao frontend.
- Bucket privado `legal-imports` declarado com limite, MIME types e políticas por sociedade; nenhuma alteração foi aplicada ao Supabase remoto.
- CI de pull requests criado com lint, typecheck, testes, build, E2E, auditoria de dependências, deteção de segredos e bloqueio de ficheiros sensíveis.
- Guias Windows, Supabase, Cloudflare, desenvolvimento e deployment preparados para trabalho consistente em vários computadores.
- Serviço Cloudflare `legal-carina` inspecionado sem alteração: atualmente responde apenas `Hello world`. Workers Static Assets é a opção recomendada e existe uma configuração proposta, não aplicada.
- As três migrations foram aplicadas ao Supabase remoto `vtvvqyebigflgqccbqsw`; os advisors de segurança não reportaram problemas após a aplicação.
- `dabranches@gmail.com` foi convidado e associado à organização Legal Carina com o papel backend `owner`.
- Passkeys Beta foram ativadas no Supabase para o ambiente local e o frontend suporta login/ativação por passkey, acesso temporário por email e aviso explícito de recuperação.
- O acesso inicial sem password passou a usar um OTP temporário de seis algarismos; o modelo remoto de email usa `{{ .Token }}` e o frontend valida o código antes de permitir o registo da passkey.
- Experiência iPhone/PWA implementada com `viewport-fit=cover`, safe areas reais nos quatro lados, `100dvh`, manifest, ícones iOS, service worker atualizável, modo escuro do sistema e redução de movimento.
- Matriz iPhone local exclusiva do servidor de desenvolvimento criada para 11 modelos, distinguindo Dynamic Island/notch, 59/62/47 px, Safari/PWA, orientação e tema; 14 testes de matriz e um teste de service worker de produção foram aprovados.
- Dashboard principal inclui 13 indicadores e 12 visualizações para o histórico 2018–2026, sempre identificadas como dados demonstrativos anonimizados.
- Dashboards reutilizáveis de cliente, sociedade faturante e profissional foram criados.
- Registos de trabalho têm tabela densa, filtros/chips, seleção, densidade, colunas, paginação e pré-confirmação de edição em massa.
- Estados de loading, vazio e erro foram preparados; a interface foi inspecionada localmente em desktop e telemóvel sem erros de consola.

## Integrações conhecidas

- GitHub: `dabranches-collab/legal-carina`.
- Supabase: referência `vtvvqyebigflgqccbqsw` (não ligado localmente nesta fase).
- Cloudflare: serviço `legal-carina` existente (não publicado nesta fase).

## Próxima etapa

Obter revisão jurídica e publicar as três versões legais num ambiente local/staging; depois executar migrations, pgTAP e os advisors do Supabase nesse ambiente antes de qualquer promoção remota. Em paralelo, reautenticar o GitHub CLI para ativar a proteção de `main` com os checks documentados.

## Riscos abertos

- A autenticação está implementada, mas aguarda validação integrada numa stack Supabase local/staging com utilizadores convidados e documentos jurídicos aprovados.
- Avenças e pacotes de horas estão preparados no modelo, sem gestão de saldos/consumo neste MVP.
- Pesquisa, notificações, exportação e ações em massa são ainda controlos visuais sem operação remota.
- Os gráficos atuais não representam dados reais; devem receber agregações validadas do Supabase antes de uso operacional.
- O Supabase remoto não foi alterado. O Cloudflare foi inspecionado apenas em leitura e a produção permanece intacta.
- A proteção remota da branch `main` não foi aplicada porque a autenticação atual do GitHub CLI é inválida; workflows, CODEOWNERS e Dependabot estão preparados localmente.
- Limites avançados de sessão, single-session, MFA obrigatório, SMTP dedicado, PITR ou retenção adicional podem exigir planos pagos ou serviços terceiros e devem ser confirmados antes da ativação.
- Passkeys permanecem experimentais no Supabase; a configuração local está vinculada a `127.0.0.1` e terá de ser alterada para o domínio HTTPS definitivo antes da publicação, exigindo novo registo das passkeys de produção.
- A matriz iPhone foi validada em Chromium; permanece obrigatório um smoke test final em Safari iOS e hardware real antes da publicação, sobretudo para teclado, zoom do sistema, instalação e atualização do service worker.
- A contagem de clientes existentes exige consulta futura ao Supabase; nesta fase, a folha `CLIENTES` é apenas referência local.
- O parser XLSX deve permanecer carregado sob demanda e sujeito a revisão contínua de dependências para ficheiros não confiáveis.
- As asserções E2E passam, mas o invólucro Playwright/preview não encerra automaticamente nesta sessão Windows; validar novamente no futuro CI.
- Docker não está disponível neste ambiente, logo a migration e os testes pgTAP ainda não foram executados num PostgreSQL local.
