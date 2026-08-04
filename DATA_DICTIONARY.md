# Dicionário de dados

Não existe ainda schema persistente. Os conceitos abaixo são candidatos e não representam dados reais.

| Entidade proposta | Finalidade | Classificação esperada |
| --- | --- | --- |
| utilizador | Identidade e perfil profissional | pessoal/confidencial |
| cliente | Titular do relacionamento | pessoal ou empresarial/confidencial |
| assunto | Processo ou matéria jurídica | segredo profissional |
| registo_horas | Tempo e descrição de trabalho | segredo profissional |
| fatura | Documento e estado de faturação | financeiro/confidencial |
| recebimento | Liquidação associada a fatura | financeiro/confidencial |

Antes da primeira migration devem ser definidos: campos, tipos, retenção, base legal, ownership, auditoria e políticas RLS.
