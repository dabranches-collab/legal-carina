# Matriz responsiva de desktop

## Cobertura obrigatória

| Resolução física | Zoom | Área útil CSS testada | Ecrãs abrangidos |
| --- | ---: | ---: | --- |
| 1920×1080 | 100% | 1920×1080 | 14", 24" e 27" |
| 1920×1080 | 125% | 1536×864 | 14", 24" e 27" |
| 1920×1080 | 150% | 1280×720 | 14", 24" e 27" |
| 1920×1240 | 100% | 1920×1240 | 14", 24" e 27" |
| 1920×1240 | 125% | 1536×992 | 14", 24" e 27" |
| 1920×1240 | 150% | 1280×827 | 14", 24" e 27" |

O browser não expõe de forma fiável a diagonal física do monitor ao CSS. Com a mesma resolução e o mesmo zoom, 14, 24 e 27 polegadas produzem a mesma geometria de layout; diferem apenas na densidade/tamanho físico aparente. Por isso cada área útil é ensaiada uma vez e fica explicitamente associada aos três tamanhos.

## Critérios

- os 19 menus principais carregam sem overflow horizontal global;
- o cabeçalho e o conteúdo começam depois da sidebar e não a cobrem;
- o cabeçalho e o conteúdo permanecem dentro da largura visível;
- ferramentas e cabeçalhos fixos das tabelas não saltam no início do scroll;
- 100%, 125% e 150% são exercitados nas duas resoluções;
- os testes de iPhone, áreas seguras, modais e filtros continuam obrigatórios.

Os cenários encontram-se em `e2e/desktop-layout.spec.ts` e `e2e/table-sticky.spec.ts`.
