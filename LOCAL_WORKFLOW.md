# Trabalho local e continuidade entre computadores

## Identificar e reutilizar o projecto

Antes de criar uma pasta ou executar comandos de desenvolvimento, procurar o projecto em `C:\Dev`, incluindo subpastas e nomes aproximados. Confirmar a identidade pelo remoto Git, `package.json`, README e conteúdo; um nome de pasta diferente não significa outro projecto. Reutilizar o clone correspondente e preservar alterações existentes. Se houver várias cópias, inventariar HEAD, branches, alterações staged/unstaged, ficheiros untracked, stashes e worktrees antes de escolher ou consolidar. Não duplicar, mover ou apagar cópias automaticamente.

Se não existir um clone local adequado, preferir um clone do remoto GitHub verificado para uma pasta local. Verificar primeiro remotos e credenciais existentes; não copiar nem hidratar recursivamente a árvore `.git` de uma cópia OneDrive. Um backup parcial não demonstra preservação completa do histórico ou das diferenças locais. Documentar diferenças ainda não reconciliadas e pedir o âmbito necessário antes de aceder a ficheiros externos em falta.

## Verificar caminhos antes de executar

O código, metadados Git, worktrees, `node_modules`, dependências, builds, caches, temporários, logs, downloads de ferramentas e outputs de trabalho devem residir fisicamente fora de OneDrive e de pastas sincronizadas.

Verificar a raiz real do checkout e os destinos físicos, incluindo junctions, symlinks, reparse points e os seus directórios ascendentes. Um caminho aparentemente local ou uma pasta chamada Documentos não prova localização física local. Confirmar também os caminhos devolvidos por `git rev-parse --absolute-git-dir` e `git rev-parse --path-format=absolute --git-common-dir`: um worktree local pode depender de metadados Git numa pasta sincronizada.

Rever `TEMP`, `TMP`, cache npm, store pnpm, configurações locais dos gestores de pacotes e opções de output antes de instalar, testar, construir ou iniciar servidores. Usar as ferramentas instaladas para confirmar os valores efectivos, por exemplo `npm config get cache` e `pnpm store path`. Resolver os caminhos e efectuar, quando necessário, uma prova de escrita/leitura/remoção de um ficheiro temporário único apenas num destino local confirmado. Se algum destino resolver para OneDrive, corrigir a configuração de trabalho local ou interromper o comando antes de escrever.

Usar caminhos portáteis derivados da raiz do repositório, argumentos ou variáveis locais. `C:\Dev` é um exemplo Windows; não é uma dependência de runtime nem obriga a recriar pastas já identificadas. Não versionar paths pessoais, credenciais, inventários de computadores ou ficheiros operacionais reais. Não alterar segurança, políticas do sistema ou sincronização para resolver caminhos de trabalho.

## OneDrive

OneDrive é apenas fonte de consulta pontual no âmbito autorizado. Uma escrita requer indicação explícita do ficheiro concreto pelo utilizador; essa indicação não autoriza escrita noutras pastas ou ficheiros, limpeza, migração em massa ou alterações de sincronização.

Não executar Git, desenvolvimento, instalação de dependências, builds ou servidores em OneDrive. Não hidratar, copiar ou percorrer recursivamente uma árvore `.git` OneDrive: leituras de placeholders podem provocar muitas transferências. Não retomar uma cópia interrompida sem avaliar o âmbito e a autorização. Preferir GitHub para obter código e histórico; preservar a origem e reportar diferenças em falta. Não apagar/restaurar ficheiros, esvaziar reciclagens ou parar OneDrive como consequência destas instruções.

## Aplicação e dados independentes do computador

Clones locais são ferramentas de desenvolvimento, não dependências da aplicação publicada. Código e instruções partilhados devem estar no GitHub; dados operacionais pertencem aos serviços alojados autorizados. A aplicação publicada e os seus dados não devem depender da disponibilidade de um PC, de `C:\Dev`, de localhost, de um checkout ou de sincronização OneDrive. Esta regra de trabalho não autoriza deploy, migração, alteração de dados, criação de recursos ou mudança de custos.

## Sincronizar e deixar continuidade verificável

Inventariar e preservar trabalho local antes de `fetch`, mudança de branch ou qualquer sincronização. Consultar o remoto, comparar HEAD/branch/upstream e identificar commits não enviados; não efectuar `pull`, `reset`, `clean`, `stash` ou force push sobre trabalho desconhecido. Coordenar ficheiros e branches com tarefas activas. Preparar alterações coerentes, testar em proporção ao âmbito e adicionar ao commit apenas os ficheiros da tarefa autorizada.

Quando houver autorização de publicação Git, fazer commit/push da branch adequada, confirmar directamente o HEAD remoto e registar no handover: repositório, branch, commit, PR, âmbito, testes executados, estado local preservado, diferenças por reconciliar e próxima acção. Distinguir documentação numa PR draft da documentação já na branch principal. Uma regra numa branch não buscada não está automaticamente disponível aos agentes de outro computador.

Noutro PC: identificar primeiro o clone existente, confirmar os caminhos físicos e caches desse PC, obter a branch/commit correcto do GitHub e ler AGENTS e handover. Não presumir acesso, sincronização ou correcção de outro computador sem verificá-lo. Merge, deploy e operações sobre dados exigem a autorização própria.
