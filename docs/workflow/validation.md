# Validação e continuidade do workflow — 09-10-2026


## Estado actual da entrega

Branch `codex/workflow-prototype-20261009`, em `/workspace/legal-carina`. Frontend 0.16.0 em preparação; protótipo independente 0.16.0-preview.2. O commit de integração `9ba01aae88e3f6675cc5827068c8a2b5705fdd2c` foi enviado e confirmado directamente no GitHub por `git ls-remote` em 09-10-2026; este registo documental segue esse commit na mesma branch. O bloqueio de rede anterior ficou resolvido. O SHA final desta entrega é o HEAD da branch após o commit documental e será novamente verificado directamente após o push.

A integração real conserva os componentes existentes e exige `workflow=preview` em DEV/teste. A ficha organizada em cinco grupos está concluída no protótipo; **a reorganização da ficha real continua pendente**. O checkout não tinha alterações por guardar: 9ba01aa já continha todo o código real preparado. História e trabalho existentes preservados.

Nesta entrega executados: auditoria `node scripts/workflow/audit.mjs --operational-preview` (84 funções, 16 vistas antigas, dez ficheiros operacionais previstos), segurança `node scripts/check-sensitive-files.mjs` e `git diff --check`, aprovados. Só documentação alterada; os testes de implementação abaixo são resultados de execuções anteriores, não repetidos agora.

Pendências: ficha real em cinco grupos; filtros globais transversais; interacções adicionais dos gráficos operacionais; E2E da integração real; Safari/iPhone físico; ensaios integrados Azure/Storage/regras/perfis; revisão pelos operadores. Os testes SQL ficaram por executar por ausência de `@electric-sql/pglite` no ambiente.

Nenhum merge em main, deploy, migration ou operação em dados reais/permissões/serviços de produção. Versão instalada não reconfirmada nesta entrega; nenhum deployment/version ID novo. Os relatos históricos abaixo distinguem preparação isolada e primeira integração.

## Preparação isolada — contexto histórico

Base `88adcd6471f3ef469470c6a0899dd1dc6a187eb7`; versão operacional do código-base 0.15.1 antes da primeira integração. A consulta HTTP de versão nessa preparação devolveu 403; não usar esse registo como confirmação da versão instalada agora.

## Evidência concluída

- Inventário: 84 funcionalidades com origem e acesso actual/proposto; 58 demonstradas parcialmente com dados fictícios, 25 mapeadas, uma em preparação. 16 rotas antigas cobertas pela proposta. Nenhum ficheiro operacional alterado.
- Playwright: 40 cenários aprovados, dez percursos em desktop, tablet, iPhone vertical e horizontal (Chromium emulado). Temas, navegação, contexto/filtros, tradução falhada, versões, PDF/Word, recebimentos parciais, contratos e perfis simulados. Pedidos externos bloqueados e erros JavaScript monitorizados. 84 capturas.
- Conteúdo francês e marca DEMO verificados nos PDF e Word descarregados nos quatro formatos de ecrã.
- 303 testes unitários existentes, 59 ficheiros, aprovados. Segurança de ficheiros, lint, TypeScript e build operacional aprovados. Protótipo ausente do bundle operacional.
- Build independente e HTML autónomo gerados. HTML servido localmente verificado sem pedidos externos nem erros JavaScript.

## Limites e revisão antes de activar

As integrações reais (incluindo Azure Translator, autenticação, permissões, arquivos e regras financeiras no servidor) não foram exercitadas: só foram inventariadas, com comportamentos parciais simulados. Nada foi gravado no backend. Os testes SQL não puderam executar por falta de `@electric-sql/pglite` no ambiente; não houve alterações SQL.

A política do Chromium deste ambiente bloqueia `file://`: execução do HTML por esse protocolo não verificada. O PDF é a entrega para leitura no iPhone; o HTML exige navegador que permita ficheiros locais ou servidor de revisão. Localhost não é acessível remotamente no iPhone.

Faltam revisão humana pelos operadores, teste num iPhone físico/Safari, ligação dos componentes existentes e validação integrada das regras/autorização antes de qualquer activação. A comparação de percursos é estrutural, sem medição de tempos reais. Não há migração, merge em main ou deploy deste trabalho.

## Lote de pré-filtros — 09-10-2026

Nove caixas e três grupos de gráficos clicáveis; selecção global aplicada às listas, critérios indicados, remoção/retorno e histórico. Os 16 cenários novos validam quantidade de itens, exclusão de despesas nas horas, cliente/sociedade/responsável, notas/provisões/recebimentos, segmentos inclusivos de mistos, contratos, teclado e listas vazias. Suite completa do protótipo: 40/40. Lint, tipos e build independente aprovados. Os 303 unitários do lote anterior não foram repetidos; nenhum ficheiro operacional mudou. Os gráficos/indicadores operacionais completos continuam com reutilização obrigatória documentada.

## Primeira integração operacional — 0.16.0 em preparação

Navegação em cinco áreas ligada aos componentes reais; protegida por opção explícita apenas DEV/teste. A navegação normal mantém-se predefinida. Nenhuma operação no backend, Auth/RLS/Storage/Worker ou migrations. Auditoria `--operational-preview` verifica uma lista exacta de ficheiros previstos, mantendo o modo de isolamento estrito sem essa opção. Dez ficheiros operacionais preparados neste lote, incluindo testes, versão e notas.

A suite unitária completa inicial passou 307 testes; depois da conservação do modo em links internos/externos, os 19 testes relevantes passaram novamente (App, gate e AppLink). Verificação final integral: **310 testes aprovados em 61 ficheiros**, após os últimos ajustes. Segurança de ficheiros, auditoria do âmbito, lint, tipos e build aprovados. Tipos, lint e build operacional aprovados. Os 40 E2E anteriores validam apenas o protótipo. Falta E2E em browser da integração real, Safari físico, ficha reorganizada e validação das integrações antes de activar. Nesse lote o push ficou pendente por restrição de rede; resolvido nesta entrega, como registado no estado actual acima.
