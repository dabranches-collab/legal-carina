-- A lista de movimentos e a edição completa têm de usar o mesmo universo.
-- O Operador vê todo o escritório através de search_work_entries, mas a função
-- anterior era SECURITY INVOKER e podia não conseguir reler algumas dessas
-- linhas devido à política RLS histórica. A autorização efectiva continua na
-- função private.update_work_entry_full, que valida autenticação e âmbito; o
-- invólucro público continua a exigir o motivo em todas as edições do Operador.
alter function public.update_work_entry_full(uuid,jsonb,text) security definer;

revoke all on function public.update_work_entry_full(uuid,jsonb,text) from public,anon;
grant execute on function public.update_work_entry_full(uuid,jsonb,text) to authenticated;

notify pgrst,'reload schema';
