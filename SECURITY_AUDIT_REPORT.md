# Relatório de auditoria de segurança

Data: 2026-08-16  
Ambiente: checkout e build de produção locais  
Commit auditado: alterações locais ainda não commitadas sobre `main`  
Decisão: **NÃO PRONTA PARA PUBLICAÇÃO**

## Verificações concluídas

- Ficheiros sensíveis e padrões de segredos no checkout/histórico: nenhum segredo confirmado. A pesquisa dirigida no histórico devolveu zero commits para atribuições de service role/Cloudflare token, chaves privadas e prefixos usuais `sbp_`/`sk-`.
- Build aprovado e com zero source maps. A pesquisa no bundle encontrou apenas a expressão explicativa “service role”, sem qualquer valor, token ou chave privilegiada.
- `pnpm audit --prod --audit-level high`: nenhuma vulnerabilidade conhecida reportada em 2026-08-16.
- Read models locais aplicam âmbito e mascaramento financeiro; escrita financeira exige permissão por Sociedade.
- Facturas, pagamentos, regras de preço e exportação integral de movimentos usam funções de leitura com âmbito e mascaramento financeiro preparados no backend.
- A substituição das permissões por Sociedade foi consolidada numa única operação transaccional privilegiada.
- Migration local de documentos define bucket privado, limite e políticas por cliente.
- Uploads documentais validam assinatura de conteúdo, extensão, estrutura OOXML e rejeitam referências VBA/macros no browser e novamente numa Edge Function autenticada; escritas directas no bucket e nos metadados ficam revogadas.
- Falhas de PIN passam por contador transaccional e limitação por IP anonimizado; o endereço original não é persistido.
- Worker local inclui CSP, `nosniff`, protecção de framing, política de permissões, HSTS e controlo de cache.
- `wrangler deploy --dry-run` concluiu a compilação do Worker e dos 25 assets sem efectuar publicação; binding `ASSETS` reconhecido.

## Correcções locais

- Revogado acesso directo autenticado a movimentos e às funções privadas de override/recálculo.
- Eliminada inferência por ordenação de montantes ocultos.
- Restringidas opções e indicadores ao âmbito autorizado.
- Corrigida a ordem das migrations para impedir falha ou regressão de segurança.
- Protegidas células XLSX exportadas contra injecção de fórmulas.
- Actualizados os testes pgTAP para o modelo vigente: ausência de gate legal, bloqueio pelo PIN inicial, `client_profile_id`, grants por âmbito e perfil Gestor.
- Restringida a leitura de lotes e linhas brutas de importação a proprietário/administrador; a localização do menu deixou de ser a única barreira.
- Alinhadas as políticas residuais de eventos e grants com a remoção dos termos; o Auditor recebe leitura imutável do audit log apenas após concluir o PIN inicial.
- Corrigida uma falha alta antes da publicação: grants antigos já não funcionam quando a associação do utilizador ao escritório está suspensa.
- Neutralizado o módulo legal residual sem apagar histórico: helpers de associação já não dependem de termos e os endpoints/tabelas legais deixaram de estar expostos ao frontend.
- Endurecida a Administração: PIN inicial bloqueia chamadas directas, convites por email foram retirados, suspensão/perfil geram auditoria e utilizadores suspensos não podem alterar o PIN.
- A alteração de perfil e do estado activo foi encapsulada numa transacção que actualiza a associação e o audit log em conjunto; o proprietário continua protegido contra alteração por esta via.
- Ao promover um utilizador a administrador, a mesma transacção elimina autorizações restritas antigas, impedindo que reapareçam silenciosamente numa futura despromoção.
- Refresh e autenticação por passkey passam por uma verificação backend do estado activo e da troca obrigatória do PIN; uma sessão Auth válida já não basta para entrar na aplicação.
- Removida a autorização histórica de inserção directa em `security_events`; os eventos passam a ser append-only através das Edge Functions autenticadas.
- `manual_overrides` passou a ser evidência imutável: sem INSERT/UPDATE/DELETE directo no frontend, sendo a criação limitada ao endpoint que exige âmbito, acesso financeiro e motivo.
- Substituídas políticas genéricas de membro em Sociedades, clientes, contactos, perfis e processos por políticas de âmbito efectivo; nomes e metadados deixam de ser consultáveis apenas por pertencer ao mesmo escritório.
- Revogadas mutações directas de movimentos; criação, edição operacional e acções em massa usam endpoints com autenticação, âmbito, autorização financeira, motivo e transacção única.
- Corrigida a criação sem regra de preço: o movimento fica explicitamente sem preço, sem falhar nem inventar um valor.
- A criação de utilizadores por PIN finaliza associação, credencial e auditoria numa única transacção; uma falha elimina o utilizador Auth recém-criado. Falhas de persistência dos eventos de login/PIN deixam de ser ignoradas.

## Testes obrigatórios pendentes

- Aplicar migrations num ambiente autorizado e executar pgTAP para perfis, RLS e UUID directos.
- A estação actual não dispõe de Docker; por isso, a suite pgTAP corrigida não pode ser executada contra uma stack Supabase local nesta fase.
- Confirmar anon e utilizadores fora do âmbito sem acesso pela Data API.
- Confirmar Storage privado, MIME/conteúdo, nomes e expiração de URLs assinadas.
- Inspeccionar logs Supabase/Cloudflare, CORS, sessões, rede, consola, uploads e exports.
- Testar Edge Functions e confirmar que `service_role` nunca chega ao browser.
- Repetir auditoria no artefacto exacto a publicar e validar todos os perfis funcionais.

## Evidência local de qualidade

- Lint e TypeScript: aprovados.
- Testes unitários: 42/42 aprovados.
- E2E: 24 cenários aprovados em duas execuções limpas. A suite normal aprovou 23 e omitiu correctamente o cenário reservado ao build; o cenário isolado de produção confirmou registo, activação, scope e cache versionada do service worker.
- Build: aprovado; pesquisa de ficheiros `.map` sem resultados.
- Matriz visual: iPhone compacto, iPhone Pro com safe top de 62 px e Windows 1920×1200 inspeccionados em claro/escuro; foi corrigida uma truncagem no cabeçalho móvel e repetidos os 14 testes iPhone.

## Riscos residuais

- As novas políticas são apenas locais e ainda não protegem o ambiente remoto.
- O dry-run remoto detectou divergência entre os identificadores do histórico de migrations e os ficheiros versionados; nenhuma reparação foi executada e qualquer push de base permanece bloqueado.
- Os novos endpoints e políticas ainda não foram executados nem testados no ambiente remoto.
- Passkeys e PWA exigem teste em hardware e domínio HTTPS definitivo.

O sistema não é apresentado como impossível de violar. “PRONTA PARA PUBLICAÇÃO” só será atribuído após evidência dos testes pendentes e ausência de vulnerabilidades críticas ou altas.
