# Auditoria de conclusão local

Data: 2026-08-16  
Versão candidata: 0.2.0  
Âmbito: checkout local; nenhuma alteração remota autorizada nesta fase.

## Critério usado

Uma funcionalidade só é classificada como concluída quando existe implementação local identificável e uma validação proporcional. Tudo o que depende do Supabase ou Cloudflare remoto permanece separado como `PENDENTE REMOTO`, mesmo quando o código local está pronto.

## Estado por área

| Área | Estado local | Prova principal | Falta antes de produção |
|---|---|---|---|
| Identidade visual, navegação e localização | CONCLUÍDO LOCAL | `AppShell`, tokens, favicon/manifest e E2E Windows/iPhone | smoke test no domínio final |
| PWA Windows/iPhone | CONCLUÍDO LOCAL | manifest, service worker, safe areas, matriz de 11 iPhones e 7 Windows | validar instalação/Face ID em hardware e HTTPS |
| Login por utilizador + PIN/passkey | CONCLUÍDO LOCAL | AuthGate, `pin-auth`, PIN inicial obrigatório, rate limit transaccional e validação backend de suspensão após refresh/passkey | publicar functions/migrations e testar no ambiente remoto |
| Perfis | CONCLUÍDO LOCAL | proprietário, administrador, gestor, financeiro, advogado, consulta e auditor | testes RLS reais para cada perfil |
| Permissões por Sociedade e valores | CONCLUÍDO LOCAL | formulário de criação/edição, grants atómicos e read models mascarados | aplicar migrations e executar casos de acesso cruzado |
| Administração de utilizadores | CONCLUÍDO LOCAL | criação, nome visível, username, PIN temporário, suspensão, reset, mensagem copiável e alteração transaccional com auditoria | publicar Edge Functions/migrations e executar smoke test real |
| Histórico de acessos | CONCLUÍDO LOCAL | lista apenas para proprietário e agrupamento consecutivo | validar logs reais e política de retenção |
| Dashboards | CONCLUÍDO LOCAL | métricas, comparação anual, evolução por Sociedade e rótulos persistentes | validar queries remotas após migrations |
| Clientes particular/empresa/misto | CONCLUÍDO LOCAL | dashboards e manutenção de dados mestre | validar edição com RLS |
| Documentos de cliente | CONCLUÍDO LOCAL | UI, bucket privado, assinatura/conteúdo, hash, Edge Function e URL de 60 s | aplicar Storage/RLS e testar ficheiro privado real autorizado |
| Registos de trabalho | CONCLUÍDO LOCAL | todos os resultados autorizados alimentam a tabela normalizada; pesquisa, filtros, paginação, selecção, criação/edição, acções em massa e recálculo | validar endpoint integral e volume real após aplicar migrations |
| Padrão reutilizável de tabelas | CONCLUÍDO LOCAL | pesquisa, filtros tipados, multisselecção, ordenação múltipla, colunas, larguras, paginação, XLSX, impressão/PDF e persistência | validação visual adicional em dados remotos de grande volume |
| Importação XLSX/CSV | CONCLUÍDO LOCAL | análise/validação, detecção de conteúdo activo, confirmação transaccional e revisão | aplicar função SQL e testar cópia anonimizada no remoto autorizado |
| Motor de preços, overrides e recálculo | CONCLUÍDO LOCAL | funções seguras, precedência, descontos e testes unitários | executar pgTAP e teste integrado remoto |
| Facturação, pagamentos, processos, relatórios e auditoria | PREPARADO/EM CONSTRUÇÃO | read models e páginas de consulta agrupadas em “Em construção” | fluxos completos de criação/edição pertencem a fases seguintes |
| Segurança do Worker | CONCLUÍDO LOCAL | CSP e cabeçalhos no Worker, build sem source maps | auditar resposta exacta após deploy |
| Documentos legais obrigatórios | REMOVIDO | fluxo e gate retirados por decisão explícita do proprietário | nenhuma acção |

## Validações locais mais recentes

- TypeScript e lint: aprovados.
- Testes unitários: 42/42 aprovados.
- E2E: 24 cenários aprovados em duas execuções limpas, incluindo PWA e matrizes responsivas. A suite normal aprovou 23 e omitiu correctamente o teste exclusivo do build; o preview de produção aprovou separadamente o service worker.
- Build de produção: aprovado e sem source maps.
- Cloudflare Worker: compilação `--dry-run` aprovada, sem publicação.
- Ficheiros sensíveis proibidos: nenhum encontrado no checkout versionável.
- `git diff --check`: aprovado; apenas avisos esperados de normalização LF/CRLF.

## Limites desta conclusão

O código local não equivale a produção validada. Não foram aplicadas as migrations novas, não foram publicadas as Edge Functions e não foi feito deploy desta versão. A aplicação não deve receber o estado `PRONTA PARA PUBLICAÇÃO` até concluir a reconciliação do histórico de migrations e os testes remotos de RLS, Storage, perfis, rede e bundle exacto.

As verificações de código confirmaram ainda que uma suspensão exige associação activa antes de qualquer grant, que linhas brutas de importação são administrativas e que o perfil Auditor tem apenas leitura do audit log. Estas garantias continuam por provar numa base com as migrations efectivamente aplicadas.

## Funcionalidade deliberadamente fora desta entrega

- fluxos completos dos módulos que continuam explicitamente em “Em construção”.
