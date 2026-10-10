-- Adds an expense and splits it equally among ALL members of the group, atomically.
-- Leftover cents (amount % member count) go one each to the earliest-added members,
-- so shares always sum exactly to the amount.
-- SECURITY INVOKER: runs as the caller, so the normal RLS insert policies still apply.
create function public.add_expense_equal(
  p_group_id     uuid,
  p_paid_by      uuid,
  p_amount_cents integer,
  p_description  text
) returns public.expenses
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expense   public.expenses;
  v_count     integer;
begin
  select count(*) into v_count from public.members where group_id = p_group_id;
  if v_count = 0 then
    raise exception 'Group has no members to split between';
  end if;

  insert into public.expenses (group_id, paid_by, amount_cents, description)
  values (p_group_id, p_paid_by, p_amount_cents, trim(p_description))
  returning * into v_expense;

  insert into public.expense_splits (expense_id, member_id, group_id, share_cents)
  select v_expense.id,
         m.id,
         p_group_id,
         p_amount_cents / v_count
           + case when m.rn <= p_amount_cents % v_count then 1 else 0 end
  from (
    select id, row_number() over (order by created_at, id) as rn
    from public.members
    where group_id = p_group_id
  ) m;

  return v_expense;
end;
$$;

revoke execute on function public.add_expense_equal(uuid, uuid, integer, text) from public;
grant execute on function public.add_expense_equal(uuid, uuid, integer, text) to anon, authenticated;
