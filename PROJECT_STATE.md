# Estado do projeto

Atualizado em: 2026-08-04

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
- Dashboard principal inclui 13 indicadores e 12 visualizações para o histórico 2018–2026, sempre identificadas como dados demonstrativos anonimizados.
- Dashboards reutilizáveis de cliente, sociedade faturante e profissional foram criados.
- Registos de trabalho têm tabela densa, filtros/chips, seleção, densidade, colunas, paginação e pré-confirmação de edição em massa.
- Estados de loading, vazio e erro foram preparados; a interface foi inspecionada localmente em desktop e telemóvel sem erros de consola.

## Integrações conhecidas

- GitHub: `dabranches-collab/legal-carina`.
- Supabase: referência `vtvvqyebigflgqccbqsw` (não ligado localmente nesta fase).
- Cloudflare: serviço `legal-carina` existente (não publicado nesta fase).

## Próxima etapa

Ligar o shell à autenticação Supabase e substituir os datasets demonstrativos por consultas agregadas protegidas por RLS. Em paralelo, executar migrations e pgTAP numa stack local ou branch de staging antes de qualquer promoção remota.

## Riscos abertos

- A autenticação ainda não está ligada ao frontend; tenancy e RLS estão modelados, mas aguardam validação numa stack Supabase real.
- Avenças e pacotes de horas estão preparados no modelo, sem gestão de saldos/consumo neste MVP.
- Pesquisa, notificações, logout, exportação e ações em massa são ainda controlos visuais sem operação remota.
- Os gráficos atuais não representam dados reais; devem receber agregações validadas do Supabase antes de uso operacional.
- As integrações Supabase e Cloudflare ainda não foram autenticadas ou verificadas remotamente.
- A contagem de clientes existentes exige consulta futura ao Supabase; nesta fase, a folha `CLIENTES` é apenas referência local.
- O parser XLSX deve permanecer carregado sob demanda e sujeito a revisão contínua de dependências para ficheiros não confiáveis.
- As asserções E2E passam, mas o invólucro Playwright/preview não encerra automaticamente nesta sessão Windows; validar novamente no futuro CI.
- Docker não está disponível neste ambiente, logo a migration e os testes pgTAP ainda não foram executados num PostgreSQL local.
