# Preparação da próxima publicação

Data da revisão local: 2026-08-16  
Versão candidata: **0.2.0**  
Estado: **aguarda aprovação; não publicada**

## Pronto no código local

- navegação, cabeçalho responsivo, contraste claro/escuro, PWA e actualização visível;
- dashboards, registos, clientes, Sociedades e Responsáveis ligados a modelos de leitura autorizados;
- administração de utilizadores com nome visível, username, PIN inicial, alteração obrigatória, suspensão, reposição e mensagem copiável;
- perfis proprietário, administrador, gestor, financeiro, advogado, consulta e auditor;
- permissões editáveis de visibilidade e valores financeiros por Sociedade;
- tabela normalizada com pesquisa, filtros, ordenação múltipla, colunas, larguras, paginação, XLSX, impressão/PDF e persistência;
- importação XLSX/CSV em análise e confirmação, preservando dados originais, diferenças e linhas inválidas;
- motor seguro de overrides e recálculo com confirmação;
- criação, edição operacional e acções em massa de movimentos através de endpoints transaccionais, com motivo, confirmação e auditoria;
- documentos privados por cliente, hash, validação de conteúdo no browser e no backend, uploads directos bloqueados e ligações assinadas de 60 segundos;
- limites de login por PIN transaccionais e por IP anonimizado;
- Worker preparado com cabeçalhos de segurança.

## Validação concluída

- lint e TypeScript aprovados;
- 42 testes unitários aprovados;
- 24 testes E2E aprovados em duas execuções limpas: 23 cenários funcionais/responsivos e 1 cenário isolado no preview de produção, incluindo o respectivo service worker;
- 11 modelos iPhone e 7 resoluções Windows validados;
- build aprovado, sem source maps;
- verificação local de ficheiros sensíveis e histórico Git sem segredo confirmado;
- `git diff --check` aprovado.

## Bloqueios antes da publicação

1. Concluir a decisão de histórico dos onze pares já mapeados e da migration de username/PIN aplicada fora do histórico, sem executar `migration repair` por suposição.
2. Aplicar as migrations novas apenas depois dessa reconciliação.
3. Executar pgTAP e testes reais de RLS para anónimo, consulta, advogado, financeiro, gestor, administrador, auditor e acessos fora do âmbito.
4. Confirmar no Supabase que o bucket documental é privado e que as URLs assinadas expiram.
5. Publicar as Edge Functions actualizadas e validar CORS, rate limiting, PIN, permissões e logs.
6. Criar um preview sem dados reais, auditar rede, consola e bundle exacto, e só depois promover o Worker.

## Acções proibidas sem nova aprovação

- commit, push ou merge;
- alteração do histórico remoto de migrations;
- aplicação de migrations remotas;
- deploy de Edge Functions;
- deploy Cloudflare ou alteração da produção.
