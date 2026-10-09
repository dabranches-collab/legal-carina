# Percursos dos operadores: comparação e roteiro de revisão

Comparação estrutural dos controlos existentes com o protótipo. Ainda não é um ensaio com operadores reais nem uma medição de tempo. Contam-se escolhas de navegação, não o preenchimento dos campos.

| Tarefa | Percurso actual | Percurso proposto | Observação |
| --- | --- | --- | --- |
| Consultar cliente | Clientes → categoria → Ficha | Clientes → pesquisar/filtrar → Abrir ficha | Uma lista única; filtros mantêm-se ao voltar. |
| Lançar horas no cliente aberto | Cabeçalho → Novo registo → escolher cliente | Cliente → Novo registo | Contexto do cliente já preenchido; mesma operação que Adicionar > Registo. |
| Lançar horas globalmente | Cabeçalho → Novo registo | Adicionar → Registo | Mais uma escolha no menu global; o atalho da ficha conserva acesso directo. Rever a frequência com operadores antes de consolidar. |
| Criar despesa | Cabeçalho → Nova despesa | Adicionar → Despesa / Cliente → Trabalho → Nova despesa | Mesmo formulário; manter comprovativo/câmara na integração. |
| Editar registo | Registos → duplo clique | Trabalho → Editar | Botão explícito, incluindo touch; filtros e lista preservados. |
| Emitir nota a partir da ficha | Ficha → Nota de Honorários | Cliente → Preparar nota / Financeiro → Preparar nota | Um único formulário; idiomas e conteúdo no mesmo local. |
| Traduzir e emitir | Nota → idioma EN/FR → pré-visualizar/guardar | Mesma sequência no formulário comum | Falha impede emissão; reimpressão usa tradução guardada. Azure no protótipo é simulado. |
| Registar factura | Pagamentos → não facturados → detalhe → facturar | Financeiro → Por facturar → Registar factura | Facturação distinta de recebimento. |
| Receber parcialmente uma nota | Por receber → Pagamentos → notas → detalhe | Financeiro → Pagamentos → fila de notas → Registar pagamento | Mantém saldo, referência, data e confirmação. |
| Gerir avença/preço fixo | Ficha → Avença / Preço fixo | Cliente → Contratos → tipo | Um grupo, com nomes conhecidos. Não recalcular contratos na migração de navegação. |
| Provisão e estorno | Clientes → Provisões / Ficha → Provisões | Financeiro → Provisões / Cliente → Financeiro | Um componente; livro e recibos mantidos. |
| Analisar por sociedade/responsável | Menu próprio → entidade | Resumo → filtro | Permite combinar as duas dimensões sem trocar de módulo. |
| Notas partilhadas | Notas → Nova nota → partilha | Mesmo percurso | Conservar Consulta/Edição, tarefas, voz e ficheiros. |
| Importação histórica | URL directa, sem botão de menu | Definições → Importações → Analisar | Acesso visível apenas aos perfis autorizados; validação antes de gravar. |

## Sessão de revisão humana a realizar

- Pedir a um operador que faça cada tarefa acima com exemplos fictícios, sem explicar antecipadamente onde clicar.
- Anotar sucesso, percurso, hesitações e tempo. Comparar com o percurso actual; não definir sucesso só pelo número de menus.
- Confirmar nomes, atalhos mais usados e o acesso directo a Novo registo/Nova despesa. Pode ser necessário manter botões directos no cabeçalho.
- Ensaiar documentos PT/EN/FR, versões e impressão no iPhone físico; verificar áreas seguras, teclado, microfone/câmara e PWA.
- Classificar cada função do inventário como destino aceite, ajuste necessário ou lacuna. Nenhuma função fica sem destino.

## Critérios antes da activação operacional

Cobertura completa das funções actuais; atalhos frequentes fáceis de encontrar; campos/validações consistentes; preservação dos filtros e do cliente; regras financeiras e permissões idênticas; falhas claras e recuperáveis; operadores conseguem terminar as tarefas sem ajuda. Não publicar apenas por ter terminado o expediente de sexta-feira.
