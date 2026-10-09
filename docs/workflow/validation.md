# Validação da preparação — 09-10-2026

Branch `codex/workflow-prototype-20261009`; base `88adcd6471f3ef469470c6a0899dd1dc6a187eb7` (origin/main confirmado por fetch). Versão operacional local 0.15.1 preservada; protótipo separado 0.16.0-preview.2. Produção não alterada; consulta HTTP de versão devolveu 403, pelo que não se reconfirma aqui a versão instalada.

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

A suite unitária completa inicial passou 307 testes; depois da conservação do modo em links internos/externos, os 19 testes relevantes passaram novamente (App, gate e AppLink). Verificação final integral: **310 testes aprovados em 61 ficheiros**, após os últimos ajustes. Segurança de ficheiros, auditoria do âmbito, lint, tipos e build aprovados. Tipos, lint e build operacional aprovados. Os 40 E2E anteriores validam apenas o protótipo. Falta E2E em browser da integração real, Safari físico, ficha reorganizada e validação das integrações antes de activar. Push do lote operacional pendente por restrição de rede do sandbox; não pedir repetidamente a autorização já recebida.
