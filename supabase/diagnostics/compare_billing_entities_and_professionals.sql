select
  coalesce(b.name, 'Sem sociedade') as sociedade,
  p.display_name as responsavel,
  count(*) as movimentos,
  coalesce(sum(w.duration_minutes), 0) as minutos,
  coalesce(round(sum(w.effective_amount), 2), 0) as valor
from public.work_entries w
join public.professionals p on p.id = w.professional_id
left join public.billing_entities b on b.id = w.billing_entity_id
group by b.name, p.display_name
order by sociedade, movimentos desc, responsavel;
