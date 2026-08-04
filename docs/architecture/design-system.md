# Design system da interface

## Direção visual

A interface combina fundo quente claro, superfícies brancas, azul-noite estrutural, azul-petróleo funcional e âmbar discreto. Verde comunica estados concluídos; vermelho fica reservado a erros, bloqueios e vencimentos. O contraste, o foco visível e a comunicação textual dos estados são obrigatórios.

Os números atualmente renderizados são exclusivamente demonstrativos e anonimizados. A etiqueta persistente no cabeçalho do conteúdo impede que sejam confundidos com dados reais.

## Tokens semânticos

Os tokens estão centralizados em `src/index.css`; componentes não definem hexadecimais nem nomes de cores visuais diretamente.

| Grupo | Tokens |
| --- | --- |
| Superfícies | `background`, `surface`, `surface-subtle` |
| Marca | `primary`, `primary-hover`, `secondary`, `secondary-soft`, `accent`, `accent-soft` |
| Estado | `success`, `warning`, `danger` e variantes `*-soft` |
| Conteúdo | `text-primary`, `text-secondary`, `border`, `border-strong` |
| Gráficos | `chart-1` a `chart-5` |
| Elevação | `shadow-card`, `shadow-raised` |
| Tipografia | `font-sans`, `font-display` |
| Movimento | `transition-fast`, `transition-normal`; respeita `prefers-reduced-motion` |
| Espaçamento | escala Tailwind e `space-page` responsivo |

## Estrutura

- Sidebar recolhível no desktop e painel sobreposto no telemóvel.
- Cabeçalho fixo com pesquisa, período, sociedade, notificações, utilizador e logout.
- Conteúdo desktop-first com grelhas que colapsam progressivamente.
- Tabelas mantêm densidade informativa e usam scroll horizontal em ecrãs estreitos.
- Cards usam raio moderado, borda visível e sombra discreta.

## Componentes e acessibilidade

- `AppShell`: landmarks, estado `aria-current` e botões com nomes acessíveis.
- `Icon`: ícones decorativos sempre ocultos da árvore acessível.
- Gráficos: `figure`, legenda textual e descrição `role="img"`.
- Tabela: caption, scopes, seleção nomeada, cabeçalho fixo, densidade e paginação.
- `TableSkeleton`, `TableEmptyState` e `TableErrorState`: estados operacionais reutilizáveis.
- Modais de override e ação em massa: título, contexto financeiro e confirmação explícita.
- Foco global de alto contraste; nenhuma mensagem depende apenas da cor.

## Limites atuais

Esta fase é visual. Pesquisa, notificações, logout, exportação, vistas guardadas e escrita em massa são controlos preparados, mas não executam operações remotas. Dashboards usam dados demonstrativos até existir autenticação e camada de consulta Supabase aprovada.
